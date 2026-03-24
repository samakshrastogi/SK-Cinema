# Project Overview: sk-cinema

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Backend](#backend)
    - [Overview](#backend-overview)
    - [Key Folders & Files](#backend-key-folders--files)
    - [Prisma ORM & Database](#prisma-orm--database)
    - [Modules](#backend-modules)
    - [Services](#backend-services)
    - [Jobs, Queues, and Workers](#jobs-queues-and-workers)
    - [Middlewares](#backend-middlewares)
    - [Utils](#backend-utils)
    - [Routes](#backend-routes)
    - [Configuration](#backend-configuration)
4. [Frontend](#frontend)
    - [Overview](#frontend-overview)
    - [Key Folders & Files](#frontend-key-folders--files)
    - [Pages](#frontend-pages)
    - [Components](#frontend-components)
    - [Context & Layouts](#frontend-context--layouts)
    - [API Layer](#frontend-api-layer)
    - [Assets & Styles](#frontend-assets--styles)
    - [Routing](#frontend-routing)
5. [Development & Build Tools](#development--build-tools)
6. [Deployment](#deployment)
7. [Environment & Configuration](#environment--configuration)
8. [Summary](#summary)

---

## 1. Introduction

**sk-cinema** is a full-stack web application for managing, streaming, and interacting with video content. It features a robust backend built with Node.js, TypeScript, and Prisma ORM, and a modern frontend using React, Vite, and TypeScript. The project is organized for scalability, maintainability, and cloud deployment.

---

## 2. Project Structure

```
SETUP_GUIDE.md
backend/
frontend/
```
- **SETUP_GUIDE.md**: Instructions for setting up and running the project.
- **backend/**: All server-side code, database schema, and business logic.
- **frontend/**: All client-side code, UI components, and static assets.

---

## 3. Backend

### Backend Overview
- **Language**: TypeScript (Node.js)
- **Frameworks**: Express.js (implied by structure), Prisma ORM
- **Database**: Managed via Prisma (likely PostgreSQL or MySQL)
- **Features**: Authentication, video management, AI metadata, S3 integration, job queues, and more.

### Backend Key Folders & Files
- **package.json**: Backend dependencies and scripts.
- **tsconfig.json**: TypeScript configuration.
- **src/**: Main source code.
- **prisma/**: Database schema and migrations.

### Prisma ORM & Database
- **prisma/schema.prisma**: Defines all database models (User, Video, Channel, etc.), relations, and fields.
- **prisma/migrations/**: Timestamped folders with SQL migration scripts for schema evolution.
    - Each migration folder (e.g., `20260314042924_video_actions/`) contains a `migration.sql` file with DDL statements.

### Backend Modules
Located in `src/modules/`:
- **ai/**: Handles AI-related features (e.g., video metadata extraction, suggestions).
- **auth/**: User authentication (login, registration, OAuth, password reset, Google auth fields, etc.).
- **channel/**: Channel management (creation, update, structure, S3 video support).
- **user/**: User profile, avatar, and name index management.
- **video/**: Video upload, processing, metadata, actions, and relations.

### Backend Services
Located in `src/services/`:
- **ffmpeg.service.ts**: Video/audio processing using FFmpeg.
- **optimizer.service.ts**: Video optimization (compression, format conversion).
- **s3.service.ts**: S3 bucket integration for video and thumbnail storage (multi-bucket, endpoint support).
- **selector.service.ts**: Logic for selecting resources (e.g., best video quality, storage bucket).
- **thumbnail.service.ts**: Thumbnail generation and management.
- **video-processing.service.ts**: Orchestrates video processing pipeline (transcoding, AI, etc.).

### Jobs, Queues, and Workers
- **src/jobs/**: Job definitions (e.g., `thumbnail.job.ts`).
- **src/queues/**: Queue management for background tasks (e.g., `thumbnail.queue.ts`, `video-ai.queue.ts`).
- **src/workers/**: Worker processes for handling queued jobs (e.g., `thumbnail.worker.ts`, `video-ai.worker.ts`, `index.ts`).

### Backend Middlewares
- **src/middlewares/auth.middleware.ts**: Handles authentication and authorization for protected routes.

### Backend Utils
- **src/utils/**: Utility functions for cryptography, audio extraction, and thumbnail generation.
    - `crypto.ts`: Hashing, encryption, token generation.
    - `extract-audio.ts`: Extracts audio from video files.
    - `thumbnail.ts`: Thumbnail image processing.

### Backend Routes
- **src/routes/test.routes.ts**: Example or test routes for API endpoints.

### Backend Configuration
- **src/config/**: Configuration files for database, environment variables, Redis, and S3.
    - `db.ts`: Database connection setup.
    - `env.ts`: Loads and validates environment variables.
    - `prisma.ts`: Prisma client configuration.
    - `redis.ts`: Redis client setup for caching/queues.
    - `s3.ts`: S3 client configuration.

---

## 4. Frontend

### Frontend Overview
- **Language**: TypeScript
- **Frameworks**: React, Vite
- **Features**: Modern UI, authentication, video streaming, AI suggestions, playlists, profile management, S3 import, and more.

### Frontend Key Folders & Files
- **package.json**: Frontend dependencies and scripts.
- **vite.config.ts**: Vite build configuration.
- **tsconfig.json**: TypeScript configuration.
- **public/**: Static assets (images, icons, etc.).
- **src/**: Main source code.

### Frontend Pages
Located in `src/pages/`:
- **Auth.tsx**: Login, registration, and authentication flows.
- **FavouritesPage.tsx**: User's favorite videos.
- **Home.tsx**: Main landing page with featured and recent videos.
- **OAuthSuccess.tsx**: Handles OAuth callback and success state.
- **PlaylistPage.tsx**: Playlist management and viewing.
- **ProfilePage.tsx**: User profile, avatar, and settings.
- **ResetPassword.tsx**: Password reset flow.
- **S3Import.tsx**: Import videos from S3 buckets.
- **Upload.tsx**: Video upload interface.
- **VideoPlayer.tsx**: Video playback and controls.

### Frontend Components
Located in `src/components/`:
- **AISuggestions.tsx**: Displays AI-generated video suggestions.
- **HeroBanner.tsx, HeroCard.tsx**: Featured content banners and cards.
- **Navbar.tsx, Sidebar.tsx, Topbar.tsx**: Navigation and layout components.
- **SkeletonCard.tsx**: Loading skeletons for UI consistency.
- **VideoCard.tsx, VideoRow.tsx**: Video listing and display components.

### Frontend Context & Layouts
- **src/context/**: React context providers for authentication and layout state.
    - `AuthContext.tsx`: Manages user authentication state and actions.
    - `LayoutContext.tsx`: Manages UI layout state (sidebar, theme, etc.).
- **src/layouts/**: Layout wrappers for different app sections.
    - `AppLayout.tsx`: Main app layout.
    - `MainLayout.tsx`: Layout for main content areas.

### Frontend API Layer
- **src/api/**: API client and endpoint wrappers.
    - `auth.api.ts`: Authentication API calls.
    - `axios.ts`: Axios instance with interceptors and base config.

### Frontend Assets & Styles
- **src/assets/**: Images, icons, and other static assets.
- **App.css, index.css**: Global and base styles.

### Frontend Routing
- **src/routes/ProtectedRoute.tsx**: Route protection for authenticated pages.

---

## 5. Development & Build Tools
- **TypeScript**: Strong typing for both backend and frontend.
- **Vite**: Fast frontend build tool.
- **Prisma**: Type-safe ORM for database management.
- **ESLint**: Linting for code quality.
- **Vercel**: Deployment configuration for frontend.

---

## 6. Deployment
- **Frontend**: Configured for deployment on Vercel (`vercel.json`).
- **Backend**: Can be deployed on any Node.js-compatible server; uses environment variables for configuration.
- **Database**: Managed via Prisma migrations; supports cloud databases.

---

## 7. Environment & Configuration
- **Environment Variables**: Managed in `src/config/env.ts` (backend) and Vite config (frontend).
- **Secrets**: S3 credentials, database URLs, and other sensitive data are loaded from environment variables.
- **Redis**: Used for caching and job queues.

---

## 8. Summary

**sk-cinema** is a scalable, modular video platform with:
- Secure authentication (including OAuth, Google, password reset)
- Video upload, processing, and streaming (with S3 and FFmpeg)
- AI-powered video metadata and suggestions
- User profiles, playlists, favorites, and channel management
- Modern, responsive frontend with protected routes and context-driven state
- Robust background job processing and queueing
- Cloud-ready deployment and configuration

For more details, see the code in each section or refer to the `SETUP_GUIDE.md` for setup instructions.