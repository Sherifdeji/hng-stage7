import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import * as Minio from 'minio';
import axios from 'axios';
import * as mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

@Injectable()
export class DocumentsService {
  private minioClient: Minio.Client;

  constructor(
    @InjectRepository(Document)
    private docsRepo: Repository<Document>,
    private configService: ConfigService,
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

    // Upload to MinIO
    const s3Key = `${Date.now()}-${file.originalname}`;
    await this.minioClient.putObject(bucketName, s3Key, file.buffer);

    // Basic Text Extraction (PDF)
    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(file.buffer);
      extractedText = pdfData.text;
    } else if (
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const data = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = data.value;
    } else {
      extractedText = 'Text extraction pending or not supported for this type.';
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

  // 2. Analyze with LLM
  async analyzeDocument(id: string) {
    const doc = await this.docsRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    if (!doc.extractedText || doc.extractedText.length < 10) {
      throw new Error('No text content to analyze');
    }

    // Call OpenRouter
    const prompt = `
      Analyze the following document text:
      "${doc.extractedText.substring(0, 10000)}..." 
      
      Return a JSON object with:
      - summary: A concise summary.
      - type: Document type (Invoice, CV, etc).
      - attributes: Key extracted metadata (dates, names, amounts).
    `;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.5-flash-001',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('OPENROUTER_API_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = response.data.choices[0].message.content;
      const cleanContent = content.replace(/```json\n?|```/g, '').trim();
      const result = JSON.parse(cleanContent);

      // Update DB
      doc.summary = result.summary;
      doc.documentType = result.type;
      doc.metadata = result.attributes;

      return this.docsRepo.save(doc);
    } catch (error) {
      console.error('LLM Error', error);
      throw new Error('Failed to analyze document with AI');
    }
  }

  // 3. Get Document
  async findOne(id: string) {
    return this.docsRepo.findOne({ where: { id } });
  }
}
