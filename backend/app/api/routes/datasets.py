import os
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Dataset, DatasetColumn, User, UserActivity
from app.schemas.dataset import CleanDataRequest, DatasetDetail, DatasetPreview, DatasetSummary
from app.services.cleaning_service import CleaningService
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=DatasetDetail, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts CSV, XLSX, and XLS uploads, validates format and limits,
    profiles the dataset, persists column metadata, and registers for analytics.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing from upload.")

    content = await file.read()
    file_size = len(content)

    try:
        file_type = DatasetService.validate_file(file.filename, file_size)
        file_path = DatasetService.save_upload_file(content, file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist file: {str(e)}")

    # Profile dataset
    try:
        _, metadata_profile, columns_profile = DatasetService.profile_dataset(file_path, file_type)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=422, detail=f"Failed to parse and profile dataset: {str(e)}")

    clean_name = os.path.splitext(file.filename)[0].replace("_", " ").title()

    dataset = Dataset(
        user_id=current_user.id,
        name=clean_name,
        original_filename=file.filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        row_count=metadata_profile["total_rows"],
        column_count=metadata_profile["total_columns"],
        status="ready",
        metadata_profile=metadata_profile
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Persist column profiles
    for col_data in columns_profile:
        col = DatasetColumn(
            dataset_id=dataset.id,
            column_name=col_data["column_name"],
            data_type=col_data["data_type"],
            null_count=col_data["null_count"],
            unique_count=col_data["unique_count"],
            sample_values=col_data["sample_values"],
            statistics=col_data["statistics"]
        )
        db.add(col)

    # Log activity
    db.add(UserActivity(
        user_id=current_user.id,
        action="dataset_uploaded",
        details={"dataset_id": dataset.id, "name": dataset.name, "rows": dataset.row_count}
    ))
    db.commit()
    db.refresh(dataset)

    return DatasetDetail.model_validate(dataset)


@router.get("", response_model=List[DatasetSummary])
def list_user_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all datasets owned by the authenticated user."""
    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).order_by(Dataset.created_at.desc()).all()
    return [DatasetSummary.model_validate(d) for d in datasets]


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves complete metadata and column profiles for a specific dataset."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access unauthorized.")
    return DatasetDetail.model_validate(dataset)


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def get_dataset_preview(
    dataset_id: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves sample tabular records for table exploration."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access unauthorized.")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Underlying dataset file could not be found.")

    try:
        preview = DatasetService.get_preview(dataset.file_path, dataset.file_type, limit=limit)
        return DatasetPreview(
            id=dataset.id,
            name=dataset.name,
            total_rows=dataset.row_count,
            total_columns=dataset.column_count,
            columns=preview["columns"],
            rows=preview["rows"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


@router.get("/{dataset_id}/profile")
def get_dataset_profile(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns dataset summary statistics and column distribution profiles."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access unauthorized.")

    columns = db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).all()

    return {
        "id": dataset.id,
        "name": dataset.name,
        "metadata_profile": dataset.metadata_profile,
        "columns": [
            {
                "name": c.column_name,
                "type": c.data_type,
                "null_count": c.null_count,
                "unique_count": c.unique_count,
                "sample_values": c.sample_values,
                "statistics": c.statistics
            }
            for c in columns
        ]
    }


@router.post("/{dataset_id}/clean", response_model=DatasetDetail)
def clean_dataset(
    dataset_id: str,
    req: CleanDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Executes data cleaning operations: deduplication, null imputation, column dropping."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access unauthorized.")

    try:
        CleaningService.clean_dataset(
            file_path=dataset.file_path,
            file_type=dataset.file_type,
            remove_duplicates=req.remove_duplicates,
            fill_null_method=req.fill_null_method,
            drop_null_threshold=req.drop_null_threshold,
            columns_to_drop=req.columns_to_drop
        )

        # Re-profile updated dataset
        _, metadata_profile, columns_profile = DatasetService.profile_dataset(dataset.file_path, dataset.file_type)

        dataset.row_count = metadata_profile["total_rows"]
        dataset.column_count = metadata_profile["total_columns"]
        dataset.metadata_profile = metadata_profile
        dataset.file_size = os.path.getsize(dataset.file_path)

        # Refresh columns in DB
        db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).delete()
        for col_data in columns_profile:
            col = DatasetColumn(
                dataset_id=dataset.id,
                column_name=col_data["column_name"],
                data_type=col_data["data_type"],
                null_count=col_data["null_count"],
                unique_count=col_data["unique_count"],
                sample_values=col_data["sample_values"],
                statistics=col_data["statistics"]
            )
            db.add(col)

        db.commit()
        db.refresh(dataset)
        return DatasetDetail.model_validate(dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data cleaning failed: {str(e)}")


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes dataset record and underlying stored file."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access unauthorized.")

    if os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
        except Exception:
            pass

    db.delete(dataset)
    db.commit()
    return None
