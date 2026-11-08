import os


def test_dataset_upload_and_preview(authenticated_client):
    csv_path = "sample_datasets/sales_data.csv"
    with open(csv_path, "rb") as f:
        response = authenticated_client.post(
            "/api/datasets/upload",
            files={"file": ("sales_data.csv", f, "text/csv")}
        )
    assert response.status_code == 201
    data = response.json()
    dataset_id = data["id"]
    assert data["row_count"] == 500
    assert data["column_count"] > 5
    assert len(data["columns"]) > 5

    # Preview
    preview_res = authenticated_client.get(f"/api/datasets/{dataset_id}/preview")
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert len(pdata["rows"]) == 100
    assert "revenue" in pdata["columns"]

    # Profile
    profile_res = authenticated_client.get(f"/api/datasets/{dataset_id}/profile")
    assert profile_res.status_code == 200
    prof = profile_res.json()
    assert "metadata_profile" in prof


def test_invalid_file_extension(authenticated_client):
    fake_content = b"random executable bytes"
    res = authenticated_client.post(
        "/api/datasets/upload",
        files={"file": ("malicious.exe", fake_content, "application/octet-stream")}
    )
    assert res.status_code == 400
