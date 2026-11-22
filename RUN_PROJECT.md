# AI vs Real Detection System - Windows Run Guide

This guide provides exact commands to run all 4 detection systems (Photo, Video, Audio, Text) on Windows.

## Prerequisites

- Python 3.11+
- Node.js 18+ (for frontends)
- Git (optional)

## Backend Setup

### 1. Photo Detection Backend (Port 8001)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend-photo
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8001 --host 0.0.0.0
```

**Health Check:** `curl http://localhost:8001/api/health`

### 2. Video Detection Backend (Port 8002)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend-video
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8002 --host 0.0.0.0
```

**Health Check:** `curl http://localhost:8002/api/v1/health`

### 3. Audio Detection Backend (Port 8004)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8004 --host 0.0.0.0
```

**Health Check:** `curl http://localhost:8004/api/health`

### 4. Text Detection Backend (Port 8003)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\text-detection\backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8003 --host 0.0.0.0
```

**Health Check:** `curl http://localhost:8003/api/health`

---

## Frontend Setup

### 1. Photo Frontend (Port 5174)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\frontend-photo
npm install
npm run dev
```

Access at: `http://localhost:5174`

**Build for Production:**
```cmd
npm run build
```

### 2. Video Frontend (Port 5173)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\frontend-video
npm install
npm run dev
```

Access at: `http://localhost:5173`

### 3. Audio Frontend (Port 5175)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\frontend
npm install
npm run dev
```

Access at: `http://localhost:5175`

### 4. Text Frontend (Port 5176)

```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\text-detection\frontend
npm install
npm run dev
```

Access at: `http://localhost:5176`

---

## Quick Start - Run All Backends

Open 4 separate PowerShell/Command Prompt windows and run:

**Window 1 - Photo Backend:**
```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend-photo
python -m uvicorn app.main:app --port 8001 --host 0.0.0.0
```

**Window 2 - Video Backend:**
```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend-video
python -m uvicorn app.main:app --port 8002 --host 0.0.0.0
```

**Window 3 - Audio Backend:**
```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend
python -m uvicorn app.main:app --port 8004 --host 0.0.0.0
```

**Window 4 - Text Backend:**
```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\text-detection\backend
python -m uvicorn app.main:app --port 8003 --host 0.0.0.0
```

---

## Verify All Systems

Run these commands to verify all backends are healthy:

```cmd
curl http://localhost:8001/api/health
curl http://localhost:8002/api/v1/health
curl http://localhost:8004/api/health
curl http://localhost:8003/api/health
```

Expected responses:
- Photo: `{"status":"degraded",...,"models_loaded":[]}` (6 detectors loaded but no models_loaded list in degraded mode)
- Video: `{"status":"healthy",...,"models_loaded":["SyntheticFrameDetector","FrequencyFrameDetector",...]}`
- Audio: `{"status":"healthy",...,"models_loaded":["Spectral Artifact Analysis","Voice Consistency Analysis",...]}`
- Text: `{"status":"healthy",...,"detectors_loaded":1,"models":["roberta-base-openai-detector"]}`

---

## Test Analysis Endpoints

### Photo Analysis
```cmd
# Create test image
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend-photo
python -c "from PIL import Image; import numpy as np; img = Image.fromarray(np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)); img.save('test_image.jpg')"

# Upload for analysis
curl -X POST http://localhost:8001/api/analyze/upload -F "file=@test_image.jpg"

# Check status (replace ANALYSIS_ID)
curl http://localhost:8001/api/analyze/ANALYSIS_ID/status

# Get result
curl http://localhost:8001/api/analyze/ANALYSIS_ID/result
```

### Video Analysis
```cmd
# Create test video
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend-video
python -c "import cv2; import numpy as np; fourcc = cv2.VideoWriter_fourcc(*'mp4v'); out = cv2.VideoWriter('test_video.mp4', fourcc, 30.0, (640, 480)); [out.write(np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)) for _ in range(30)]; out.release()"

# Upload for analysis
curl -X POST http://localhost:8002/api/v1/analyze/upload -F "file=@test_video.mp4"

# Check status (replace ANALYSIS_ID)
curl http://localhost:8002/api/v1/analyze/ANALYSIS_ID/status

# Get result
curl http://localhost:8002/api/v1/analyze/ANALYSIS_ID/result
```

