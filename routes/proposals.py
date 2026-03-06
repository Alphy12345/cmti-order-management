from typing import Any, Dict, List, Optional
 
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func , desc , or_

from db import get_db
from models.model import Document, Payment, Progress, Proposal, Stage , MasterProposal
from pydantic_schema.request import (
    ProposalCreate,
    ProposalUpdate,
    CoordinatorUpdate,
    ProposalCoordinatorCreate , 
    AcknowledgeUpdate
)
from typing import List as ListType
from fastapi.encoders import jsonable_encoder
from pydantic_schema.response import ProposalResponse
from typing import List as ListType
from services.notification import create_notification
from datetime import date
import re

def sanitize_amount(val):
    """
    Sanitize amount values from Excel import.
    Handles Excel date corruption (e.g., 802750 stored as '4097-11-05').
    """
    if val is None or str(val).strip() in ['', '-', '--', 'nan', 'None']:
        return None
    s = str(val).strip().replace(',', '')
    # Fix Excel date corruption (e.g. 802750 stored as 4097-11-05)
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        try:
            d = date.fromisoformat(s)
            return (d - date(1899, 12, 29)).days
        except:
            return None
    try:
        return float(s)
    except:
        return None


router = APIRouter(prefix="/proposals", tags=["Proposals"])


@router.get("/live-export")
def live_export_proposals(
    db: Session = Depends(get_db),
):
    proposals = (
        db.query(Proposal)
        .filter(Proposal.is_acknowledged == True)
        .order_by(desc(Proposal.id))
        .all()
    )

    proposal_columns = [c.name for c in Proposal.__table__.columns]

    def _proposal_label(column_name: str) -> str:
        return column_name.replace('_', ' ').title()

    def _to_str(value: Any) -> str:
        if value is None:
            return ""
        return str(value)

    result: List[Dict[str, Any]] = []
    for proposal in proposals:
        payments = (
            db.query(Payment)
            .filter(Payment.project_id == proposal.id)
            .order_by(Payment.id)
            .all()
        )

        row: Dict[str, Any] = {}
        for col in proposal_columns:
            row[_proposal_label(col)] = _to_str(getattr(proposal, col, None))

        for i, pay in enumerate(payments, 1):
            row[f"Inv {i} Inv#"] = _to_str(pay.invoice_no)
            row[f"Inv {i} Inv Date"] = _to_str(pay.invoice_date)
            row[f"Inv {i} Gross"] = _to_str(pay.gross_amount)
            row[f"Inv {i} GST Amt"] = _to_str(pay.get_amount)
            row[f"Inv {i} Amt Claimed"] = _to_str(pay.amount_claimed)
            row[f"Inv {i} Amt Recd"] = _to_str(pay.amount_recieved)
            row[f"Inv {i} Recd Date"] = _to_str(pay.recieved_date)
            row[f"Inv {i} TDS"] = _to_str(pay.tds)
            row[f"Inv {i} GST TDS"] = _to_str(pay.get_tds)
            row[f"Inv {i} LD"] = _to_str(pay.ld)
            row[f"Inv {i} Balance"] = _to_str(pay.bal)
            row[f"Inv {i} Status"] = _to_str(pay.follow_up_status)

        result.append(row)

    return JSONResponse(content=jsonable_encoder(result))


# ------------------------------
# CREATE PROPOSAL
# ------------------------------
@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
def create_proposal(payload: ProposalCreate, db: Session = Depends(get_db)) -> ProposalResponse:

    try:
        data = payload.dict(exclude_unset=True, by_alias=False)
    except AttributeError:
        data = payload.model_dump(exclude_unset=True, by_alias=False)

    data["is_acknowledged"] = True

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

    master_proposal_data = {
        "quote_date": proposal.quote_date,
        "customer_name": proposal.customer_name,
        "description": proposal.quote_description,
        "quote_amt": proposal.quote_amount,
        "reference": proposal.email_reference,
        "quotation_ref": proposal.quote_reference,
        "indentor": proposal.quotation_given_by_name,
        "department": proposal.quotation_given_by_department,
        "contact_details": proposal.email
    }
    
    master_proposal = MasterProposal(**master_proposal_data)
    db.add(master_proposal)
    db.commit()

    create_notification(
    db=db,
    user_name="admin",
    message=f"New proposal created: {proposal.customer_name} , {proposal.quote_description}",
    proposal_id=proposal.id,
    trigerred_by = "admin"
)

    return proposal


