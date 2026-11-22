# Cloud Storage Implementation Plan - AI vs Real Detection System

## Overview
This document outlines the implementation of Supabase cloud storage for all four detection systems (Photo, Video, Audio, Text) to avoid filling local C: drive with uploaded files, scan history, and reports.

## Current Architecture Analysis

### Storage Locations
| Backend | Upload Dir | Results Dir | Temp Dir | Model Cache |
|---------|-----------|-------------|----------|-------------|
| Audio | `./uploads` | `./results` | - | `./models` |
| Photo | `./uploads` | `./results` | - | `./models` |
| Video | `./uploads` | `./results` | `./temp` | `./models` |
| Text | `tempfile.gettempdir()/text_detection_uploads` | - | - | `./models` |

### What Needs Cloud Storage
1. **Uploaded media files** (images, videos, audio, text files)
2. **Analysis results** (JSON reports, detector outputs)
3. **Scan history/metadata** (database records)
4. **Temporary processing files** (video frames, audio segments - with cleanup)

### What Stays Local
1. **AI model weights** (EfficientNet-B0, RoBERTa, etc.) - ~500MB-2GB
2. **Source code** and dependencies
3. **Configuration files**

## Supabase Integration Design

### Database Schema
```sql
-- Analyses table (unified across all types)
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_type VARCHAR(20) NOT NULL CHECK (analysis_type IN ('photo', 'video', 'audio', 'text')),
    filename VARCHAR(500) NOT NULL,
    original_file_path TEXT,  -- Local temp path for processing
    cloud_storage_path TEXT,   -- Supabase storage path
    file_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    ai_generated_probability FLOAT,
    confidence FLOAT,
    overall_assessment VARCHAR(50),
    detector_results JSONB,
    technical_indicators JSONB,
    summary TEXT,
    processing_time_ms BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Create index for common queries
CREATE INDEX idx_analyses_type_created ON analyses(analysis_type, created_at DESC);
CREATE INDEX idx_analyses_status ON analyses(status);

-- Storage buckets (one per type for organization)
-- buckets: photo-analyses, video-analyses, audio-analyses, text-analyses
```

### Storage Structure
```
Supabase Storage Buckets:
├── photo-analyses/
│   ├── originals/          # Original uploaded images
│   └── reports/            # JSON analysis reports
├── video-analyses/
│   ├── originals/          # Original uploaded videos
│   ├── frames/             # Extracted frame thumbnails
│   └── reports/            # JSON analysis reports
├── audio-analyses/
│   ├── originals/          # Original uploaded audio
│   └── reports/            # JSON analysis reports
├── text-analyses/
│   ├── originals/          # Original uploaded text files
│   └── reports/            # JSON analysis reports
```

## Implementation Plan

### Phase 1: Supabase Client Setup
1. Add `supabase` Python package to all backend requirements.txt
2. Create shared `cloud_storage.py` module with:
   - Supabase client initialization
   - Upload/download functions
   - Signed URL generation
   - Cleanup utilities

### Phase 2: Database Layer
1. Create `database.py` module with:
   - Analysis CRUD operations
   - History queries
   - Stats aggregation

### Phase 3: Backend Integration
For each backend (audio, photo, video, text):
1. Modify upload flow:
   - Save to local temp for processing
   - Upload original to Supabase Storage
   - Save metadata to Supabase Database
   - Clean up local temp after successful upload
2. Modify result storage:
   - Save results to local JSON
   - Upload results to Supabase Storage
   - Update database record
3. Add cloud storage config to settings:
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY (or ANON_KEY for client)
   - STORAGE_BUCKET names

### Phase 4: Frontend Integration
1. Update API service to use cloud URLs
2. Add signed URL support for private files
3. Update results display to fetch from cloud

### Phase 5: Cleanup & Safety
1. Implement local temp file cleanup on success/failure
2. Add retry logic for cloud operations
3. Add health check for Supabase connectivity

## Environment Variables
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Storage Buckets
SUPABASE_BUCKET_PHOTO=photo-analyses
SUPABASE_BUCKET_VIDEO=video-analyses
SUPABASE_BUCKET_AUDIO=audio-analyses
SUPABASE_BUCKET_TEXT=text-analyses

# Local Processing (keep minimal)
LOCAL_TEMP_DIR=./temp
MAX_LOCAL_TEMP_AGE_HOURS=24
```

## Security Considerations
1. **Service Role Key** - Only on backend, never exposed to frontend
2. **Signed URLs** - For private file access with expiration
3. **RLS Policies** - Row Level Security on database tables
3. **Bucket Policies** - Private buckets with signed URL access

## Migration Strategy
1. **Additive only** - Don't remove local storage, add cloud as secondary
2. **Dual write** - Write to both local and cloud during transition
3. **Verify** - Ensure cloud reads work before switching primary
4. **Cleanup** - Remove local files after cloud verification

## Testing Plan
1. Unit tests for cloud storage module
2. Integration tests for each backend
3. End-to-end test: upload → analyze → result → download
4. Failure scenarios: network timeout, quota exceeded, auth failure
5. Cleanup verification: temp files removed after processing