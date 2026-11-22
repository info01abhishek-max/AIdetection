
# AI vs Real — AI Content Detection System

A multi-modal AI detection platform designed to analyze audio, video, images, and text to identify whether content may be AI-generated or authentic.

The project combines four independent detection systems into a unified platform with dedicated detection engines, backend APIs, and web interfaces.

---

## Overview

AI vs Real is an AI-powered content authenticity analysis project that supports four content types:

- Audio Detection
- Video Detection
- Image / Photo Detection
- Text Detection

Each detection system has its own backend, models, detection logic, and frontend interface. The project also includes a Unified Frontend that provides a central dashboard for accessing the detection systems.

The goal of the project is to make AI-generated content analysis accessible through a single platform.

---

## Key Features

### Multi-Modal AI Detection

Analyze multiple forms of digital content through independent detection modules.

| Module | Input | Backend Port | Detectors |
|---|---|---:|---:|
| Audio Detection | Audio files | 8000 | 5 |
| Video Detection | Video files | 8001 | 5 |
| Photo Detection | Image files | 8002 | 6 |
| Text Detection | Text content | 8003 | 1 |

### Audio Detection

- Audio file upload and analysis
- Multiple detection components
- Backend-based processing
- Detection result generation
- Dedicated frontend interface

### Video Detection

- Video upload and processing
- Video authenticity analysis
- Multiple detection components
- API routing with `/api/v1` prefix
- Dedicated frontend interface

### Photo / Image Detection

- Image upload and analysis
- Six detection components
- Image authenticity assessment
- API-based processing
- Tested end-to-end image analysis workflow

### Text Detection

- Text analysis
- RoBERTa-based detection model
- AI-generated text assessment
- Dedicated backend and frontend
- Model loading during backend initialization or first use, depending on configuration

### Unified Dashboard

- Central interface for accessing all four detection systems
- Unified navigation
- Centralized frontend experience
- Integration with independent detection backends

---

## Project Architecture

The project uses a modular architecture in which each detection system operates independently.

```text
AI vs Real
│
├── Unified Frontend
│
├── Audio Detection
│   ├── Frontend
│   └── Backend
│
├── Video Detection
│   ├── Frontend
│   └── Backend
│
├── Photo Detection
│   ├── Frontend
│   └── Backend
│
└── Text Detection
    ├── Frontend
    └── Backend
```

### Architecture Design

- Each detection module has its own backend.
- Backends communicate through HTTP APIs.
- Frontends communicate with backends using configured proxy routes.
- The Unified Frontend provides centralized access.
- Detection systems can be started independently.
- Running only the modules required for a particular analysis helps reduce memory usage.

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- JavaScript / TypeScript
- HTML
- CSS

### Backend

- Python
- FastAPI
- Uvicorn
- REST APIs

### AI / Machine Learning

- Machine Learning models
- Deep Learning-based detection components
- RoBERTa for text detection
- Independent detector pipelines for different media types

### Infrastructure

- Git
- GitHub
- Local development environment
- Optional cloud storage integration through Supabase

> Exact library and model versions depend on the requirements files and configurations present in each module.

---

## Project Directory Structure

```text
aivsreal/
│
├── backend/                         # Audio Detection Backend
│   ├── app/
│   ├── models/
│   └── ...
│
├── backend-video/                    # Video Detection Backend
│   ├── app/
│   ├── models/
│   └── ...
│
├── backend-photo/                    # Photo Detection Backend
│   ├── app/
│   ├── models/
│   └── ...
│
├── text-detection/
│   ├── backend/                      # Text Detection Backend
│   │   ├── app/
│   │   └── models/
│   │
│   └── frontend/                      # Text Detection Frontend
│
├── frontend-audio/                    # Audio Frontend
│
├── frontend-video/                    # Video Frontend
│
├── frontend-photo/                     # Photo Frontend
│
├── unified-frontend/                  # Unified Dashboard
│
├── START_PROJECT.bat                  # Start project services
├── STOP_PROJECT.bat                   # Stop project services
├── RUN_PROJECT.md                      # Run and setup documentation
├── README.md                            # Project documentation
└── ...
```

> The directory structure above is a high-level representation. Actual directories and files may vary depending on the current repository version.

---

# Port Configuration

## Backend Services

