from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.model import Document, Payment, Progress, Proposal, Stage
from pydantic_schema.request import ProposalCreate, ProposalUpdate
from pydantic_schema.response import ProposalResponse

router = APIRouter(prefix="/proposals", tags=["Proposals"])


@router.post(
    "/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED
)
def create_proposal(
    payload: ProposalCreate, db: Session = Depends(get_db)
) -> ProposalResponse:
    # Get dict with Python field names (not JSON aliases) to match SQLAlchemy model attributes
    # When JSON has "revised/negotiated", Pydantic maps it to revised_negotiated field
    # by_alias=False gives us the Python field names which match SQLAlchemy attributes
    try:
        # Try Pydantic v1 method
        data = payload.dict(exclude_unset=True, by_alias=False)
    except AttributeError:
        # Fallback for Pydantic v2
        data = payload.model_dump(exclude_unset=True, by_alias=False)
    
    # Explicitly ensure the aliased fields are included if they have values
    # Access the fields directly to ensure they're in the dict
    if payload.revised_negotiated is not None:
        data['revised_negotiated'] = payload.revised_negotiated
    if payload.revised_negotiated_quote_date is not None:
        data['revised_negotiated_quote_date'] = payload.revised_negotiated_quote_date
    if payload.revised_negotiated_quote_amount is not None:
        data['revised_negotiated_quote_amount'] = payload.revised_negotiated_quote_amount
    
    proposal = Proposal(**data)
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


@router.get("/", response_model=List[ProposalResponse])
def list_proposals(db: Session = Depends(get_db)) -> List[ProposalResponse]:
    return db.query(Proposal).all()


@router.get("/{proposal_id}", response_model=ProposalResponse)
def get_proposal(
    proposal_id: int, db: Session = Depends(get_db)
) -> ProposalResponse:
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )
    return proposal


@router.put("/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: int,
    payload: ProposalUpdate,
    db: Session = Depends(get_db),
) -> ProposalResponse:
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    # Get dict with Python field names (not JSON aliases) to match SQLAlchemy model attributes
    try:
        update_data = payload.dict(exclude_unset=True, by_alias=False)
    except AttributeError:
        # Fallback for Pydantic v2
        update_data = payload.model_dump(exclude_unset=True, by_alias=False)
    
    # Explicitly ensure the aliased fields are included if they have values
    if payload.revised_negotiated is not None:
        update_data['revised_negotiated'] = payload.revised_negotiated
    if payload.revised_negotiated_quote_date is not None:
        update_data['revised_negotiated_quote_date'] = payload.revised_negotiated_quote_date
    if payload.revised_negotiated_quote_amount is not None:
        update_data['revised_negotiated_quote_amount'] = payload.revised_negotiated_quote_amount
    
    for key, value in update_data.items():
        setattr(proposal, key, value)

    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


@router.delete(
    "/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
def delete_proposal(proposal_id: int, db: Session = Depends(get_db)) -> None:
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    db.delete(proposal)
    db.commit()


def _serialize_with_stage_name(
    items: List[Any], stage_map: Dict[int, Optional[str]]
) -> List[Dict[str, Any]]:
    serialized = []
    for item in items:
        data = {
            key: value
            for key, value in item.__dict__.items()
            if not key.startswith("_") and key != "stage_id"
        }
        data["stage_name"] = stage_map.get(item.stage_id)
        serialized.append(data)
    return serialized


@router.get("/project_stages/{proposal_id}")
def project_stages(
    proposal_id: int, db: Session = Depends(get_db)
) -> dict[str, list[dict[str, object]]]:
    proposal_exists = (
        db.query(Proposal.id).filter(Proposal.id == proposal_id).first() is not None
    )
    if not proposal_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Proposal id not exists"
        )

    documents = db.query(Document).filter(Document.project_id == proposal_id).all()
    payments = db.query(Payment).filter(Payment.project_id == proposal_id).all()
    progress_entries = (
        db.query(Progress).filter(Progress.project_id == proposal_id).all()
    )

    stage_ids = {
        item.stage_id
        for collection in (documents, payments, progress_entries)
        for item in collection
        if item.stage_id is not None
    }
    stage_map = (
        {
            stage.id: stage.name
            for stage in db.query(Stage).filter(Stage.id.in_(stage_ids)).all()
        }
        if stage_ids
        else {}
    )

    return {
        "documents": _serialize_with_stage_name(documents, stage_map),
        "payments": _serialize_with_stage_name(payments, stage_map),
        "progress": _serialize_with_stage_name(progress_entries, stage_map),
    }


@router.get("/stage_wise/{proposal_id}")
def stage_wise_details(
    proposal_id: int, db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    proposal_exists = (
        db.query(Proposal.id).filter(Proposal.id == proposal_id).first() is not None
    )
    if not proposal_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Proposal id not exists"
        )

    stages = db.query(Stage).order_by(Stage.id).all()
    if not stages:
        return []

    documents = db.query(Document).filter(Document.project_id == proposal_id).all()
    payments = db.query(Payment).filter(Payment.project_id == proposal_id).all()
    progress_entries = (
        db.query(Progress).filter(Progress.project_id == proposal_id).all()
    )

    def group_by_stage(items: List[Any]) -> Dict[Optional[int], List[Any]]:
        grouped: Dict[Optional[int], List[Any]] = {}
        for item in items:
            grouped.setdefault(item.stage_id, []).append(item)
        return grouped

    documents_by_stage = group_by_stage(documents)
    payments_by_stage = group_by_stage(payments)
    progress_by_stage = group_by_stage(progress_entries)

    stage_map = {stage.id: stage.name for stage in stages}

    response: List[Dict[str, Any]] = []
    for stage in stages:
        stage_id = stage.id
        response.append(
            {
                "stage_id": stage_id,
                "stage_name": stage.name,
                "documents": _serialize_with_stage_name(
                    documents_by_stage.get(stage_id, []), stage_map
                ),
                "payments": _serialize_with_stage_name(
                    payments_by_stage.get(stage_id, []), stage_map
                ),
                "progress": _serialize_with_stage_name(
                    progress_by_stage.get(stage_id, []), stage_map
                ),
            }
        )

    return response

