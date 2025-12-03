from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from db import get_db
from models.model import Document, Payment, Progress, Proposal, Stage
from pydantic_schema.request import (
    ProposalCreate,
    ProposalUpdate,
    CoordinatorUpdate
)
from typing import List as ListType
from fastapi.encoders import jsonable_encoder
from pydantic_schema.response import ProposalResponse
from typing import List as ListType

router = APIRouter(prefix="/proposals", tags=["Proposals"])


# ------------------------------
# CREATE PROPOSAL
# ------------------------------
@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
def create_proposal(payload: ProposalCreate, db: Session = Depends(get_db)) -> ProposalResponse:

    try:
        data = payload.dict(exclude_unset=True, by_alias=False)
    except AttributeError:
        data = payload.model_dump(exclude_unset=True, by_alias=False)

    if getattr(payload, "revised_negotiated", None) is not None:
        data["revised_negotiated"] = payload.revised_negotiated
    if getattr(payload, "revised_negotiated_quote_date", None) is not None:
        data["revised_negotiated_quote_date"] = payload.revised_negotiated_quote_date
    if getattr(payload, "revised_negotiated_quote_amount", None) is not None:
        data["revised_negotiated_quote_amount"] = payload.revised_negotiated_quote_amount

    proposal = Proposal(**data)
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


# ------------------------------
# LIST ALL PROPOSALS
# ------------------------------
@router.get("/", response_model=List[ProposalResponse])
def list_proposals(db: Session = Depends(get_db)) -> List[ProposalResponse]:
    return db.query(Proposal).all()


# ------------------------------
# GET PROPOSALS BY NAME
# ------------------------------
@router.get("/by-name/{name}", response_model=List[ProposalResponse])
def get_proposals_by_name(name: str, db: Session = Depends(get_db)):

    proposals = db.query(Proposal).filter(
        func.lower(Proposal.project_co_ordinator) == name.lower()
    ).all()

    if not proposals:
        raise HTTPException(
            status_code=404,
            detail=f"No proposals found for project_co_ordinator = '{name}'"
        )

    return proposals


# ------------------------------
# GET SINGLE PROPOSAL
# ------------------------------
@router.get("/{proposal_id}", response_model=ProposalResponse)
def get_proposal(proposal_id: int, db: Session = Depends(get_db)) -> ProposalResponse:
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


# ------------------------------
# UPDATE PROPOSAL
# ------------------------------
@router.put("/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: int, payload: ProposalUpdate, db: Session = Depends(get_db)
) -> ProposalResponse:

    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    try:
        update_data = payload.dict(exclude_unset=True, by_alias=False)
    except AttributeError:
        update_data = payload.model_dump(exclude_unset=True, by_alias=False)

    if getattr(payload, "revised_negotiated", None) is not None:
        update_data["revised_negotiated"] = payload.revised_negotiated
    if getattr(payload, "revised_negotiated_quote_date", None) is not None:
        update_data["revised_negotiated_quote_date"] = payload.revised_negotiated_quote_date
    if getattr(payload, "revised_negotiated_quote_amount", None) is not None:
        update_data["revised_negotiated_quote_amount"] = payload.revised_negotiated_quote_amount

    for key, value in update_data.items():
        setattr(proposal, key, value)

    db.commit()
    db.refresh(proposal)
    return proposal


