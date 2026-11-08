from typing import Any, Dict, List
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


class AnomalyDetectionService:
    """
    Multivariate anomaly and outlier detection engine using Isolation Forests.
    """

    @classmethod
    def detect_anomalies(
        cls,
        file_path: str,
        features: List[str],
        contamination: float = 0.05,
        file_type: str = "csv"
    ) -> Dict[str, Any]:
        if file_type == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        valid_features = [f for f in features if f in df.columns]
        if not valid_features:
            raise ValueError(f"None of the requested features {features} exist in dataset.")

        # Subset & impute missing values with median
        sub_df = df[valid_features].copy()
        for col in valid_features:
            sub_df[col] = pd.to_numeric(sub_df[col], errors="coerce")
            median_val = sub_df[col].median()
            sub_df[col] = sub_df[col].fillna(median_val if not np.isnan(median_val) else 0)

        if len(sub_df) < 10:
            raise ValueError("At least 10 records are required to perform anomaly detection.")

        contamination = max(0.01, min(0.20, contamination))

        iso = IsolationForest(contamination=contamination, random_state=42)
        preds = iso.fit_predict(sub_df[valid_features])
        scores = iso.decision_function(sub_df[valid_features])

        df_copy = df.copy()
        df_copy["is_anomaly"] = (preds == -1)
        df_copy["anomaly_score"] = [round(float(-s), 4) for s in scores]  # Higher score = more anomalous

        anomalies_df = df_copy[df_copy["is_anomaly"]].sort_values(by="anomaly_score", ascending=False)
        total_samples = len(df)
        anomaly_count = int(len(anomalies_df))
        anomaly_rate = round((anomaly_count / total_samples) * 100, 2)

        # Top 15 anomalies
        top_anomalies = anomalies_df.head(15).replace({np.nan: None}).to_dict(orient="records")

        # Visualization: plot primary feature vs anomaly score or secondary feature
        f1 = valid_features[0]
        f2 = valid_features[1] if len(valid_features) > 1 else "anomaly_score"

        chart_data = []
        for i, row in df_copy.head(100).iterrows():
            chart_data.append({
                "index": int(i),
                f1: round(float(row[f1]), 2) if pd.notnull(row[f1]) else 0,
                f2: round(float(row[f2]), 2) if pd.notnull(row[f2]) else 0,
                "status": "Anomaly" if row["is_anomaly"] else "Normal"
            })

        chart_config = {
            "type": "scatter",
            "title": f"Anomaly Distribution ({f1} vs {f2})",
            "x_axis": f1,
            "y_axis": f2,
            "series_keys": [f2],
            "colors": ["#ef4444", "#3b82f6"],
            "data": chart_data
        }

        insights = [
            f"Detected {anomaly_count} anomalous data points ({anomaly_rate}% of the total {total_samples:,} records).",
            f"Evaluated features: {', '.join(valid_features)} with an expected contamination rate of {contamination*100:.1f}%.",
            f"Highest anomaly score detected: {anomalies_df['anomaly_score'].iloc[0] if anomaly_count > 0 else 0}."
        ]

        return {
            "total_samples": total_samples,
            "anomalies_detected": anomaly_count,
            "anomaly_rate_percent": anomaly_rate,
            "features_analyzed": valid_features,
            "top_anomalies": top_anomalies,
            "chart_config": chart_config,
            "insights": insights
        }