# ------------------------------
# LIST ALL PROPOSALS
# ------------------------------
@router.get("/")
def list_proposals(
    db: Session = Depends(get_db),
    date_field: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[ProposalResponse]:
    query = db.query(Proposal).filter(Proposal.is_acknowledged == True)
    
    # Apply date range filter if provided
    if date_field and start_date and end_date:
        # Map frontend field names to database column names
        column_map = {
            'enquiry_date': Proposal.enquiry_date,
            'quote_date': Proposal.quote_date,
            'revised_negotiated_quote_date': Proposal.revised_negotiated_quote_date,
            'order_date': Proposal.order_date,
            'delivery_date': Proposal.delivery_date,
            'extended_delivery_date': Proposal.extended_delivery_date,
            'date_of_actual_commencement': Proposal.date_of_actual_commencement,
            'dispatch_date': Proposal.dispatch_date,
            'technical_completed_year': Proposal.technical_completed_year,
            'financial_completed_year': Proposal.financial_completed_year,
            'details_of_external_internal_review_meeting': Proposal.details_of_external_internal_review_meeting,
            'created_at': Proposal.created_at,
            'updated_at': Proposal.updated_at,
        }
        
        if date_field in column_map:
            column = column_map[date_field]
            query = query.filter(
                column >= start_date,
                column <= end_date
            )
    
    proposals = query.order_by(desc(Proposal.id)).all()
    
    # Build result with payments for each proposal
    result = []
    for proposal in proposals:
        # Serialize proposal data
        proposal_data = {
            key: value
            for key, value in proposal.__dict__.items()
            if not key.startswith("_")
        }
        
        # Get all payments for this proposal (linked via project_id)
        payments = db.query(Payment).filter(
            Payment.project_id == proposal.id
        ).all()
        
        # Serialize payments data
        payments_data = []
        for payment in payments:
            payment_dict = {
                key: value
                for key, value in payment.__dict__.items()
                if not key.startswith("_")
            }
            payments_data.append(payment_dict)
        
        # Combine proposal with its payments
        proposal_data["payments"] = payments_data
        result.append(proposal_data)
    
    return result

@router.get("/false", response_model=List[ProposalResponse])
def list_proposals(db: Session = Depends(get_db)) -> List[ProposalResponse]:
    return db.query(Proposal).filter(Proposal.is_acknowledged == None).order_by(desc(Proposal.id)).all()


@router.get("/payments")
def get_proposals_with_payments(db: Session = Depends(get_db)):
    """
    Get all proposals with their associated payments.
    
    Returns:
        List of proposals with their payment details
    """
    proposals = db.query(Proposal).all()
    
    result = []
    for proposal in proposals:
        # Get all payments for this proposal
        payments = db.query(Payment).filter(
            Payment.project_id == proposal.id
        ).all()
        
        # Serialize proposal data
        proposal_data = {
            key: value
            for key, value in proposal.__dict__.items()
            if not key.startswith("_")
        }
        
        # Serialize payments data
        payments_data = []
        for payment in payments:
            payment_dict = {
                key: value
                for key, value in payment.__dict__.items()
                if not key.startswith("_")
            }
            
            # Add stage name if stage_id exists
            if payment.stage_id:
                stage = db.query(Stage).filter(Stage.id == payment.stage_id).first()
                payment_dict["stage_name"] = stage.name if stage else None
            else:
                payment_dict["stage_name"] = None
                
            payments_data.append(payment_dict)
        
        # Combine proposal with its payments
        proposal_data["payments"] = payments_data
        result.append(proposal_data)
    
    return result


# ------------------------------
# GET PROPOSALS BY NAME
# ------------------------------
@router.get("/by-name/{name}", response_model=List[ProposalResponse])
def get_proposals_by_name(name: str, db: Session = Depends(get_db)):

    name_lower = name.lower()

    proposals = (
        db.query(Proposal)
        .filter(
            or_(
                func.lower(Proposal.quotation_given_by_name) == name_lower,
                func.lower(Proposal.project_co_ordinator) == name_lower
            ) , Proposal.is_acknowledged == True
        )
        .distinct(Proposal.id)   # ensure unique results by ID
        .all()
    )

    if not proposals:
        raise HTTPException(
            status_code=404,
            detail=f"No proposals found for '{name}' in quotation_given_by_name OR project_co_ordinator"
        )

    # Serialize proposals with payments data
    result = []
    for proposal in proposals:
        # Serialize proposal data
        proposal_data = {
            key: value
            for key, value in proposal.__dict__.items()
            if not key.startswith("_")
        }
        
        # Get all payments for this proposal
        payments = db.query(Payment).filter(
            Payment.project_id == proposal.id
        ).all()
        
        # Serialize payments data
        payments_data = []
        for payment in payments:
            payment_dict = {
                key: value
                for key, value in payment.__dict__.items()
                if not key.startswith("_")
            }
            
            # Add stage name if stage_id exists
            if payment.stage_id:
                stage = db.query(Stage).filter(Stage.id == payment.stage_id).first()
                payment_dict["stage_name"] = stage.name if stage else None
            else:
                payment_dict["stage_name"] = None
                
            payments_data.append(payment_dict)
        
        # Combine proposal with its payments
        proposal_data["payments"] = payments_data
        result.append(proposal_data)
    
    return result



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

    create_notification(
    db=db,
    user_name="admin",
    message=f"Proposal ID {proposal.id} updated",
    proposal_id=proposal.id,
    trigerred_by = "admin"
)
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

    create_notification(
    db=db,
    user_name=payload.updated_by,
    message=f"Coordinator updated proposal ID {proposal.id}",
    proposal_id=proposal.id,
    trigerred_by= "Coordinator"
)

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
# BULK CREATE PROPOSALS (Excel Import with Sanitization)
# ------------------------------
@router.post("/bulk", response_model=List[ProposalResponse], status_code=status.HTTP_201_CREATED)
def bulk_create_proposals(
    proposals: ListType[Dict[str, Any]], 
    db: Session = Depends(get_db)
) -> List[ProposalResponse]:
    """
    Create multiple proposals from Excel import with amount sanitization.
    Handles Excel date corruption in amount fields.
    
    Args:
        proposals: List of proposal data dictionaries from Excel
        db: Database session
        
    Returns:
        List of created proposals with their IDs
    """
    created_proposals = []
    
    for row in proposals:
        # Support both Excel headers with slashes and API-style snake_case keys
        # Normalize keys for revised/negotiated fields
        revised_flag = row.get("revised_negotiated", row.get("revised/negotiated"))
        revised_date = row.get(
            "revised_negotiated_quote_date",
            row.get("revised/negotiated_quote_date"),
        )
        revised_amount_raw = row.get(
            "revised_negotiated_quote_amount",
            row.get("revised/negotiated_quote_amount"),
        )

        # Sanitize amount fields before creating proposal
        quote_amount = sanitize_amount(row.get("quote_amount"))
        revised_quote_amount = sanitize_amount(revised_amount_raw)
        order_value = sanitize_amount(row.get("order_value"))
        
        # Build proposal data from row, excluding fields we normalize separately
        data = {
            k: v
            for k, v in row.items()
            if k
            not in [
                "quote_amount",
                "order_value",
                "revised_negotiated",
                "revised/negotiated",
                "revised_negotiated_quote_date",
                "revised/negotiated_quote_date",
                "revised_negotiated_quote_amount",
                "revised/negotiated_quote_amount",
            ]
        }
        
        # Add sanitized amounts (convert to string for DB storage)
        if quote_amount is not None:
            data["quote_amount"] = str(quote_amount)
        if revised_quote_amount is not None:
            data["revised_negotiated_quote_amount"] = str(revised_quote_amount)
        if order_value is not None:
            data["order_value"] = str(order_value)
        
        # Handle revised_negotiated fields if present
        if revised_flag is not None:
            data["revised_negotiated"] = revised_flag
        if revised_date is not None:
            data["revised_negotiated_quote_date"] = revised_date
        
        # Handle status field from Excel (case-insensitive)
        status_value = row.get("status") or row.get("Status")
        if status_value is not None:
            data["status"] = str(status_value).strip() if status_value else None
            
        # Set acknowledged flag for bulk imports
        data["is_acknowledged"] = True
        
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
        func.lower(Proposal.center) == centre.lower() , Proposal.is_acknowledged == True
    ).all()

    if not proposals:
        raise HTTPException(
            status_code=404,
            detail=f"No proposals found for centre = '{centre}'"
        )

    # Serialize proposals with payments data
    result = []
    for proposal in proposals:
        # Serialize proposal data
        proposal_data = {
            key: value
            for key, value in proposal.__dict__.items()
            if not key.startswith("_")
        }
        
        # Get all payments for this proposal
        payments = db.query(Payment).filter(
            Payment.project_id == proposal.id
        ).all()
        
        # Serialize payments data
        payments_data = []
        for payment in payments:
            payment_dict = {
                key: value
                for key, value in payment.__dict__.items()
                if not key.startswith("_")
            }
            
            # Add stage name if stage_id exists
            if payment.stage_id:
                stage = db.query(Stage).filter(Stage.id == payment.stage_id).first()
                payment_dict["stage_name"] = stage.name if stage else None
            else:
                payment_dict["stage_name"] = None
                
            payments_data.append(payment_dict)
        
        # Combine proposal with its payments
        proposal_data["payments"] = payments_data
        result.append(proposal_data)
    
    return result



