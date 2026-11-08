import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Dataset, PredictionModel, User, UserActivity
from app.predictions.anomaly import AnomalyDetectionService
from app.predictions.clustering import ClusteringService
from app.predictions.forecasting import ForecastingService
from app.schemas.prediction import (
    AnomalyRequest, AnomalyResponse, ClusteringRequest, ClusteringResponse,
    ForecastRequest, ForecastResponse
)

router = APIRouter(prefix="/predictions", tags=["Predictive Analytics"])


@router.post("/forecast", response_model=ForecastResponse)
def generate_forecast(
    req: ForecastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trains a forward projection model on chronological or sequential records
    and outputs evaluated forecasts with accuracy metrics.
    """
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    try:
        res = ForecastingService.forecast(
            file_path=dataset.file_path,
            target_column=req.target_column,
            date_column=req.date_column,
            periods=req.periods,
            model_algorithm=req.model_algorithm or "linear",
            file_type=dataset.file_type
        )

        # Record prediction model run
        model_rec = PredictionModel(
            user_id=current_user.id,
            dataset_id=dataset.id,
            model_type="forecast",
            target_column=req.target_column,
            metrics=res["metrics"],
            parameters={"periods": req.periods, "algorithm": req.model_algorithm},
            results={"insights": res["business_insights"]}
        )
        db.add(model_rec)
        db.add(UserActivity(
            user_id=current_user.id,
            action="ran_forecast",
            details={"dataset_id": dataset.id, "target": req.target_column}
        ))
        db.commit()

        return ForecastResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Forecasting error: {str(e)}")


@router.post("/anomaly-detection", response_model=AnomalyResponse)
def detect_anomalies(
    req: AnomalyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Applies Isolation Forest outlier scoring across multi-dimensional feature distributions.
    """
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    try:
        res = AnomalyDetectionService.detect_anomalies(
            file_path=dataset.file_path,
            features=req.features,
            contamination=req.contamination,
            file_type=dataset.file_type
        )

        # Record prediction model run
        model_rec = PredictionModel(
            user_id=current_user.id,
            dataset_id=dataset.id,
            model_type="anomaly_detection",
            target_column=", ".join(req.features),
            metrics={"anomaly_rate_percent": res["anomaly_rate_percent"]},
            parameters={"features": req.features, "contamination": req.contamination},
            results={"anomalies_detected": res["anomalies_detected"]}
        )
        db.add(model_rec)
        db.add(UserActivity(
            user_id=current_user.id,
            action="ran_anomaly_detection",
            details={"dataset_id": dataset.id, "anomalies": res["anomalies_detected"]}
        ))
        db.commit()

        return AnomalyResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Anomaly detection error: {str(e)}")


@router.post("/clustering", response_model=ClusteringResponse)
def segment_clusters(
    req: ClusteringRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes K-Means unsupervised customer/item clustering with Silhouette quality scoring.
    """
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    try:
        res = ClusteringService.segment(
            file_path=dataset.file_path,
            features=req.features,
            n_clusters=req.n_clusters,
            file_type=dataset.file_type
        )

        # Record prediction model run
        model_rec = PredictionModel(
            user_id=current_user.id,
            dataset_id=dataset.id,
            model_type="clustering",
            target_column=", ".join(req.features),
            metrics={"silhouette_score": res["silhouette_score"]},
            parameters={"features": req.features, "n_clusters": req.n_clusters},
            results={"profiles_count": len(res["cluster_profiles"])}
        )
        db.add(model_rec)
        db.add(UserActivity(
            user_id=current_user.id,
            action="ran_clustering",
            details={"dataset_id": dataset.id, "n_clusters": req.n_clusters}
        ))
        db.commit()

        return ClusteringResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Clustering error: {str(e)}")
