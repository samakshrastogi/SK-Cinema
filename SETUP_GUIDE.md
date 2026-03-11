git clone <repo-url>

# Complete Project Setup Guide

## Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- **PostgreSQL** (for backend database)
- **ffmpeg** (for video processing, install from https://ffmpeg.org/)
- (Optional) **Ollama** and **OpenAI** accounts for AI features

---

## 1. Clone the Repository
```sh
git clone <repo-url>
cd <repo-folder>
```

---

## 2. Backend Setup

### a. Install dependencies
```sh
cd backend
npm install
```

### b. Required libraries (from package.json)
- express, cors, dotenv, bcrypt, jsonwebtoken, passport, passport-google-oauth20
- bullmq, ioredis, socket.io
- @aws-sdk/client-s3, @aws-sdk/cloudfront-signer, @aws-sdk/s3-request-presigner
- multer, nodemailer, pg, prisma, @prisma/client
- fluent-ffmpeg, sharp
- ollama, openai, axios, zod

### c. Environment variables
- Create `.env` file (copy from `.env.example` if available)
- Set up:
  - `DATABASE_URL` (PostgreSQL connection string)
  - AWS credentials (for S3)
  - Redis connection info
  - Email credentials (for nodemailer)
  - Any OAuth/AI keys

### d. Database setup
- Ensure PostgreSQL is running
- Run Prisma migrations:
  ```sh
  npx prisma migrate deploy
  ```

### e. Build and run
```sh
npm run build
npm run start
```
- For development: `npm run dev`
- For workers: `npm run worker`

---

## 3. Frontend Setup

### a. Install dependencies
```sh
cd ../frontend
npm install
```

### b. Required libraries (from package.json)
- react, react-dom, react-router-dom
- axios, jwt-decode, lucide-react, socket.io-client

### c. Dev tools
- vite, typescript, tailwindcss, autoprefixer, postcss
- eslint, @vitejs/plugin-react, @tailwindcss/vite

### d. Environment variables
- Create `.env` file (copy from `.env.example` if available)
- Set up API endpoints and any keys

### e. Build and run
```sh
npm run dev
```
- For production build: `npm run build`
- For preview: `npm run preview`

---

## 4. Additional Tools & Configs

- **ffmpeg** must be installed and available in PATH for backend video processing.
- **Prisma**: Database schema is in `backend/prisma/schema.prisma`.
- **Vite**: Configured in `frontend/vite.config.ts`.
- **ESLint**: Configured in `frontend/eslint.config.js`.
- **TypeScript**: Configs in `frontend/tsconfig.*.json` and `backend/tsconfig.json`.

---

## 5. Troubleshooting

- Check `.env` files for correct values.
- Ensure PostgreSQL, Redis, and ffmpeg are running.
- For AI features, ensure Ollama and OpenAI credentials are set.
- For any issues, check README files or contact the maintainer.

---
