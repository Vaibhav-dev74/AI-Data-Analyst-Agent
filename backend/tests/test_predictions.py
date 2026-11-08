def test_ml_prediction_workflows(authenticated_client):
    # Upload sample sales dataset
    with open("sample_datasets/sales_data.csv", "rb") as f:
        upload_res = authenticated_client.post(
            "/api/datasets/upload",
            files={"file": ("sales_data.csv", f, "text/csv")}
        )
    dataset_id = upload_res.json()["id"]

    # 1. Forecasting
    forecast_res = authenticated_client.post("/api/predictions/forecast", json={
        "dataset_id": dataset_id,
        "target_column": "revenue",
        "date_column": "order_date",
        "periods": 6,
        "model_algorithm": "linear"
    })
    assert forecast_res.status_code == 200
    fdata = forecast_res.json()
    assert len(fdata["forecast_points"]) == 6
    assert "r2_score" in fdata["metrics"]
    assert fdata["chart_config"]["type"] == "line"

    # 2. Anomaly Detection
    anomaly_res = authenticated_client.post("/api/predictions/anomaly-detection", json={
        "dataset_id": dataset_id,
        "features": ["revenue", "units_sold"],
        "contamination": 0.05
    })
    assert anomaly_res.status_code == 200
    adata = anomaly_res.json()
    assert adata["anomalies_detected"] > 0
    assert adata["total_samples"] == 500

    # 3. Clustering
    clustering_res = authenticated_client.post("/api/predictions/clustering", json={
        "dataset_id": dataset_id,
        "features": ["unit_price", "units_sold", "revenue"],
        "n_clusters": 3
    })
    assert clustering_res.status_code == 200
    cdata = clustering_res.json()
    assert len(cdata["cluster_profiles"]) == 3
    assert "silhouette_score" in cdata
