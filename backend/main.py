from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import router
from .config import settings

app = FastAPI(
    title="Hotel System API",
    description="Sistema de gestión de reservas hoteleras. "
                "Endpoint /disponibilidad/ai optimizado para consultas de IA.",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI en http://localhost:8000/docs
    redoc_url="/redoc",
)

# CORS: permite que el frontend React (puerto 5173) hable con la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


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