@router.get("/payments/{proposal_id}")
def get_proposal_with_payments(proposal_id: int, db: Session = Depends(get_db)):
    """
    Get a single proposal with its associated payments.
    
    Args:
        proposal_id: The proposal ID
        db: Database session
        
    Returns:
        Proposal with payment details
    """
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Get all payments for this proposal
    payments = db.query(Payment).filter(
        Payment.project_id == proposal_id
    ).all()
    
    # Serialize proposal data
    proposal_data = {
        key: value
        for key, value in proposal.__dict__.items()
        if not key.startswith("_")
    }
    
    # Serialize payments data
    payments_data = []
    for payment in payments:
        payment_dict = {
            key: value
            for key, value in payment.__dict__.items()
            if not key.startswith("_")
        }
        
        # Add stage name if stage_id exists
        if payment.stage_id:
            stage = db.query(Stage).filter(Stage.id == payment.stage_id).first()
            payment_dict["stage_name"] = stage.name if stage else None
        else:
            payment_dict["stage_name"] = None
            
        payments_data.append(payment_dict)
    
    # Combine proposal with its payments
    proposal_data["payments"] = payments_data
    
    return proposal_data


@router.post("/add-proposal-coordinator", status_code=status.HTTP_201_CREATED)
def add_proposal_coordinator(
    payload: ProposalCoordinatorCreate,
    db: Session = Depends(get_db)
):
    try:
        data = payload.dict(exclude_unset=True)
    except AttributeError:
        data = payload.model_dump(exclude_unset=True)

    # Create Proposal
    proposal = Proposal(**data)
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    # ------------------------------------------
    # Optional: Send Notification
    # ------------------------------------------
    create_notification(
        db=db,
        user_name=proposal.quotation_given_by_name,
        message=f"Coordinator created proposal for {proposal.customer_name}",
        proposal_id=proposal.id,
        trigerred_by="Coordinator"
    )

    return {
        "message": "Proposal created successfully by coordinator",
        "proposal_id": proposal.id,
        "data": data
    }


