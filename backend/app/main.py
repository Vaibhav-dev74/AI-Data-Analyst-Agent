import logging
import os
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
    """Lifecycle manager for startup database table creation, initial seeding, and cleanup."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("InsightIQ Engine online.")

    # Auto-seed default demo analyst (and sample dataset on fresh non-test environments)
    if settings.ENVIRONMENT.lower() != "test":
        try:
            from app.core.security import hash_password
            from app.database.session import SessionLocal
            from app.models import Dataset, DatasetColumn, User
            from app.services.dataset_service import DatasetService

            db = SessionLocal()
            try:
                demo_email = "analyst@insightiq.ai"
                demo_user = db.query(User).filter(User.email == demo_email).first()
                if not demo_user:
                    demo_user = User(
                        email=demo_email,
                        hashed_password=hash_password("Password123!"),
                        full_name="Senior Data Analyst",
                        role="analyst",
                        is_active=True
                    )
                    db.add(demo_user)
                    db.commit()
                    db.refresh(demo_user)
                    logger.info("Default demo analyst seeded: %s", demo_email)

                # Seed sample sales dataset on brand-new cloud DB so demo works immediately
                existing_count = db.query(Dataset).filter(Dataset.user_id == demo_user.id).count()
                if existing_count == 0:
                    sample_path = DatasetService.resolve_dataset_file("", "sales_data.csv")
                    if sample_path and os.path.exists(sample_path):
                        with open(sample_path, "rb") as sf:
                            content = sf.read()
                        stored_path = DatasetService.save_upload_file(content, "sales_data.csv")
                        _, metadata_profile, columns_profile = DatasetService.profile_dataset(stored_path, "csv")

                        sample_ds = Dataset(
                            user_id=demo_user.id,
                            name="Sales Data",
                            original_filename="sales_data.csv",
                            file_path=stored_path,
                            file_type="csv",
                            file_size=len(content),
                            row_count=metadata_profile["total_rows"],
                            column_count=metadata_profile["total_columns"],
                            status="ready",
                            metadata_profile=metadata_profile
                        )
                        db.add(sample_ds)
                        db.commit()
                        db.refresh(sample_ds)

                        for col_data in columns_profile:
                            db.add(DatasetColumn(
                                dataset_id=sample_ds.id,
                                column_name=col_data["column_name"],
                                data_type=col_data["data_type"],
                                null_count=col_data["null_count"],
                                unique_count=col_data["unique_count"],
                                sample_values=col_data["sample_values"],
                                statistics=col_data["statistics"]
                            ))
                        db.commit()
                        logger.info("Sample dataset 'sales_data.csv' seeded for %s", demo_email)
            finally:
                db.close()
        except Exception as e:
            logger.warning("Could not auto-seed demo workspace: %s", e)

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

# CORS configuration: explicit origins + regex for Vercel preview URLs
configured_origins = settings.cors_origins_list
allow_all = "*" in configured_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else configured_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$|^https:\/\/.*\.onrender\.com$|^http:\/\/localhost(:\d+)?$|^http:\/\/127\.0\.0\.1(:\d+)?$",
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
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


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check for compiled frontend distribution
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))

if os.path.exists(frontend_dist):
    # Mount assets directory for CSS/JS
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Catch-all route to serve React SPA index.html
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Don't intercept API routes or health
        if full_path.startswith("api") or full_path == "health":
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        target_file = os.path.join(frontend_dist, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/", tags=["Root"])
    def root():
        return {
            "name": "InsightIQ API",
            "status": "operational",
            "documentation": "/api/docs"
        }
