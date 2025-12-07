import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import * as Minio from 'minio';
import * as mammoth from 'mammoth';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private minioClient: Minio.Client;
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly docsRepo: Repository<Document>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const minioPort = this.configService.get<number>('MINIO_PORT');
    const minioAccessKey = this.configService.get<string>('MINIO_ROOT_USER');
    const minioSecretKey = this.configService.get<string>(
      'MINIO_ROOT_PASSWORD',
    );

    if (!minioEndpoint || !minioPort || !minioAccessKey || !minioSecretKey) {
      throw new Error(
        'MinIO configuration is incomplete. Please check your environment variables.',
      );
    }

    // Initialize MinIO Client
    this.minioClient = new Minio.Client({
      endPoint: minioEndpoint,
      port: minioPort,
      useSSL: false,
      accessKey: minioAccessKey,
      secretKey: minioSecretKey,
    });
  }

  // 1. Upload & Extract
  async uploadFile(file: Express.Multer.File) {
    const bucketName =
      this.configService.get<string>('MINIO_BUCKET') || 'documents';

    // Ensure bucket exists
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) await this.minioClient.makeBucket(bucketName, 'us-east-1');

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
    const s3Key = `${uuidv4()}-${sanitizedFilename}`;
    await this.minioClient.putObject(bucketName, s3Key, file.buffer);

    let extractedText = '';
    try {
      if (file.mimetype === 'application/pdf') {
        // For PDFs, text extraction is deferred to the AI analysis step
        extractedText = 'Text extraction will be performed by AI.';
      } else if (
        file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const { value } = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = value;
      } else {
        extractedText = 'Text extraction not supported for this file type.';
      }
    } catch (error) {
      this.logger.error(
        `Failed to extract text from ${file.originalname}: ${error.message}`,
      );
      extractedText = 'Error during local text extraction.';
    }

    // Save initial record to DB
    const doc = this.docsRepo.create({
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      s3Key: s3Key,
      extractedText: extractedText,
    });

    return this.docsRepo.save(doc);
  }

  // 2. Analyze with LLM using OpenRouter's Universal PDF Support
  async analyzeDocument(id: string) {
    const doc = await this.docsRepo.findOneBy({ id });
    if (!doc) throw new NotFoundException('Document not found');

    // For non-PDFs, check if there's text to analyze
    if (
      doc.mimeType !== 'application/pdf' &&
      (!doc.extractedText || doc.extractedText.length < 10)
    ) {
      throw new BadRequestException(
        'Document has no text content or content is too short to be analyzed.',
      );
    }

    const bucketName =
      this.configService.get<string>('MINIO_BUCKET') || 'documents';

    try {
      // Fetch the file from MinIO
      const fileStream = await this.minioClient.getObject(
        bucketName,
        doc.s3Key,
      );
      const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        fileStream.on('data', (chunk) => chunks.push(chunk));
        fileStream.on('error', reject);
        fileStream.on('end', () => resolve(Buffer.concat(chunks)));
      });

      // Base64 encode the file buffer
      const base64File = `data:${doc.mimeType};base64,${fileBuffer.toString('base64')}`;

      const promptText = `
      Analyze the attached document and extract its full text content.
      Based on the content, return a single, valid JSON object with the following structure:
      - "extractedText": "The full, raw text content of the document."
      - "summary": "A concise 2-3 sentence summary of the document."
      - "type": "The type of document (e.g., 'Invoice', 'Resume', 'Contract', 'Report')."
      - "attributes": "An object containing key extracted metadata (like dates, names, amounts, etc.)."

      Extract relevant metadata in attributes based on document type.
      `.trim();

      const response$ = this.httpService.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                {
                  type: 'file',
                  file: {
                    filename: doc.originalFilename,
                    file_data: base64File,
                  },
                },
              ],
            },
          ],
          // Add PDF processing engine configuration
          plugins: [
            {
              id: 'file-parser',
              pdf: {
                engine: 'pdf-text', // Using pdf-text engine
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('OPENROUTER_API_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await firstValueFrom(response$);
      const content = response.data.choices[0].message.content;

      try {
        const cleanContent = content.replace(/```json\n?|```/g, '').trim();
        const result = JSON.parse(cleanContent);

        // Update the document with all the new info from the AI
        doc.extractedText = result.extractedText;
        doc.summary = result.summary;
        doc.documentType = result.type;
        doc.metadata = result.attributes;

        this.logger.log(
          `Successfully analyzed document ${id}. Type: ${doc.documentType}`,
        );

        return this.docsRepo.save(doc);
      } catch (parseError) {
        this.logger.error(`Failed to parse AI response: ${parseError.message}`);
        throw new InternalServerErrorException('Failed to parse AI response.');
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      this.logger.error(
        `Failed to analyze document ${id}: ${errorMessage}`,
        error.stack,
      );

      if (error.response?.status === 402) {
        throw new InternalServerErrorException(
          'OpenRouter API credit limit reached. Please check your account.',
        );
      }

      throw new InternalServerErrorException(
        `Failed to analyze document: ${errorMessage}`,
      );
    }
  }

  // 3. Get Document
  async findOne(id: string) {
    const doc = await this.docsRepo.findOneBy({ id });
    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
    return doc;
  }
}
