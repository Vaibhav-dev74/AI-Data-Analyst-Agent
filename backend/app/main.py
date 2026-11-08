import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import analyst, analytics, auth, datasets, predictions, reports, users
from app.core.config import settings
from app.database.session import Base, engine

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("insightiq")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup database table creation and cleanup."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("InsightIQ Engine online.")
    yield
    logger.info("InsightIQ shutting down.")


app = FastAPI(
    title="InsightIQ – AI-Powered Data Analyst Agent",
    description="Enterprise autonomous data analytics API orchestrating LangGraph multi-agent workflows, DuckDB SQL sandboxing, and predictive ML.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
api_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(datasets.router, prefix=api_prefix)
app.include_router(analyst.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(predictions.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)


@app.get("/health", tags=["Health"])
@app.get(f"{api_prefix}/health", tags=["Health"])
def health_check():
    """Health check endpoint for production monitoring."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0",
            "provider": settings.AI_PROVIDER
        }
    )


@app.get("/", tags=["Root"])
def root():
    return {
        "name": "InsightIQ API",
        "status": "operational",
        "documentation": "/api/docs"
    }
