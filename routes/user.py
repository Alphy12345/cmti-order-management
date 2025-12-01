from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models.user_model import User
from pydantic_schema.user_schema import UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

# CREATE
@router.post("/", response_model=UserResponse)
def create_user(request: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(
        name=request.name,
        email=request.email,
        designation=request.designation,
        role=request.role,
        center=request.center,
        group=request.group,
        password=request.password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# LOGIN
@router.post("/login")
def login(request: UserLogin, db: Session = Depends(get_db)):
    if not request.email:
        raise HTTPException(status_code=400, detail="Enter a valid email")
    if not request.password:
        raise HTTPException(status_code=400, detail="Enter a valid password")

    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.password != request.password:
        raise HTTPException(status_code=401, detail="Incorrect password")

    # Return all user fields in the response
    user_dict = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "designation": user.designation,
        "role": user.role,
        "center": user.center,
        "group": user.group,
        "message": "Login successful"
    }
    return user_dict


# GET ALL
@router.get("/", response_model=list[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).all()


# GET BY ID
@router.get("/{id}", response_model=UserResponse)
def get_user(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# DELETE
@router.delete("/{id}")
def delete_user(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
