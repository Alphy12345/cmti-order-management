from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from db import get_db
from models.model import Customer
from pydantic_schema.customer_schema import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


# CREATE CUSTOMER
@router.post("/", response_model=CustomerResponse)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    # Check if customer with same name already exists
    existing = db.query(Customer).filter(
        func.lower(Customer.name) == func.lower(customer.name.strip())
    ).first()

    if existing:
        raise HTTPException(400, f"Customer with name '{customer.name}' already exists")

    new_customer = Customer(**customer.dict())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer


# SEARCH CUSTOMERS BY NAME (partial match)
@router.get("/search", response_model=list[CustomerResponse])
def search_customers(
    name: str = Query(..., description="Customer name to search for (partial match)"),
    db: Session = Depends(get_db)
):
    if not name or not name.strip():
        return []

    # Case-insensitive partial match search
    search_pattern = f"%{name.strip()}%"
    customers = db.query(Customer).filter(
        Customer.name.ilike(search_pattern)
    ).order_by(Customer.name.asc()).limit(20).all()

    return customers


# GET ALL CUSTOMERS
@router.get("/", response_model=list[CustomerResponse])
def get_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.name.asc()).all()


# GET SINGLE CUSTOMER
@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


# UPDATE CUSTOMER
@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, data: CustomerCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(customer, key, value)

    db.commit()
    db.refresh(customer)
    return customer


# DELETE CUSTOMER
@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted successfully"}
