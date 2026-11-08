import os


def test_pdf_and_excel_report_generation(authenticated_client):
    with open("sample_datasets/sales_data.csv", "rb") as f:
        upload_res = authenticated_client.post(
            "/api/datasets/upload",
            files={"file": ("sales_data.csv", f, "text/csv")}
        )
    dataset_id = upload_res.json()["id"]

    # 1. Generate PDF
    pdf_res = authenticated_client.post("/api/reports/generate", json={
        "dataset_id": dataset_id,
        "title": "Quarterly Sales Audit",
        "format": "pdf"
    })
    assert pdf_res.status_code == 201
    pdf_data = pdf_res.json()
    assert pdf_data["format"] == "pdf"
    assert pdf_data["file_size_bytes"] > 0

    # Download PDF
    dl_pdf = authenticated_client.get(f"/api/reports/{pdf_data['id']}/download")
    assert dl_pdf.status_code == 200
    assert dl_pdf.headers["content-type"] == "application/pdf"

    # 2. Generate Excel
    excel_res = authenticated_client.post("/api/reports/generate", json={
        "dataset_id": dataset_id,
        "title": "Quarterly Sales Audit Sheet",
        "format": "excel"
    })
    assert excel_res.status_code == 201
    excel_data = excel_res.json()
    assert excel_data["format"] == "excel"

    # Download Excel
    dl_excel = authenticated_client.get(f"/api/reports/{excel_data['id']}/download")
    assert dl_excel.status_code == 200
