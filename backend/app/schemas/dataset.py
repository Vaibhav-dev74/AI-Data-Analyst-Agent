from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class ColumnProfile(BaseModel):
    id: Optional[str] = None
    column_name: str
    data_type: str
    null_count: int
    unique_count: int
    sample_values: Optional[List[Any]] = None
    statistics: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class DatasetSummary(BaseModel):
    id: str
    name: str
    original_filename: str
    file_type: str
    file_size: int
    row_count: int
    column_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DatasetDetail(DatasetSummary):
    metadata_profile: Optional[Dict[str, Any]] = None
    columns: List[ColumnProfile] = []

    model_config = ConfigDict(from_attributes=True)


class DatasetPreview(BaseModel):
    id: str
    name: str
    total_rows: int
    total_columns: int
    columns: List[str]
    rows: List[Dict[str, Any]]


class CleanDataRequest(BaseModel):
    drop_null_threshold: Optional[float] = None  # drop rows if null percentage exceeds this
    fill_null_method: Optional[str] = "mean"  # mean, median, mode, zero, drop
    remove_duplicates: bool = True
    columns_to_drop: Optional[List[str]] = None
