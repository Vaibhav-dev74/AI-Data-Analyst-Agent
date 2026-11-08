import os
import shutil
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Dataset, DatasetColumn, UserActivity


class DatasetService:
    """
    Handles file storage, memory-efficient inspection, schema profiling,
    null statistics, and DuckDB table generation.
    """

    ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

    @classmethod
    def validate_file(cls, filename: str, file_size: int) -> str:
        """Validates extension and file size."""
        _, ext = os.path.splitext(filename.lower())
        if ext not in cls.ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file format '{ext}'. Only CSV, XLSX, and XLS are supported.")

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")

        return ext.lstrip(".")

    @classmethod
    def save_upload_file(cls, file_content: bytes, filename: str) -> str:
        """Saves file to upload directory with unique filename."""
        safe_filename = f"{os.urandom(8).hex()}_{filename}"
        target_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        with open(target_path, "wb") as f:
            f.write(file_content)
        return target_path

    @classmethod
    def profile_dataset(cls, file_path: str, file_type: str) -> Tuple[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]:
        """
        Profiles a dataset memory-efficiently:
        Calculates row/col counts, missingness, duplicate rows, data types,
        numerical statistics, and categorical distributions.
        """
        if file_type == "csv":
            # Read first chunk or entire file if within safe size
            df = pd.read_csv(file_path, low_memory=False)
        elif file_type in ("xlsx", "xls"):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)

        total_rows = int(len(df))
        total_cols = int(len(df.columns))
        duplicate_rows = int(df.duplicated().sum())

        columns_profile = []
        overall_null_count = int(df.isnull().sum().sum())
        total_cells = total_rows * total_cols
        null_percentage = round((overall_null_count / total_cells * 100), 2) if total_cells > 0 else 0.0

        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            unique_count = int(series.nunique(dropna=True))

            # Sample non-null values
            sample_vals = [str(x) for x in series.dropna().head(5).tolist()]

            # Determine semantic type
            stats_dict = {}
            if pd.api.types.is_numeric_dtype(series):
                data_type = "numeric"
                valid_num = series.dropna()
                if not valid_num.empty:
                    stats_dict = {
                        "mean": round(float(valid_num.mean()), 3),
                        "median": round(float(valid_num.median()), 3),
                        "std": round(float(valid_num.std()), 3) if len(valid_num) > 1 else 0.0,
                        "min": round(float(valid_num.min()), 3),
                        "max": round(float(valid_num.max()), 3),
                        "q25": round(float(valid_num.quantile(0.25)), 3),
                        "q75": round(float(valid_num.quantile(0.75)), 3)
                    }
            elif pd.api.types.is_datetime64_any_dtype(series) or "date" in str(col).lower() or "time" in str(col).lower():
                data_type = "datetime"
            elif pd.api.types.is_bool_dtype(series):
                data_type = "boolean"
            else:
                data_type = "categorical" if unique_count <= 50 else "text"
                # Top frequencies for categoricals
                top_counts = series.value_counts(dropna=True).head(5).to_dict()
                stats_dict = {
                    "top_values": {str(k): int(v) for k, v in top_counts.items()}
                }

            columns_profile.append({
                "column_name": str(col),
                "data_type": data_type,
                "null_count": null_count,
                "null_percentage": round((null_count / total_rows * 100), 2) if total_rows > 0 else 0,
                "unique_count": unique_count,
                "sample_values": sample_vals,
                "statistics": stats_dict
            })

        metadata_profile = {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "duplicate_rows": duplicate_rows,
            "total_null_cells": overall_null_count,
            "null_percentage": null_percentage,
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2),
            "columns_overview": [
                {"name": c["column_name"], "type": c["data_type"], "nulls": c["null_count"]}
                for c in columns_profile
            ]
        }

        return df, metadata_profile, columns_profile

    @classmethod
    def get_preview(cls, file_path: str, file_type: str, limit: int = 100) -> Dict[str, Any]:
        """Returns safe preview rows and schema for frontend inspection."""
        if file_type == "csv":
            df = pd.read_csv(file_path, nrows=limit, low_memory=False)
        else:
            df = pd.read_excel(file_path, nrows=limit)

        # Replace NaN with None
        df = df.where(pd.notnull(df), None)

        # Convert timestamps to string
        for col in df.columns:
            if "datetime" in str(df[col].dtype).lower():
                df[col] = df[col].astype(str)

        return {
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
            "preview_limit": limit
        }