| Service | Port | Local URL |
|---|---:|---|
| Audio Backend | 8000 | http://localhost:8000 |
| Video Backend | 8001 | http://localhost:8001 |
| Photo Backend | 8002 | http://localhost:8002 |
| Text Backend | 8003 | http://localhost:8003 |

## Frontend Services

| Frontend | Port | Local URL |
|---|---:|---|
| Unified Frontend | 5173 | http://localhost:5173 |
| Video Frontend | 5173 | http://localhost:5173 |
| Photo Frontend | 5174 | http://localhost:5174 |
| Audio Frontend | 5175 | http://localhost:5175 |
| Text Frontend | 5176 | http://localhost:5176 |

### Important Port Note

The Video Frontend and Unified Frontend are currently configured to use port `5173`.

They cannot run simultaneously on the same port.

If both interfaces are required simultaneously, one of them must be assigned a different port and its configuration must be updated accordingly.

The Unified Frontend is the recommended entry point for the integrated platform.

---

# Backend API Configuration

| Backend | Frontend Proxy Target |
|---|---|
| Audio | `http://localhost:8000` |
| Video | `http://localhost:8001` |
| Photo | `http://localhost:8002` |
| Text | `http://localhost:8003` |

### Proxy Configuration

Frontend applications use Vite proxy configurations to forward API requests to their respective backends.

The Text Detection Frontend communicates with the Text Detection Backend on port `8003`.

The Video Detection Backend uses the API prefix:

```text
/api/v1
```

The Video Frontend proxy includes the required path handling to support the backend API routing.

---

# System Requirements

## Minimum Development Environment

| Requirement | Specification |
|---|---|
| Operating System | Windows 10 / Windows 11 |
| RAM | 8 GB minimum for basic development |
| Processor | Multi-core CPU |
| Storage | SSD recommended |
| Python | Compatible version required by backend dependencies |
| Node.js | Compatible version required by frontend dependencies |
| npm | Installed with Node.js |
| Internet | Required for initial dependency and model downloads |

### Recommended Environment

- 16 GB RAM or higher for smoother multi-service operation
- SSD storage
- Modern multi-core processor
- Dedicated GPU if supported by the models and configurations

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/info01abhishek-max/AIdetection.git
```

Navigate to the project directory:

```bash
cd AIdetection
```

## 2. Install Backend Dependencies

Install dependencies separately for each backend according to its requirements file.

### Audio Backend

```powershell
cd backend
pip install -r requirements.txt
```

### Video Backend

```powershell
cd backend-video
pip install -r requirements.txt
```

### Photo Backend

```powershell
cd backend-photo
pip install -r requirements.txt
```

### Text Backend

```powershell
cd text-detection/backend
pip install -r requirements.txt
```

> If a backend uses a virtual environment or a different requirements file, follow that backend's configuration.

## 3. Install Frontend Dependencies

Install dependencies inside each frontend directory.

### Unified Frontend

```powershell
cd unified-frontend
npm install
```

### Audio Frontend

```powershell
cd frontend-audio
npm install
```

### Video Frontend

```powershell
cd frontend-video
npm install
```

### Photo Frontend

```powershell
cd frontend-photo
npm install
```

### Text Frontend

```powershell
cd text-detection/frontend
npm install
```

---

# Running the Project

## Option 1 — Start the Unified Platform

The project includes a startup script:

```text
START_PROJECT.bat
```

From the project root directory, run:

```powershell
.\START_PROJECT.bat
```

The startup script is designed to start the required services and Unified Frontend.

Depending on the system's available memory and the configured startup behavior, all detection backends may consume considerable resources.

---

## Option 2 — Manual Backend Startup

If you want to run the services manually, open separate terminals in VS Code.

### Terminal 1 — Audio Backend

```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Terminal 2 — Video Backend

