from typing import Any, Dict, List
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score


class ClusteringService:
    """
    Unsupervised customer / transaction segmentation engine using K-Means and Silhouette scoring.
    """

    @classmethod
    def segment(
        cls,
        file_path: str,
        features: List[str],
        n_clusters: int = 3,
        file_type: str = "csv"
    ) -> Dict[str, Any]:
        if file_type == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        valid_features = [f for f in features if f in df.columns]
        if len(valid_features) < 2:
            raise ValueError("At least 2 numeric features are required to form meaningful clusters.")

        sub_df = df[valid_features].copy()
        for col in valid_features:
            sub_df[col] = pd.to_numeric(sub_df[col], errors="coerce")
            median_val = sub_df[col].median()
            sub_df[col] = sub_df[col].fillna(median_val if not np.isnan(median_val) else 0)

        if len(sub_df) < n_clusters * 2:
            raise ValueError(f"At least {n_clusters * 2} records required for {n_clusters} clusters.")

        scaler = StandardScaler()
        scaled_X = scaler.fit_transform(sub_df[valid_features])

        n_clusters = max(2, min(8, n_clusters))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(scaled_X)

        score = float(silhouette_score(scaled_X, labels)) if len(sub_df) > n_clusters else 0.0

        sub_df["cluster"] = [f"Cluster {i+1}" for i in labels]

        # Calculate cluster centroids and size
        cluster_profiles = []
        for c_idx in range(n_clusters):
            c_name = f"Cluster {c_idx+1}"
            c_rows = sub_df[sub_df["cluster"] == c_name]
            size = len(c_rows)
            pct = round((size / len(sub_df)) * 100, 1)

            feature_means = {}
            for f in valid_features:
                feature_means[f] = round(float(c_rows[f].mean()), 2)

            cluster_profiles.append({
                "cluster_name": c_name,
                "size": size,
                "percentage": pct,
                "means": feature_means
            })

        # Chart data: cluster means comparison
        chart_data = []
        for profile in cluster_profiles:
            item = {"cluster": profile["cluster_name"], "size": profile["size"]}
            for f, val in profile["means"].items():
                item[f] = val
            chart_data.append(item)

        chart_config = {
            "type": "bar",
            "title": f"Cluster Feature Comparison ({n_clusters} Segments)",
            "x_axis": "cluster",
            "y_axis": valid_features[0],
            "series_keys": valid_features[:4],
            "colors": ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
            "data": chart_data
        }

        insights = [
            f"Segmented data into {n_clusters} distinct clusters with a Silhouette Quality Score of {score:.2f}.",
            f"Dominant segment is '{cluster_profiles[0]['cluster_name']}' representing {cluster_profiles[0]['percentage']}% of observations.",
            f"Key differentiator across clusters observed in feature: '{valid_features[0]}'."
        ]

        return {
            "n_clusters": n_clusters,
            "features": valid_features,
            "silhouette_score": round(score, 3),
            "cluster_profiles": cluster_profiles,
            "chart_config": chart_config,
            "insights": insights
        }
