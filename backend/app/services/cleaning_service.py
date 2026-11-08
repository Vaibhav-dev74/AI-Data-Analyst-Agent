import os
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


class CleaningService:
    """
    Automated and assisted data cleaning routines:
    Missing value imputation, duplicate removal, column dropping, and type casting.
    """

    @classmethod
    def clean_dataset(
        cls,
        file_path: str,
        file_type: str,
        remove_duplicates: bool = True,
        fill_null_method: Optional[str] = "mean",
        drop_null_threshold: Optional[float] = None,
        columns_to_drop: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Applies cleaning operations and updates the file in place or returns stats."""
        if file_type == "csv":
            df = pd.read_csv(file_path, low_memory=False)
        else:
            df = pd.read_excel(file_path)

        initial_rows = len(df)
        initial_cols = len(df.columns)
        duplicates_removed = 0

        # 1. Remove duplicates
        if remove_duplicates:
            df_dedup = df.drop_duplicates()
            duplicates_removed = initial_rows - len(df_dedup)
            df = df_dedup

        # 2. Drop specified columns
        dropped_cols = []
        if columns_to_drop:
            for col in columns_to_drop:
                if col in df.columns:
                    df = df.drop(columns=[col])
                    dropped_cols.append(col)

        # 3. Drop rows with null percentage exceeding threshold
        rows_dropped_nulls = 0
        if drop_null_threshold is not None and 0.0 < drop_null_threshold <= 1.0:
            threshold_count = int((1.0 - drop_null_threshold) * len(df.columns))
            before = len(df)
            df = df.dropna(thresh=threshold_count)
            rows_dropped_nulls = before - len(df)

        # 4. Impute missing values for remaining cells
        imputed_cells = 0
        if fill_null_method:
            for col in df.columns:
                null_count = df[col].isnull().sum()
                if null_count > 0:
                    imputed_cells += int(null_count)
                    if pd.api.types.is_numeric_dtype(df[col]):
                        if fill_null_method == "mean":
                            val = df[col].mean()
                            df[col] = df[col].fillna(val)
                        elif fill_null_method == "median":
                            val = df[col].median()
                            df[col] = df[col].fillna(val)
                        elif fill_null_method == "zero":
                            df[col] = df[col].fillna(0)
                    else:
                        if fill_null_method in ("mode", "mean", "median"):
                            mode_val = df[col].mode()
                            fill_val = mode_val[0] if not mode_val.empty else "Unknown"
                            df[col] = df[col].fillna(fill_val)
                        else:
                            df[col] = df[col].fillna("Unknown")

        # Save cleaned file back
        if file_type == "csv":
            df.to_csv(file_path, index=False)
        else:
            df.to_excel(file_path, index=False)

        return {
            "initial_rows": initial_rows,
            "final_rows": len(df),
            "duplicates_removed": duplicates_removed,
            "rows_dropped_nulls": rows_dropped_nulls,
            "columns_dropped": dropped_cols,
            "imputed_cells": imputed_cells,
            "new_size_bytes": os.path.getsize(file_path)
        }
