export class UploadResponseDto {
  id: string;
  originalFilename: string;
  mimeType: string;
  s3Key: string;
  createdAt: Date;
}