```powershell
cd backend-video
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Terminal 3 — Photo Backend

```powershell
cd backend-photo
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002
```

### Terminal 4 — Text Backend

```powershell
cd text-detection/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003
```

### Terminal 5 — Unified Frontend

```powershell
cd unified-frontend
npm run dev
```

---

# Access the Application

## Unified Dashboard

```text
http://localhost:5173
```

## Individual Frontends

| Application | URL |
|---|---|
| Unified Dashboard | http://localhost:5173 |
| Video Detection | http://localhost:5173 |
| Photo Detection | http://localhost:5174 |
| Audio Detection | http://localhost:5175 |
| Text Detection | http://localhost:5176 |

> Video and Unified Frontend share port 5173 in the current configuration. Only one service can use that port at a time.

---

# Backend Health Checks

The backends should be started before testing their frontend detection functionality.

Use the backend's configured health endpoint to verify that the service is responding.

Typical local service addresses:

```text
Audio Backend: http://localhost:8000
Video Backend: http://localhost:8001
Photo Backend: http://localhost:8002
Text Backend:  http://localhost:8003
```

If the project exposes a `/health` endpoint, test:

```text
http://localhost:8000/health
http://localhost:8001/health
http://localhost:8002/health
http://localhost:8003/health
```

Health endpoint paths may differ between services, so use the route defined in each backend if `/health` is not available.

FastAPI documentation may also be available at:

```text
http://localhost:8000/docs
http://localhost:8001/docs
http://localhost:8002/docs
http://localhost:8003/docs
```

---

# Detection Components

## Audio Detection

Audio Detection consists of five configured detector components.

The backend is responsible for receiving the audio input, executing the configured analysis pipeline, and returning detection information.

Backend:

```text
Port: 8000
```

## Video Detection

Video Detection consists of five configured detector components.

The system uses a dedicated backend for video processing and an API route that includes the `/api/v1` prefix.

Backend:

```text
Port: 8001
```

## Photo Detection

Photo Detection consists of six configured detector components.

The image analysis pipeline accepts image input and returns analysis results through the backend API.

Backend:

```text
Port: 8002
```

The Photo Detection upload, status, and result workflow has been tested end-to-end.

## Text Detection

Text Detection currently uses one configured detector based on the RoBERTa model.

Backend:

```text
Port: 8003
```

The model may require a substantial download during its initial setup.

---

# Cloud Storage

## Supabase Integration

The project includes configuration for cloud storage integration through Supabase.

Current status:

- Supabase cloud storage is not currently enabled.
- Real Supabase credentials and configuration are required.
- The application currently uses its local fallback storage behavior.

To enable cloud storage, configure the required environment variables using the project's existing configuration.

Example configuration:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_key
```

> Do not commit secret keys, access tokens, passwords, or private credentials to GitHub. Use environment variables and local `.env` files.

---

# Hardware and Performance

## CPU Mode

The current configuration uses CPU-based inference.

GPU acceleration is disabled in the current configuration:

```env
USE_GPU=false
```

The exact setting may differ between detection modules depending on their configuration files.

## Memory Usage

Running all detection backends and frontends simultaneously requires significant RAM.

On a system with 8 GB RAM, running the entire platform may cause:

- High memory utilization
- Slow application response
- Model loading delays
- Browser slowdown
- Increased disk activity
- Application instability

### Recommended Usage on 8 GB RAM

Start the Unified Frontend and only the backend required for the current task whenever possible.

For example:

| Task | Recommended Services |
|---|---|
| Photo Analysis | Unified Frontend + Photo Backend |
| Audio Analysis | Unified Frontend + Audio Backend |
| Video Analysis | Unified Frontend + Video Backend |
| Text Analysis | Unified Frontend + Text Backend |

If the Unified Frontend requires multiple backends to initialize simultaneously, additional configuration may be necessary to make backend startup fully on-demand.

---

# AI Model Downloads

Some models may be downloaded automatically when the relevant backend initializes.

## Text Detection

The Text Detection system uses a RoBERTa model.

The initial model download may require approximately 500 MB of network data, depending on the configured model and cache state.

Initial setup may therefore take longer than subsequent launches.

Model files and caches may occupy additional disk space.

---

# Startup and Shutdown Scripts

## Start Project

```text
START_PROJECT.bat
```

Purpose:

- Launch configured backend services
- Start the Unified Frontend
- Simplify project startup

## Stop Project

```text
STOP_PROJECT.bat
```

Purpose:

- Stop project services
- Terminate configured service processes
- Check the configured backend ports

The startup and shutdown scripts have been updated to correct their internal helper function names and backend port references.

---

# Troubleshooting

## 1. Backend Is Not Starting

Check:

- Python installation
- Python version compatibility
- Backend dependencies
- Current working directory
- Port availability
- Configuration files
- Missing model files

