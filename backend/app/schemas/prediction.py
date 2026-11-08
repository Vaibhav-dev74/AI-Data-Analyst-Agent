from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ForecastRequest(BaseModel):
    dataset_id: str
    target_column: str
    date_column: Optional[str] = None
    periods: int = 6  # number of future periods to predict
    model_algorithm: Optional[str] = "linear"  # "linear", "random_forest", "exponential_smoothing"


class ForecastResponse(BaseModel):
    target_column: str
    date_column: Optional[str] = None
    historical_points: List[Dict[str, Any]]
    forecast_points: List[Dict[str, Any]]
    metrics: Dict[str, float]  # r2, mae, rmse
    chart_config: Dict[str, Any]
    business_insights: List[str]


class AnomalyRequest(BaseModel):
    dataset_id: str
    features: List[str]
    contamination: float = 0.05  # expected outlier percentage (1-10%)


class AnomalyResponse(BaseModel):
    total_samples: int
    anomalies_detected: int
    anomaly_rate_percent: float
    features_analyzed: List[str]
    top_anomalies: List[Dict[str, Any]]
    chart_config: Dict[str, Any]
    insights: List[str]


class ClusteringRequest(BaseModel):
    dataset_id: str
    features: List[str]
    n_clusters: int = 3


class ClusteringResponse(BaseModel):
    n_clusters: int
    features: List[str]
    silhouette_score: float
    cluster_profiles: List[Dict[str, Any]]
    chart_config: Dict[str, Any]
    insights: List[str]
