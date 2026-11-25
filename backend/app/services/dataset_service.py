import os
import re
import shutil
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import BACKEND_DIR, settings
from app.core.json_utils import sanitize_for_json
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
        """Saves file to upload directory with sanitized unique filename."""
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        base_name = os.path.basename(filename)
        clean_base = re.sub(r"[^a-zA-Z0-9._-]", "_", base_name)
        safe_filename = f"{os.urandom(8).hex()}_{clean_base}"
        target_path = os.path.abspath(os.path.join(settings.UPLOAD_DIR, safe_filename))
        with open(target_path, "wb") as f:
            f.write(file_content)
        return target_path

    @classmethod
    def resolve_dataset_file(cls, file_path: str, original_filename: Optional[str] = None) -> Optional[str]:
        """
        Resolves dataset file location across restarts/containers and restores bundled
        sample datasets transparently if cloud ephemeral disk storage was reset.
        """
        if file_path and os.path.exists(file_path):
            return file_path

        # Check standard UPLOAD_DIR by basename (handles relative/moved directory changes)
        if file_path:
            alt_upload = os.path.abspath(os.path.join(settings.UPLOAD_DIR, os.path.basename(file_path)))
            if os.path.exists(alt_upload):
                return alt_upload

        # Check bundled sample datasets fallback for demo persistence on ephemeral Free Tiers
        if original_filename:
            sample_dirs = [
                os.path.abspath(os.path.join(BACKEND_DIR, "..", "sample_datasets")),
                os.path.abspath(os.path.join(BACKEND_DIR, "sample_datasets")),
                os.path.abspath("sample_datasets"),
            ]
            for s_dir in sample_dirs:
                candidate = os.path.join(s_dir, os.path.basename(original_filename))
                if os.path.exists(candidate):
                    return candidate

        return None

    @classmethod
    def profile_dataset(cls, file_path: str, file_type: str) -> Tuple[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]:
        """
        Profiles a dataset memory-efficiently:
        Calculates row/col counts, missingness, duplicate rows, data types,
        numerical statistics, and categorical distributions.
        """
        if file_type == "csv":
            df = pd.read_csv(file_path, low_memory=False)
        elif file_type in ("xlsx", "xls"):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path, low_memory=False)

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
            stats_dict: Dict[str, Any] = {}
            if pd.api.types.is_bool_dtype(series):
                data_type = "boolean"
            elif pd.api.types.is_numeric_dtype(series):
                data_type = "numeric"
                valid_num = series.replace([np.inf, -np.inf], np.nan).dropna()
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
            else:
                data_type = "categorical" if unique_count <= 50 else "text"
                top_counts = series.value_counts(dropna=True).head(5).to_dict()
                stats_dict = {
                    "top_values": {str(k): int(v) for k, v in top_counts.items()}
                }

            columns_profile.append({
                "column_name": str(col),
                "data_type": data_type,
                "null_count": null_count,
                "null_percentage": round((null_count / total_rows * 100), 2) if total_rows > 0 else 0.0,
                "unique_count": unique_count,
                "sample_values": sanitize_for_json(sample_vals),
                "statistics": sanitize_for_json(stats_dict)
            })

        metadata_profile = sanitize_for_json({
            "total_rows": total_rows,
            "total_columns": total_cols,
            "duplicate_rows": duplicate_rows,
            "total_null_cells": overall_null_count,
            "null_percentage": null_percentage,
            "file_type": file_type,
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2),
            "columns_overview": [
                {"name": c["column_name"], "type": c["data_type"], "nulls": c["null_count"]}
                for c in columns_profile
            ]
        })

        return df, metadata_profile, columns_profile

    @classmethod
    def get_preview(cls, file_path: str, file_type: str, limit: int = 100) -> Dict[str, Any]:
        """Returns safe preview rows and schema for frontend inspection."""
        if file_type == "csv":
            df = pd.read_csv(file_path, nrows=limit, low_memory=False)
        else:
            df = pd.read_excel(file_path, nrows=limit)

        for col in df.columns:
            if "datetime" in str(df[col].dtype).lower():
                df[col] = df[col].astype(str)

        rows = sanitize_for_json(df.to_dict(orient="records"))

        return {
            "columns": [str(c) for c in df.columns],
            "rows": rows,
            "preview_limit": limit
        }
