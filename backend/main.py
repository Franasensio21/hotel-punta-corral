from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import router, public_router, superadmin_router
from .config import settings

app = FastAPI(
    title="Hotel System API",
    description="Sistema de gestión de reservas hoteleras. "
                "Endpoint /disponibilidad/ai optimizado para consultas de IA.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://lively-determination-production-7836.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")
app.include_router(superadmin_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "docs": "/docs",
        "api": "/api/v1",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}