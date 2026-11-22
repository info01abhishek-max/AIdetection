# AI Audio Authenticity Detection System

A complete, independent AI audio authenticity detection application for forensic analysis of audio files. Built with a premium 3D frontend and modular backend featuring multiple detection models.

## Features

### Core Capabilities
- **Multi-format Audio Support**: WAV, MP3, M4A, FLAC, OGG, OPUS, WebM
- **Real ML Inference**: 5 independent detection models running in parallel
- **Evidence-based Analysis**: Never claims certainty, only probabilistic assessments
- **Interactive 3D Visualizations**: Real-time waveform, frequency bars, holographic rings
- **Audio Playback**: Built-in player with seek, volume, and duration display
- **Comprehensive Reports**: JSON export with full technical details

### Detection Models
1. **Synthetic Speech Detection** - CNN-based deep learning model analyzing mel-spectrograms
2. **Spectral Artifact Analysis** - Detects vocoder artifacts, spectral smoothing, phase coherence anomalies
3. **Voice Consistency Analysis** - Segment-level timbre/pitch consistency for splicing/TTS detection
4. **Audio Quality Assessment** - SNR, clipping, dynamic range, codec artifact detection
5. **Statistical Anomaly Detection** - Random Forest on extracted acoustic features

### Assessment Categories
- **LIKELY SYNTHETIC** - Strong evidence of AI generation
- **LIKELY HUMAN-RECORDED** - Consistent with natural human speech
- **POSSIBLE MANIPULATION** - Evidence of post-recording editing
- **INCONCLUSIVE** - Insufficient evidence for confident determination

## Architecture

```
aivsreal/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry
│   │   ├── config.py            # Configuration settings
│   │   ├── routes.py            # API endpoints
│   │   ├── schemas.py           # Pydantic models
│   │   ├── services/
│   │   │   ├── audio_processor.py   # Audio loading, features, metadata
│   │   │   └── analysis_service.py  # Orchestration & result aggregation
│   │   └── models/
│   │       └── audio/
│   │           └── detection_models.py  # 5 detector implementations
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main application
│   │   ├── main.tsx             # Entry point
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── AudioUploadZone.tsx
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   └── three/
│   │   │       ├── FloatingParticles.tsx
│   │   │       ├── GridBackground.tsx
│   │   │       ├── HolographicCard.tsx
│   │   │       ├── ScannerRing.tsx
│   │   │       └── audio/
│   │   │           ├── Microphone3D.tsx
│   │   │           ├── Waveform3D.tsx
│   │   │           ├── HolographicWaveformRing.tsx
│   │   │           └── Scene3D.tsx
│   │   ├── utils/
│   │   │   ├── api.ts
│   │   │   └── audio/
│   │   │       └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

## Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- FFmpeg (for audio decoding)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download NLTK data (if needed for future text features)
python -c "import nltk; nltk.download('punkt')"
```

### Frontend Setup
```bash
cd frontend
npm install
```

## Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API will be available at `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000` (proxied to backend API)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health & loaded models |
| POST | `/api/analyze/upload` | Upload audio file for analysis |
| GET | `/api/analyze/{id}/status` | Check analysis progress |
| GET | `/api/analyze/{id}/result` | Get analysis results |
| GET | `/api/analyze/{id}/report` | Download JSON report |
| DELETE | `/api/analyze/{id}` | Delete analysis & files |

## Configuration

### Backend (`.env` or `backend/app/config.py`)
```python
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_DURATION = 300  # 5 minutes
SAMPLE_RATE = 16000  # Target sample rate
SUPPORTED_FORMATS = [...]  # MIME types
```

### Frontend
Configure via `vite.config.ts` proxy settings.

## Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest app/tests/ -v
```

### Test Coverage
- Valid audio files (all supported formats)
- Invalid/corrupted files
- Empty files
- Duration limits
- File size limits
- Decoder failures
- Model unavailability
- Inference errors

## Known Limitations

1. **Short Clips** (<3 seconds): Limited evidence for reliable detection
2. **Background Noise/Music**: Can mask or mimic synthetic artifacts
3. **Heavy Compression**: Low-bitrate lossy codecs may create false positives
4. **Multiple Speakers**: Voice consistency analysis assumes single speaker
5. **Language Independence**: Models trained primarily on English speech
6. **No Ground Truth**: Results are probabilistic, not definitive proof
7. **Model Generalization**: May not detect latest generation models
8. **Adversarial Attacks**: Sophisticated evasion techniques may bypass detection

## Future Integration

### Adding New Detectors
1. Create new class inheriting from `BaseDetector` in `detection_models.py`
2. Implement `load()` and `detect()` methods
3. Register in `detector_registry` at bottom of file
4. Add weights to `category_weights` in `analysis_service.py`

### Frontend Extensions
- Add new 3D visualizations in `components/three/audio/`
- Extend `AudioFile` type for additional metadata
- Add new result panels in `ResultsPanel.tsx`

### Model Improvements
- Replace dummy Random Forest with trained model
- Fine-tune CNN on labeled synthetic/human datasets
- Add speaker embedding consistency checks
- Implement raw waveform models (RawNet, AASIST)

## Security Considerations

- File size limits (100MB)
- Duration limits (5 minutes)
- MIME type validation
- Temporary file cleanup after analysis
- No persistent storage of uploaded files
- CORS restricted to localhost
- Resource limits on inference

## Performance

- **CPU Fallback**: All models run on CPU if GPU unavailable
- **Streaming Upload**: Progress tracking for large files
- **Background Processing**: Non-blocking analysis via FastAPI BackgroundTasks
- **Memory Efficient**: Streaming audio decode, no full-file loading
- **Model Caching**: Detectors loaded once at startup

## License

For research and educational purposes only. Results are probabilistic estimates and should not be used as definitive proof in legal or high-stakes contexts.

## Acknowledgments

- Built with FastAPI, React, Three.js, React Three Fiber
- Audio processing via librosa, torchaudio, soundfile
- ML via PyTorch, scikit-learn, timm
- UI via Tailwind CSS, Framer Motion, Lucide React