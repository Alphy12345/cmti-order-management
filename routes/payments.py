from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.model import Payment
from pydantic_schema.request import PaymentCreate, PaymentUpdate
from pydantic_schema.response import PaymentResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post(
    "/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED
)
def create_payment(
    payload: PaymentCreate, db: Session = Depends(get_db)
) -> PaymentResponse:
    payment = Payment(**payload.dict(exclude_unset=True))
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/", response_model=List[PaymentResponse])
def list_payments(db: Session = Depends(get_db)) -> List[PaymentResponse]:
    return db.query(Payment).all()


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int, db: Session = Depends(get_db)
) -> PaymentResponse:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    return payment


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
) -> PaymentResponse:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(payment, key, value)

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.delete(
    "/{payment_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
def delete_payment(payment_id: int, db: Session = Depends(get_db)) -> None:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    db.delete(payment)
    db.commit()