@router.put("/acknowledge/{proposal_id}")
def update_acknowledgement(
    proposal_id: int,
    payload: AcknowledgeUpdate,
    db: Session = Depends(get_db)
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Update only acknowledgement
    proposal.is_acknowledged = payload.is_acknowledged
    db.commit()
    db.refresh(proposal)

    # Create notification
    status_text = "Accepted" if payload.is_acknowledged else "Rejected"
    create_notification(
        db=db,
        user_name="admin",
        message=f"Proposal {proposal.customer_name} - {proposal.quote_description} marked as {status_text}",
        proposal_id=proposal.id,
        trigerred_by="admin"
    )

    # If acknowledged, insert into master proposals
    if payload.is_acknowledged:
        master_proposal_data = {
            "quote_date": proposal.quote_date,
            "customer_name": proposal.customer_name,
            "description": proposal.quote_description,
            "quote_amt": proposal.quote_amount,
            "reference": proposal.email_reference,
            "quotation_ref": proposal.quote_reference,
            "indentor": proposal.quotation_given_by_name,
            "department": proposal.quotation_given_by_department,
            "contact_details": proposal.email
        }

        master_proposal = MasterProposal(**master_proposal_data)
        db.add(master_proposal)
        db.commit()

    return {
        "message": "Acknowledgement updated successfully",
        "proposal_id": proposal.id,
        "is_acknowledged": proposal.is_acknowledged
    }

    