# ------------------------------
# DELETE PROPOSAL
# ------------------------------
@router.delete("/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proposal(proposal_id: int, db: Session = Depends(get_db)) -> None:

    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    db.delete(proposal)
    db.commit()


# ------------------------------
# NEW: COORDINATOR UPDATE ENDPOINT
# ------------------------------
@router.post("/coordinator-update")
def coordinator_update(payload: CoordinatorUpdate, db: Session = Depends(get_db)):

    proposal = db.query(Proposal).filter(Proposal.id == payload.project_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Project / Proposal not found")

    # Validate technical completed year → closure report must exist
    if payload.technical_completed_year:

        closure_doc = (
            db.query(Document)
            .filter(
                Document.project_id == payload.project_id,
                func.lower(Document.name) == "closure report"
            )
            .first()
        )

        has_flag = proposal.closer_report and proposal.closer_report.lower() == "yes"

        if not closure_doc and not has_flag:
            raise HTTPException(
                status_code=400,
                detail="Closure Report not uploaded. Upload closure report before entering technical completed year."
            )

    # Apply updates
    proposal.co_ordinator_remarks = payload.co_ordinator_remarks
    proposal.extended_delivery_date = payload.extended_delivery_date

    # ⭐ NEW FIELD HERE
    proposal.updated_by = payload.updated_by

    if payload.technical_completed_year:
        proposal.technical_completed_year = payload.technical_completed_year

    db.commit()
    db.refresh(proposal)

    return {
        "message": "Coordinator details updated successfully",
        "data": proposal
    }


# ------------------------------
# INTERNAL SERIALIZER
# ------------------------------
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


# ------------------------------
# PROJECT STAGES
# ------------------------------
@router.get("/project_stages/{proposal_id}")
def project_stages(proposal_id: int, db: Session = Depends(get_db)):

    proposal_exists = db.query(Proposal.id).filter(Proposal.id == proposal_id).first()
    if not proposal_exists:
        raise HTTPException(status_code=404, detail="Proposal id not exists")

    documents = db.query(Document).filter(Document.project_id == proposal_id).all()
    payments = db.query(Payment).filter(Payment.project_id == proposal_id).all()
    progress_entries = db.query(Progress).filter(Progress.project_id == proposal_id).all()

    stage_ids = {
        item.stage_id
        for collection in (documents, payments, progress_entries)
        for item in collection if item.stage_id is not None
    }

    stage_map = (
        {
            stage.id: stage.name
            for stage in db.query(Stage).filter(Stage.id.in_(stage_ids)).all()
        } if stage_ids else {}
    )

    return {
        "documents": _serialize_with_stage_name(documents, stage_map),
        "payments": _serialize_with_stage_name(payments, stage_map),
        "progress": _serialize_with_stage_name(progress_entries, stage_map),
    }


# ------------------------------
# STAGE WISE DETAILS
# ------------------------------
@router.get("/stage_wise/{proposal_id}")
def stage_wise_details(proposal_id: int, db: Session = Depends(get_db)):

    proposal_exists = db.query(Proposal.id).filter(Proposal.id == proposal_id).first()
    if not proposal_exists:
        raise HTTPException(status_code=404, detail="Proposal id not exists")

    stages = db.query(Stage).order_by(Stage.id).all()
    if not stages:
        return []

    documents = db.query(Document).filter(Document.project_id == proposal_id).all()
    payments = db.query(Payment).filter(Payment.project_id == proposal_id).all()
    progress_entries = db.query(Progress).filter(Progress.project_id == proposal_id).all()

    def group_by_stage(items: List[Any]) -> Dict[Optional[int], List[Any]]:
        grouped = {}
        for item in items:
            grouped.setdefault(item.stage_id, []).append(item)
        return grouped

    documents_by_stage = group_by_stage(documents)
    payments_by_stage = group_by_stage(payments)
    progress_by_stage = group_by_stage(progress_entries)

    stage_map = {stage.id: stage.name for stage in stages}

    response = []
    for stage in stages:
        stage_id = stage.id
        response.append(
            {
                "stage_id": stage_id,
                "stage_name": stage.name,
                "documents": _serialize_with_stage_name(documents_by_stage.get(stage_id, []), stage_map),
                "payments": _serialize_with_stage_name(payments_by_stage.get(stage_id, []), stage_map),
                "progress": _serialize_with_stage_name(progress_by_stage.get(stage_id, []), stage_map),
            }
        )

    return response


# ------------------------------
# BULK CREATE PROPOSALS
# ------------------------------
@router.post("/bulk", response_model=List[ProposalResponse], status_code=status.HTTP_201_CREATED)
def bulk_create_proposals(
    proposals: ListType[ProposalCreate], 
    db: Session = Depends(get_db)
) -> List[ProposalResponse]:
    """
    Create multiple proposals in a single request.
    
    Args:
        proposals: List of proposal data to create
        db: Database session
        
    Returns:
        List of created proposals with their IDs
    """
    created_proposals = []
    
    for proposal_data in proposals:
        try:
            data = proposal_data.dict(exclude_unset=True, by_alias=False)
        except AttributeError:
            data = proposal_data.model_dump(exclude_unset=True, by_alias=False)
            
        # Handle revised_negotiated fields if present
        if getattr(proposal_data, "revised_negotiated", None) is not None:
            data["revised_negotiated"] = proposal_data.revised_negotiated
        if getattr(proposal_data, "revised_negotiated_quote_date", None) is not None:
            data["revised_negotiated_quote_date"] = proposal_data.revised_negotiated_quote_date
        if getattr(proposal_data, "revised_negotiated_quote_amount", None) is not None:
            data["revised_negotiated_quote_amount"] = proposal_data.revised_negotiated_quote_amount
            
        proposal = Proposal(**data)
        db.add(proposal)
        created_proposals.append(proposal)
    
    db.commit()
    
    # Refresh all created proposals to get their database-generated fields
    for proposal in created_proposals:
        db.refresh(proposal)
    
    return created_proposals


# ------------------------------
# GET PROPOSALS BY CENTRE
# ------------------------------
@router.get("/by-centre/{centre}", response_model=List[ProposalResponse])
def get_proposals_by_centre(centre: str, db: Session = Depends(get_db)):
    """
    Get all proposals for a specific centre.
    
    Args:
        centre: The centre name to filter by
        db: Database session
        
    Returns:
        List of proposals for the specified centre
    """
    proposals = db.query(Proposal).filter(
        func.lower(Proposal.center) == centre.lower()
    ).all()

    if not proposals:
        raise HTTPException(
            status_code=404,
            detail=f"No proposals found for centre = '{centre}'"
        )

    return proposals
