# AI Text Detection & Linguistic Analysis System

A complete, production-ready AI-generated text detection and linguistic analysis system with a premium 3D frontend and modular FastAPI backend.

## Features

### Frontend (React 18 + TypeScript + Vite)
- **Premium 3D Interface**: Dark cinematic design with cyan/violet accents, glassmorphism
- **3D Visualizations**: 
  - Floating 3D document with animated text lines
  - AI Scanner with lens, rings, particle field, and scanning beam
  - Holographic text layers with orbital particles
- **Text Editor**: Large text area with paste, file upload (TXT/PDF/DOCX), drag-drop, real-time stats
- **Results Panel**: Animated assessment badge, detector results, evidence breakdown, linguistic metrics, technical details
- **Smooth Animations**: Framer Motion transitions throughout
- **Responsive Design**: Works on desktop and mobile

### Backend (FastAPI + Python)
- **Modular NLP Pipeline**: 
  - Text statistics (word/sentence/paragraph counts, TTR, hapax legomena)
  - POS tagging distribution
  - Function word ratio
  - Readability scores (Flesch, Gunning Fog, ARI, etc.)
  - N-gram entropy (1-4 grams)
- **AI Detection Models**:
  - RoBERTa OpenAI Detector (transformers)
  - GPT-2 Perplexity Detector
  - Extensible ensemble framework
- **Linguistic Analysis**:
  - Burstiness (sentence length variation)
  - Repetition detection (n-gram and self-similarity)
  - Sliding window perplexity
- **File Extraction**: Safe PDF (pdfplumber) and DOCX (python-docx) text extraction
- **Result Aggregation**: Evidence-based classification with confidence scoring
- **Privacy-First**: No data retention, temporary file cleanup, configurable limits

### Classification Categories
- `LIKELY_AI_GENERATED` - Strong evidence of AI authorship
- `POSSIBLY_AI_ASSISTED` - Some AI indicators, not conclusive
- `LIKELY_HUMAN_WRITTEN` - Human writing patterns dominant
- `MIXED_UNCERTAIN` - Conflicting signals
- `INCONCLUSIVE` - Insufficient data

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Backend Setup

```bash
cd text-detection/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (first run)
python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab'); nltk.download('averaged_perceptron_tagger'); nltk.download('averaged_perceptron_tagger_eng')"

# Run server
python -m app.main
```

Server starts at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd text-detection/frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend starts at `http://localhost:3000`

## Project Structure

```
text-detection/
├── backend/
│   ├── app/
│   │   ├── config.py              # Settings & configuration
│   │   ├── main.py                # FastAPI application
│   │   ├── routes.py              # API endpoints
│   │   ├── schemas.py             # Pydantic models
│   │   └── services/
│   │       ├── nlp_analyzer.py    # Linguistic feature extraction
│   │       ├── ai_detector.py     # AI detection models
│   │       ├── file_extractor.py  # PDF/DOCX/TXT extraction
│   │       ├── result_aggregator.py # Classification logic
│   │       └── analysis_service.py # Orchestration
│   ├── requirements.txt
│   └── models/                    # Model cache (auto-created)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── TextEditor.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   └── three/
│   │   │       ├── Scene3D.tsx
│   │   │       ├── Document3D.tsx
│   │   │       ├── AIScanner3D.tsx
│   │   │       └── HolographicTextLayers.tsx
│   │   ├── utils/
│   │   │   ├── api.ts
│   │   │   └── text.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check, detector status |
| POST | `/api/analyze/text` | Start text analysis |
| POST | `/api/analyze/file` | Upload & analyze file |
| GET | `/api/analysis/{id}/status` | Poll analysis status |
| GET | `/api/analysis/{id}/result` | Get analysis result |
| GET | `/api/analysis/{id}/report` | Download JSON report |
| DELETE | `/api/analysis/{id}` | Delete analysis |
| GET | `/api/stats` | System statistics |

## Configuration

### Backend (.env)
```env
HOST=0.0.0.0
PORT=8000
DEBUG=true
MAX_FILE_SIZE=10485760
MAX_TEXT_LENGTH=50000
MIN_TEXT_LENGTH=50
MODEL_CACHE_DIR=./models
AI_DETECTOR_MODEL=roberta-base-openai-detector
PERPLEXITY_MODEL=gpt2
ENABLE_CUDA=false
RETAIN_FILES=false
RETAIN_RESULTS=false
```

### Frontend (vite.config.ts)
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

## Building for Production

### Backend
```bash
cd backend
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend
```bash
cd frontend
npm run build
# Output in dist/
# Serve with nginx, Vercel, Netlify, etc.
```

## Privacy & Security

- **No data retention**: Text and files deleted after processing (configurable)
- **Input validation**: Size limits, MIME type validation, file signature verification
- **Safe extraction**: pdfplumber and python-docx with error handling
- **Temporary cleanup**: Automatic cleanup of upload directory
- **CORS**: Configurable allowed origins
- **No logging of content**: Only metadata and results logged

## Limitations

- **Not definitive proof**: AI detection is probabilistic, not deterministic
- **Short text unreliable**: Minimum 50 characters required, longer text = better accuracy
- **Language bias**: Models trained primarily on English
- **False positives**: Formal, technical, or non-native writing may trigger AI indicators
- **Model limitations**: Detectors can be evaded by paraphrasing/editing
- **No watermark detection**: Does not detect cryptographic watermarks

## Future Integration

The system is designed for extensibility:

1. **Add new detectors**: Implement `BaseAIDetector` interface
2. **New linguistic features**: Extend `LinguisticAnalyzer` class
3. **Additional file formats**: Add extractors in `file_extractor.py`
4. **Custom classification**: Modify `ResultAggregator` logic
5. **Batch processing**: Use `AnalysisService` directly
6. **Model fine-tuning**: Replace detector models in `ai_detector.py`

## License

MIT License - For research and educational purposes only.

## Disclaimer

This system provides probabilistic estimates based on linguistic patterns and detector outputs. It cannot definitively prove authorship. Results should be interpreted with appropriate caution and never used as sole evidence in high-stakes decisions.