### Audio Analysis
```cmd
# Create test audio
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend
python -c "import numpy as np; import soundfile as sf; sr=16000; t=np.linspace(0,3,int(sr*3)); audio=0.1*np.sin(2*np.pi*440*t)+0.05*np.random.randn(len(t)); sf.write('test_audio.wav', audio, sr)"

# Upload for analysis
curl -X POST http://localhost:8004/api/analyze/upload -F "file=@test_audio.wav;type=audio/wav"

# Check status (replace ANALYSIS_ID)
curl http://localhost:8004/api/analyze/ANALYSIS_ID/status

# Get result
curl http://localhost:8004/api/analyze/ANALYSIS_ID/result
```

### Text Analysis
```cmd
# Analyze text directly (synchronous)
curl -X POST http://localhost:8003/api/analyze/text -H "Content-Type: application/json" -d "{\"text\": \"This is a test text to analyze for AI generation. It contains multiple sentences to provide enough content for the detector to work with.\"}"

# Get result (replace ANALYSIS_ID from response)
curl http://localhost:8003/api/analysis/ANALYSIS_ID/result
```

---

## API Documentation

Access Swagger UI for each backend:
- Photo: `http://localhost:8001/docs`
- Video: `http://localhost:8002/docs`
- Audio: `http://localhost:8004/docs`
- Text: `http://localhost:8003/docs`

---

## Troubleshooting

### Port Conflicts
If ports are in use:
```cmd
# Find process on port
netstat -ano | findstr :8001

# Kill process (replace PID)
taskkill /F /PID <PID>
```

### Missing Dependencies
```cmd
# For all backends
pip install -r requirements.txt

# If torchaudio issues
pip install torchaudio --index-url https://download.pytorch.org/whl/cu118

# If transformers issues
pip install transformers accelerate
```

### Frontend Build Issues
```cmd
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Python Path Issues
If imports fail, ensure you're in the correct directory:
```cmd
cd C:\Users\Hp\OneDrive\Desktop\aivsreal\backend-photo
python -c "import sys; sys.path.insert(0, '.'); from app.main import app; print('OK')"
```

---

## Project Structure

```
aivsreal/
├── backend-photo/          # Photo detection API (port 8001)
│   ├── app/
│   │   ├── main.py
│   │   ├── routes.py
│   │   ├── models/photo_detection_models.py
│   │   └── ...
│   └── requirements.txt
├── backend-video/          # Video detection API (port 8002)
│   ├── app/
│   │   ├── main.py
│   │   ├── routes.py
│   │   ├── models/video_detection_models.py
│   │   └── ...
│   └── requirements.txt
├── backend/                # Audio detection API (port 8004)
│   ├── app/
│   │   ├── main.py
│   │   ├── routes.py
│   │   ├── models/audio/detection_models.py
│   │   └── ...
│   └── requirements.txt
├── text-detection/
│   └── backend/            # Text detection API (port 8003)
│       ├── app/
│       │   ├── main.py
│       │   ├── routes.py
│       │   ├── services/analysis_service.py
│       │   └── ...
│       └── requirements.txt
├── frontend-photo/         # Photo frontend (port 5174)
├── frontend-video/         # Video frontend (port 5173)
├── frontend/               # Audio frontend (port 5175)
└── text-detection/
    └── frontend/           # Text frontend (port 5176)
```

---

## Notes

1. **Photo Backend**: The `SyntheticImageDetector` falls back to statistical analysis when the deep learning model (timm/EfficientNet) is unavailable. This is expected behavior.

2. **Video Backend**: Uses frame-level analysis with ThreadPoolExecutor for parallel processing. Analysis time scales with video length.

3. **Audio Backend**: Requires `torchaudio` with compatible PyTorch version. The `Synthetic Speech Detection` detector may fail to load on some systems - 4/5 detectors still work.

4. **Text Backend**: Uses RoBERTa model from Hugging Face. First run downloads model weights (~500MB).

5. **Frontends**: All use Vite + React 18 + TypeScript + Three.js/Fiber + Tailwind CSS. Photo frontend includes 6 interactive 3D visualizations.

6. **Rate Limiting**: All backends have slowapi rate limiting (30 req/min, 100 req/hour).

7. **CORS**: Configured for localhost ports 3000, 5173, 5174, 5175, 5176.