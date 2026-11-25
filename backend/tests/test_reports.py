import os


def test_pdf_and_excel_report_generation(authenticated_client):
    token = authenticated_client.headers["Authorization"].split(" ")[1]

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

    # Download PDF via Bearer header
    dl_pdf = authenticated_client.get(f"/api/reports/{pdf_data['id']}/download")
    assert dl_pdf.status_code == 200
    assert dl_pdf.headers["content-type"] == "application/pdf"
    assert len(dl_pdf.content) > 500

    # Download PDF via token query param (browser direct download simulation)
    from fastapi.testclient import TestClient
    from app.main import app
    unauth_client = TestClient(app)
    dl_pdf_query = unauth_client.get(f"/api/reports/{pdf_data['id']}/download?token={token}")
    assert dl_pdf_query.status_code == 200
    assert dl_pdf_query.headers["content-type"] == "application/pdf"
    assert len(dl_pdf_query.content) > 500

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

    # 3. Verify self-healing PDF regeneration when both report and dataset disk files are wiped
    from app.core.database import get_db
    from app.models import Dataset, GeneratedReport
    db_gen = app.dependency_overrides[get_db]()
    db = next(db_gen)
    try:
        rep_row = db.query(GeneratedReport).filter(GeneratedReport.id == pdf_data["id"]).first()
        ds_row = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if rep_row and os.path.exists(rep_row.file_path):
            os.remove(rep_row.file_path)
        if ds_row and os.path.exists(ds_row.file_path):
            os.remove(ds_row.file_path)
    finally:
        db.close()

    # Re-downloading should transparently regenerate the PDF from Postgres metadata
    dl_regen = authenticated_client.get(f"/api/reports/{pdf_data['id']}/download")
    assert dl_regen.status_code == 200
    assert dl_regen.headers["content-type"] == "application/pdf"
    assert len(dl_regen.content) > 500
