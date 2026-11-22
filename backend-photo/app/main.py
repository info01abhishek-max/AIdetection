import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routes import router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app_start_time = time.time()

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["30/minute", "100/hour"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Photo Authenticity Analysis API...")

    # Pre-load detectors
    from app.models.photo_detection_models import create_image_detectors
    detectors = create_image_detectors()
    loaded_count = 0
    for detector in detectors:
        try:
            if hasattr(detector, '_load_model'):
                detector._load_model()
            if hasattr(detector, 'loaded') and detector.loaded:
                loaded_count += 1
            else:
                loaded_count += 1  # Statistical detectors don't have loaded attribute
        except Exception as e:
            logger.warning(f"Detector {detector.name} failed to load: {e}")

    logger.info(f"Loaded {loaded_count}/{len(detectors)} detectors")

    yield

    logger.info("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Advanced forensic analysis for detecting AI-generated and synthetic images",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5176", "http://127.0.0.1:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "message": str(exc)},
    )


app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )