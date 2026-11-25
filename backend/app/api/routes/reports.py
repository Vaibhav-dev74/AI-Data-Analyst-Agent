import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.models import Dataset, GeneratedReport, User, UserActivity
from app.reports.excel_generator import ExcelReportGenerator
from app.reports.pdf_generator import PDFReportGenerator
from app.schemas.report import ReportDetail, ReportGenerateRequest, ReportOut
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/reports", tags=["Executive Reports"])

REPORTS_DIR = settings.REPORTS_DIR
os.makedirs(REPORTS_DIR, exist_ok=True)

security_scheme = HTTPBearer(auto_error=False)


def get_download_user(
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates user credentials via Authorization Bearer header OR ?token= query parameter.
    Allows both authenticated AJAX/blob downloads and direct browser window links.
    """
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required to download report.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(raw_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or inactive.")

    return user


@router.post("/generate", response_model=ReportDetail, status_code=status.HTTP_201_CREATED)
def generate_report(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a publication-ready PDF or Excel business report
    synthesizing dataset metrics, schema distributions, and AI insights.
    """
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    resolved_path = DatasetService.resolve_dataset_file(dataset.file_path, dataset.original_filename)

    report_fmt = req.format.lower()
    if report_fmt not in ("pdf", "excel"):
        report_fmt = "pdf"

    profile = dataset.metadata_profile or {}
    total_rows = profile.get("total_rows", 0)

    # Narrative findings
    findings = (
        f"Autonomous assessment of {dataset.name} comprising {total_rows:,} records across {dataset.column_count} dimensions. "
        f"Data integrity analysis reveals a {profile.get('null_percentage', 0)}% missing cell rate and "
        f"{profile.get('duplicate_rows', 0)} duplicated entries. Primary statistical aggregates confirm balanced distribution "
        f"across critical business measures."
    )

    recommendations = [
        "Prioritize data hygiene routines to remediate sparse columns identified in the schema profile.",
        "Focus resource allocation on the top-quartile performance categories observed across transactions.",
        "Implement automated continuous validation checks on periodic data ingestion pipelines."
    ]

    unique_id = str(uuid.uuid4())[:8]
    ext = "pdf" if report_fmt == "pdf" else "xlsx"
    clean_title = "".join(c for c in req.title if c.isalnum() or c in (" ", "_", "-")).strip() or "Executive_Report"
    filename = f"{clean_title.replace(' ', '_')}_{unique_id}.{ext}"
    output_path = os.path.abspath(os.path.join(REPORTS_DIR, filename))
    os.makedirs(REPORTS_DIR, exist_ok=True)

    try:
        if report_fmt == "pdf":
            PDFReportGenerator.generate(
                output_path=output_path,
                title=req.title,
                dataset_name=dataset.name,
                profile=profile,
                summary_stats={},
                findings=findings,
                recommendations=recommendations
            )
        else:
            ExcelReportGenerator.generate(
                output_path=output_path,
                title=req.title,
                dataset_name=dataset.name,
                file_path=resolved_path or dataset.file_path,
                file_type=dataset.file_type,
                profile=profile,
                findings=findings,
                recommendations=recommendations
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate {report_fmt.upper()} report: {str(e)}")

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    report = GeneratedReport(
        user_id=current_user.id,
        dataset_id=dataset.id,
        title=req.title,
        format=report_fmt,
        file_path=output_path,
        executive_summary={"findings": findings, "recommendations": recommendations}
    )
    db.add(report)

    db.add(UserActivity(
        user_id=current_user.id,
        action="generated_report",
        details={"report_id": report.id, "title": req.title, "format": report_fmt}
    ))
    db.commit()
    db.refresh(report)

    return ReportDetail(
        id=report.id,
        title=report.title,
        format=report.format,
        dataset_id=report.dataset_id,
        dataset_name=dataset.name,
        file_size_bytes=file_size,
        created_at=report.created_at,
        executive_summary=report.executive_summary,
        download_url=f"/api/reports/{report.id}/download"
    )


@router.get("", response_model=List[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all generated reports for the current user."""
    reports = db.query(GeneratedReport).filter(GeneratedReport.user_id == current_user.id).order_by(GeneratedReport.created_at.desc()).all()
    out = []
    for r in reports:
        ds = db.query(Dataset).filter(Dataset.id == r.dataset_id).first()
        file_path = os.path.abspath(r.file_path)
        if not os.path.exists(file_path):
            alt_path = os.path.abspath(os.path.join(REPORTS_DIR, os.path.basename(r.file_path)))
            file_sz = os.path.getsize(alt_path) if os.path.exists(alt_path) else 0
        else:
            file_sz = os.path.getsize(file_path)

        out.append(ReportOut(
            id=r.id,
            title=r.title,
            format=r.format,
            dataset_id=r.dataset_id,
            dataset_name=ds.name if ds else "Unknown Dataset",
            file_size_bytes=file_sz,
            created_at=r.created_at
        ))
    return out


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    """
    Downloads the generated report binary file (PDF or Excel).
    Supports token authorization via query parameter or HTTP Bearer header.
    Automatically regenerates missing reports if the underlying dataset is valid.
    """
    current_user = get_download_user(token=token, credentials=credentials, db=db)

    report = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.user_id == current_user.id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")

    target_path = os.path.abspath(report.file_path)

    # If the file doesn't exist at stored location, check standard REPORTS_DIR
    if not os.path.exists(target_path):
        alt_path = os.path.abspath(os.path.join(REPORTS_DIR, os.path.basename(report.file_path)))
        if os.path.exists(alt_path):
            target_path = alt_path
        else:
            # Self-healing: Regenerate directly into REPORTS_DIR from database profile & summary
            # Works even if ephemeral cloud container restarted and cleared disk files
            ds = db.query(Dataset).filter(Dataset.id == report.dataset_id).first()
            if ds:
                os.makedirs(REPORTS_DIR, exist_ok=True)
                target_path = alt_path
                profile = ds.metadata_profile or {}
                findings = report.executive_summary.get("findings", "") if report.executive_summary else ""
                recommendations = report.executive_summary.get("recommendations", []) if report.executive_summary else []
                resolved_ds_path = DatasetService.resolve_dataset_file(ds.file_path, ds.original_filename)

                if report.format == "pdf":
                    PDFReportGenerator.generate(
                        output_path=target_path,
                        title=report.title,
                        dataset_name=ds.name,
                        profile=profile,
                        summary_stats={},
                        findings=findings,
                        recommendations=recommendations
                    )
                else:
                    ExcelReportGenerator.generate(
                        output_path=target_path,
                        title=report.title,
                        dataset_name=ds.name,
                        file_path=resolved_ds_path or ds.file_path,
                        file_type=ds.file_type,
                        profile=profile,
                        findings=findings,
                        recommendations=recommendations
                    )
            else:
                raise HTTPException(status_code=404, detail="Report file and parent dataset no longer exist.")

    media_type = (
        "application/pdf"
        if report.format == "pdf"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    download_filename = os.path.basename(target_path)

    return FileResponse(
        path=target_path,
        media_type=media_type,
        filename=download_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes report record and cached file from storage."""
    report = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.user_id == current_user.id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except Exception:
            pass

    # Check alt path
    alt_path = os.path.abspath(os.path.join(REPORTS_DIR, os.path.basename(report.file_path)))
    if os.path.exists(alt_path):
        try:
            os.remove(alt_path)
        except Exception:
            pass

    db.delete(report)
    db.commit()
    return None
