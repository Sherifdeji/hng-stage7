import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(pdf|docx)$/, // Enforce PDF or DOCX type
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB in bytes
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.documentsService.uploadFile(file);
  }

  @Post(':id/analyze')
  async analyze(@Param('id') id: string) {
    return this.documentsService.analyzeDocument(id);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }
}
