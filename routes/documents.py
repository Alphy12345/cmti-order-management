from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from db import get_db
from models.model import Document, Proposal, Stage
from pydantic_schema.response import DocumentResponse
from services.minio_client import (
    delete_file_from_minio,
    extract_object_name_from_url,
    upload_file_to_minio,
)

router = APIRouter(prefix="/documents", tags=["Documents"])


def _ensure_related_entities(
    db: Session, project_id: Optional[int], stage_id: Optional[int]
) -> None:
    if project_id is not None:
        exists = db.query(Proposal.id).filter(Proposal.id == project_id).first()
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {project_id} not found",
            )
    if stage_id is not None:
        exists = db.query(Stage.id).filter(Stage.id == stage_id).first()
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stage with id {stage_id} not found",
            )


@router.post(
    "/",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    project_id: Optional[int] = Form(None),
    stage_id: Optional[int] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    _ensure_related_entities(db, project_id, stage_id)

    _, url = await upload_file_to_minio(file)

    document = Document(
        name=name,
        description=description,
        project_id=project_id,
        stage_id=stage_id,
        uploaded_by=uploaded_by,
        url=url,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("/", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)) -> List[DocumentResponse]:
    return db.query(Document).all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int, db: Session = Depends(get_db)
) -> DocumentResponse:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    project_id: Optional[int] = Form(None),
    stage_id: Optional[int] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    _ensure_related_entities(db, project_id, stage_id)

    if name is not None:
        document.name = name
    if description is not None:
        document.description = description
    if project_id is not None:
        document.project_id = project_id
    if stage_id is not None:
        document.stage_id = stage_id
    if uploaded_by is not None:
        document.uploaded_by = uploaded_by

    if file is not None:
        old_object_name = extract_object_name_from_url(document.url)
        if old_object_name:
            delete_file_from_minio(old_object_name)
        _, url = await upload_file_to_minio(file)
        document.url = url

    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int, db: Session = Depends(get_db)
) -> None:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    object_name = extract_object_name_from_url(document.url)
    if object_name:
        delete_file_from_minio(object_name)

    db.delete(document)
    db.commit()