Run the backend from its own directory.

Example:

```powershell
cd backend
python -m uvicorn app.main:app --port 8000
```

## 2. Frontend Cannot Connect to Backend

Check:

- Whether the backend is running
- Whether the correct backend port is configured
- Vite proxy configuration
- API route prefixes
- Browser console errors
- Backend terminal logs

## 3. Port Already in Use

If a port is already occupied, another process may be using it.

Check the process:

```powershell
netstat -ano | findstr :8000
```

Replace `8000` with the port you want to check.

## 4. Text Detection Does Not Work

Check:

- Text backend is running on port `8003`
- Text frontend proxy target is configured correctly
- RoBERTa model has downloaded successfully
- Required Python dependencies are installed
- Backend logs show the detector loaded successfully

## 5. Video Detection API Errors

Check:

- Video Backend is running on port `8001`
- Frontend proxy configuration
- `/api/v1` route handling
- API request paths
- Backend response logs

## 6. High RAM Usage

If memory usage becomes high:

- Stop unused backends
- Avoid running all models simultaneously
- Close unnecessary applications
- Allow models to finish loading before uploading files
- Restart services if they become unresponsive

## 7. Model Download Problems

Check:

- Internet connection
- Available disk space
- Model cache directory
- Python package compatibility
- Model download permissions

---

# Development and Testing Status

The following items were verified during the latest project configuration audit.

| Component | Status |
|---|---|
| Audio Backend | Healthy |
| Video Backend | Healthy |
| Photo Backend | Healthy |
| Text Backend | Healthy |
| Audio Detector Loading | 5/5 |
| Video Detector Loading | 5/5 |
| Photo Detector Loading | 6/6 |
| Text Detector Loading | 1/1 |
| Photo Analysis Workflow | Tested end-to-end |
| Frontend Proxy Configurations | Reviewed and corrected |
| Video API Prefix Handling | Corrected |
| Text Frontend Backend Target | Corrected |
| Startup Script | Corrected |
| Shutdown Script | Corrected |
| Port Documentation | Updated |

### Verification Scope

The above results represent the latest development audit and local testing.

They do not imply that every detection model has been independently validated against a large benchmark, or that AI-generated content detection is 100% accurate.

---

# Limitations

AI-generated content detection is an evolving field.

The system's predictions should not be considered definitive proof of authenticity or manipulation.

Possible limitations include:

- False positives
- False negatives
- Unseen AI generation techniques
- Compression and quality loss
- Unsupported file formats
- Model-specific limitations
- Processing time
- Hardware limitations
- Differences between datasets and real-world content

Detection results should be interpreted carefully, especially in situations involving identity, reputation, academic integrity, legal matters, or other high-impact decisions.

---

# Security

Security considerations for this project include:

- Do not expose backend ports publicly without proper security controls.
- Do not commit environment secrets.
- Validate uploaded files.
- Apply appropriate upload-size limits.
- Use secure storage for sensitive content.
- Avoid logging sensitive user-uploaded data.
- Configure production CORS settings carefully.
- Use authentication and authorization when deploying publicly.
- Implement rate limiting and abuse protection where necessary.

The current project is primarily configured for local development and testing.

---

# Future Improvements

Potential improvements for future development include:

- GPU acceleration
- Better memory management
- On-demand backend startup
- Optimized model loading
- Improved unified API architecture
- Cloud storage integration
- Authentication and user management
- Deployment-ready configuration
- Docker support
- Production monitoring
- Expanded detection model support
- Improved confidence reporting
- Benchmarking against trusted datasets
- Automated testing
- CI/CD integration

---

# Running on a Low-Memory System

For systems with limited memory, it is recommended to run the project in a modular way.

```text
1. Start the required backend
2. Start the Unified Frontend
3. Open the dashboard
4. Perform the required analysis
5. Stop unused services
6. Repeat for another detection module
```

This reduces unnecessary model loading and resource consumption.

---

# License

License information should be added according to the license selected for this repository.

If the project uses third-party models, libraries, or datasets, their original licenses and usage restrictions must also be respected.

---

# Author

**Abhishek Kumar**

B.Tech Computer Science Engineering  
Cyber Security

---

# Project

**AI vs Real — Multi-Modal AI Content Detection Platform**

Audio | Video | Photo | Text
