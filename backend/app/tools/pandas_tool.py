import time
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


class PandasAnalyticsTool:
    """
    Approved analytical Python tool for statistical analysis, correlation,
    aggregations, outlier detection, and distribution computation.
    """

    @classmethod
    def load_df(cls, file_path: str, file_type: str = "csv") -> pd.DataFrame:
        if file_type.lower() == "csv":
            return pd.read_csv(file_path)
        elif file_type.lower() in ("xlsx", "xls"):
            return pd.read_excel(file_path)
        else:
            return pd.read_csv(file_path)

    @classmethod
    def descriptive_statistics(cls, file_path: str, file_type: str = "csv", columns: Optional[List[str]] = None) -> Dict[str, Any]:
        start = time.time()
        df = cls.load_df(file_path, file_type)
        if columns:
            valid_cols = [c for c in columns if c in df.columns]
            df = df[valid_cols]

        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return {"error": "No numeric columns found for descriptive statistics."}

        desc = numeric_df.describe().T.reset_index()
        desc.rename(columns={"index": "column"}, inplace=True)
        # Calculate median, skewness
        desc["median"] = [float(numeric_df[col].median()) for col in desc["column"]]
        desc["skew"] = [round(float(numeric_df[col].skew()), 3) if not numeric_df[col].isnull().all() else 0 for col in desc["column"]]

        desc = desc.replace({np.nan: None})
        rows = desc.to_dict(orient="records")

        return {
            "success": True,
            "operation": "descriptive_statistics",
            "columns": list(desc.columns),
            "rows": rows,
            "execution_time_ms": round((time.time() - start) * 1000, 2)
        }

    @classmethod
    def correlation_matrix(cls, file_path: str, file_type: str = "csv", columns: Optional[List[str]] = None) -> Dict[str, Any]:
        start = time.time()
        df = cls.load_df(file_path, file_type)
        if columns:
            valid_cols = [c for c in columns if c in df.columns]
            df = df[valid_cols]

        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            return {"error": "At least two numeric columns are required to calculate correlations."}

        corr = numeric_df.corr().round(3)
        corr_reset = corr.reset_index().rename(columns={"index": "feature"})
        corr_reset = corr_reset.replace({np.nan: 0.0})

        # Generate pairwise ranking
        pairs = []
        cols = list(corr.columns)
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                val = corr.iloc[i, j]
                if not np.isnan(val):
                    pairs.append({
                        "feature_a": cols[i],
                        "feature_b": cols[j],
                        "correlation": float(val),
                        "strength": "strong" if abs(val) >= 0.7 else ("moderate" if abs(val) >= 0.3 else "weak")
                    })
        pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

        return {
            "success": True,
            "operation": "correlation_matrix",
            "matrix_columns": list(corr_reset.columns),
            "matrix_rows": corr_reset.to_dict(orient="records"),
            "top_correlated_pairs": pairs[:10],
            "execution_time_ms": round((time.time() - start) * 1000, 2)
        }

    @classmethod
    def group_and_aggregate(
        cls,
        file_path: str,
        group_by_col: str,
        agg_col: str,
        agg_func: str = "sum",
        file_type: str = "csv",
        limit: int = 15
    ) -> Dict[str, Any]:
        start = time.time()
        df = cls.load_df(file_path, file_type)

        if group_by_col not in df.columns or agg_col not in df.columns:
            return {"error": f"Columns {group_by_col} or {agg_col} not in dataset."}

        agg_func = agg_func.lower()
        if agg_func not in ("sum", "mean", "median", "count", "min", "max"):
            agg_func = "sum"

        grouped = df.groupby(group_by_col)[agg_col].agg(agg_func).reset_index()
        grouped.columns = [group_by_col, f"{agg_col}_{agg_func}"]
        grouped = grouped.sort_values(by=f"{agg_col}_{agg_func}", ascending=False).head(limit)
        grouped = grouped.replace({np.nan: None})

        return {
            "success": True,
            "operation": "group_and_aggregate",
            "columns": list(grouped.columns),
            "rows": grouped.to_dict(orient="records"),
            "row_count": len(grouped),
            "execution_time_ms": round((time.time() - start) * 1000, 2)
        }

    @classmethod
    def detect_outliers_iqr(
        cls,
        file_path: str,
        column: str,
        file_type: str = "csv"
    ) -> Dict[str, Any]:
        start = time.time()
        df = cls.load_df(file_path, file_type)
        if column not in df.columns:
            return {"error": f"Column {column} not found in dataset."}

        series = pd.to_numeric(df[column], errors="coerce").dropna()
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)]
        outlier_count = len(outliers)
        outlier_percent = round((outlier_count / len(df)) * 100, 2) if len(df) > 0 else 0

        sample_outliers = outliers.head(10).replace({np.nan: None}).to_dict(orient="records")

        return {
            "success": True,
            "operation": "detect_outliers_iqr",
            "column": column,
            "q1": round(float(q1), 2),
            "q3": round(float(q3), 2),
            "iqr": round(float(iqr), 2),
            "lower_bound": round(float(lower_bound), 2),
            "upper_bound": round(float(upper_bound), 2),
            "total_rows": len(df),
            "outlier_count": outlier_count,
            "outlier_percent": outlier_percent,
            "sample_outliers": sample_outliers,
            "execution_time_ms": round((time.time() - start) * 1000, 2)
        }
