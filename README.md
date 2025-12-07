# Documind - AI-Powered Document Management API

A robust NestJS backend service for intelligent document processing, featuring automated text extraction and AI-powered document analysis.

## 🚀 Features

- **Document Upload**: Support for PDF and DOCX files (max 5MB)
- **Object Storage**: MinIO integration for secure file storage
- **AI Text Extraction**: Automated text extraction from PDFs using OpenRouter's pdf-text engine
- **Intelligent Analysis**: AI-powered document classification and metadata extraction
- **Document Type Detection**: Automatic identification (Invoice, Resume, Contract, Report, etc.)
- **Metadata Extraction**: Context-aware extraction of relevant document attributes
- **RESTful API**: Clean, intuitive endpoints for document operations

## 🛠️ Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Object Storage**: MinIO
- **AI Provider**: OpenRouter API (Google Gemini Flash 2.5 flash)
- **Language**: TypeScript
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenRouter API Key ([Get one here](https://openrouter.ai/keys))

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd documind-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_NAME=documind

# MinIO Configuration
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minio_user
MINIO_ROOT_PASSWORD=minio_password
MINIO_BUCKET=documents

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 4. Start the application

```bash
# Using Docker (Recommended)
docker-compose up --build

# The API will be available at http://localhost:3000
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000
```

### Endpoints

#### 1. Upload Document

**POST** `/documents/upload`

Upload a PDF or DOCX file for processing.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file`: PDF or DOCX file (max 5MB)

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalFilename": "sample.pdf",
  "mimeType": "application/pdf",
  "s3Key": "uuid-sample.pdf",
  "createdAt": "2025-12-07T01:20:46.637Z"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/documents/upload \
  -F "file=@/path/to/document.pdf"
```

---

#### 2. Analyze Document

**POST** `/documents/:id/analyze`

Trigger AI analysis to extract text, generate summary, and identify document type.

**Request:**

- Method: `POST`
- URL Parameter: `id` (document UUID)

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalFilename": "sample.pdf",
  "mimeType": "application/pdf",
  "s3Key": "uuid-sample.pdf",
  "extractedText": "Complete text content from the document...",
  "summary": "A concise summary of the document's main points.",
  "documentType": "Resume",
  "metadata": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": "JavaScript, Python, Docker"
  },
  "createdAt": "2025-12-07T01:20:46.637Z",
  "updatedAt": "2025-12-07T01:21:15.123Z"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/documents/550e8400-e29b-41d4-a716-446655440000/analyze
```

---

#### 3. Get Document

**GET** `/documents/:id`

Retrieve document details including analysis results.

**Request:**

- Method: `GET`
- URL Parameter: `id` (document UUID)

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalFilename": "sample.pdf",
  "mimeType": "application/pdf",
  "s3Key": "uuid-sample.pdf",
  "extractedText": "...",
  "summary": "...",
  "documentType": "Resume",
  "metadata": {...},
  "createdAt": "2025-12-07T01:20:46.637Z",
  "updatedAt": "2025-12-07T01:21:15.123Z"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/documents/550e8400-e29b-41d4-a716-446655440000
```

## 🧪 Testing with Postman

### Quick Start Collection

1. **Import Environment**:

   - Variable: `base_url`
   - Value: `http://localhost:3000`

2. **Upload Document**:

   - URL: `{{base_url}}/documents/upload`
   - Method: POST
   - Body: form-data, key=`file`, type=File

3. **Analyze Document**:

   - URL: `{{base_url}}/documents/{id}/analyze`
   - Method: POST

4. **Get Document**:
   - URL: `{{base_url}}/documents/{id}`
   - Method: GET

### Sample Test File

Download a test PDF:

```bash
curl -o sample.pdf https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

## 🏗️ Project Structure

```
documind-backend/
├── src/
│   ├── documents/
│   │   ├── document.entity.ts       # Document database model
│   │   ├── documents.controller.ts  # API endpoints
│   │   ├── documents.service.ts     # Business logic
│   │   └── documents.module.ts      # Module configuration
│   ├── dto/
│   │   └── upload-response.dto.ts   # Response data transfer object
│   ├── app.module.ts                # Root module
│   └── main.ts                      # Application entry point
├── docker-compose.yml               # Multi-container orchestration
├── Dockerfile                       # Production Docker image
├── .env                            # Environment configuration
└── package.json                    # Dependencies
```

## 🔐 Environment Variables

| Variable              | Description           | Default          |
| --------------------- | --------------------- | ---------------- |
| `DATABASE_HOST`       | PostgreSQL host       | `postgres`       |
| `DATABASE_PORT`       | PostgreSQL port       | `5432`           |
| `DATABASE_USER`       | Database username     | `user`           |
| `DATABASE_PASSWORD`   | Database password     | `password`       |
| `DATABASE_NAME`       | Database name         | `documind`       |
| `MINIO_ENDPOINT`      | MinIO server endpoint | `minio`          |
| `MINIO_PORT`          | MinIO server port     | `9000`           |
| `MINIO_ROOT_USER`     | MinIO access key      | `minio_user`     |
| `MINIO_ROOT_PASSWORD` | MinIO secret key      | `minio_password` |
| `MINIO_BUCKET`        | Storage bucket name   | `documents`      |
| `OPENROUTER_API_KEY`  | OpenRouter API key    | Required         |

## 🐳 Docker Services

The application runs three containerized services:

- **API**: NestJS application (port 3000)
- **PostgreSQL**: Document metadata database (port 5432)
- **MinIO**: Object storage server (ports 9000, 9001)

### MinIO Console

Access the MinIO web interface:

- URL: `http://localhost:9001`
- Username: `minio_user`
- Password: `minio_password`

## 🔄 Document Processing Flow

1. **Upload**: Client sends file → Stored in MinIO → Metadata saved to PostgreSQL
2. **Analyze**: Fetch file from MinIO → Base64 encode → Send to OpenRouter API
3. **Extract**: AI processes PDF with `pdf-text` engine → Extracts full text
4. **Classify**: AI identifies document type and generates summary
5. **Store**: Results saved to database → Available via GET endpoint

## 📊 Supported Document Types

The AI automatically detects:

- 📄 **Invoices**: Extracts invoice number, date, amount, vendor
- 📝 **Resumes/CVs**: Identifies name, contact, skills, experience
- 📋 **Reports**: Detects title, author, date, department
- 📜 **Contracts**: Finds parties, dates, terms
- 🎓 **Academic Papers**: Extracts course code, lecturer, topic
- 📑 **Legal Documents**: Identifies case numbers, parties, dates

## 🚨 Error Handling

| Status Code | Description                              |
| ----------- | ---------------------------------------- |
| `201`       | Document uploaded successfully           |
| `200`       | Analysis/retrieval successful            |
| `400`       | Invalid request or unsupported file type |
| `404`       | Document not found                       |
| `422`       | File validation failed (size/type)       |
| `429`       | OpenRouter API rate limit exceeded       |
| `500`       | Server error or AI processing failure    |

## 🛡️ File Validation

- **Allowed Types**: PDF (`.pdf`), DOCX (`.docx`)
- **Max Size**: 5MB
- **MIME Types**: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## 🔧 Development

### Local Development (without Docker)

```bash
# Start PostgreSQL and MinIO
docker-compose -f docker-compose.dev.yml up

# Update .env with localhost values
DATABASE_HOST=localhost
MINIO_ENDPOINT=localhost

# Run in development mode
npm run start:dev
```

## 📝 License

This project is licensed under the MIT License.

## 🔗 Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [OpenRouter API](https://openrouter.ai/docs)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [TypeORM Documentation](https://typeorm.io/)

## 👨‍💻 Author

**Sherif Ibrahim**

---

## Acknowledgments

- Built as part of Stage 7 assessment for [HNG Internship](https://hng.tech)
