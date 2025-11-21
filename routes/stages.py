from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models.model import Stage
from pydantic_schema.request import StageCreate, StageUpdate
from pydantic_schema.response import StageResponse

router = APIRouter(prefix="/stages", tags=["Stages"])


@router.post(
    "/", response_model=StageResponse, status_code=status.HTTP_201_CREATED
)
def create_stage(
    payload: StageCreate, db: Session = Depends(get_db)
) -> StageResponse:
    stage = Stage(**payload.dict(exclude_unset=True))
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.get("/", response_model=List[StageResponse])
def list_stages(db: Session = Depends(get_db)) -> List[StageResponse]:
    return db.query(Stage).all()


@router.get("/{stage_id}", response_model=StageResponse)
def get_stage(
    stage_id: int, db: Session = Depends(get_db)
) -> StageResponse:
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )
    return stage


@router.put("/{stage_id}", response_model=StageResponse)
def update_stage(
    stage_id: int,
    payload: StageUpdate,
    db: Session = Depends(get_db),
) -> StageResponse:
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stage, key, value)

    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.delete(
    "/{stage_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
def delete_stage(stage_id: int, db: Session = Depends(get_db)) -> None:
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )

    db.delete(stage)
    db.commit()

