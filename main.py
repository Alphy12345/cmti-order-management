from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import Base, engine
from routes.documents import router as documents_router
from routes.payments import router as payments_router
from routes.progress import router as progress_router
from routes.proposals import router as proposals_router
from routes.stages import router as stages_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Order Management Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(proposals_router)
app.include_router(stages_router)
app.include_router(payments_router)
app.include_router(documents_router)
app.include_router(progress_router)

