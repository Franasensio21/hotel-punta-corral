"""
generate_ai_json.py
Genera un archivo JSON optimizado para consultas de IA.
Guarda la disponibilidad de los próximos 365 días en un archivo compacto.

Uso:
    python scripts/generate_ai_json.py
    python scripts/generate_ai_json.py --dias 30
    python scripts/generate_ai_json.py --fecha 2026-04-01
"""

import sys
import json
import argparse
from datetime import date, timedelta
from pathlib import Path

# Agrega el directorio raíz al path para poder importar backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal
from backend.services import get_availability, build_ai_payload


def generar_json_ia(hotel_id: int, dias: int = 365, fecha_inicio: date = None):
    fecha_inicio = fecha_inicio or date.today()
    db = SessionLocal()

    resultado = {
        "hotel_id": hotel_id,
        "generado": str(date.today()),
        "dias": [],
    }

    try:
        for i in range(dias):
            fecha = fecha_inicio + timedelta(days=i)
            rooms_data = get_availability(db, hotel_id, fecha)
            payload = build_ai_payload(hotel_id, fecha, rooms_data)
            resultado["dias"].append(payload)
            if i % 30 == 0:
                print(f"  Procesando... {fecha} ({i+1}/{dias})")
    finally:
        db.close()

    return resultado


def main():
    parser = argparse.ArgumentParser(description="Genera JSON optimizado para IA")
    parser.add_argument("--hotel-id", type=int, default=1)
    parser.add_argument("--dias",     type=int, default=365)
    parser.add_argument("--fecha",    type=str, default=None,
                        help="Fecha de inicio YYYY-MM-DD (default: hoy)")
    parser.add_argument("--output",   type=str, default="scripts/output/availability_ai.json")
    args = parser.parse_args()

    fecha_inicio = date.fromisoformat(args.fecha) if args.fecha else date.today()

    print(f"Generando JSON para hotel {args.hotel_id}, {args.dias} días desde {fecha_inicio}...")

    data = generar_json_ia(args.hotel_id, args.dias, fecha_inicio)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    size_kb = output_path.stat().st_size / 1024
    print(f"Archivo generado: {output_path} ({size_kb:.1f} KB)")
    print(f"Días procesados: {len(data['dias'])}")


if __name__ == "__main__":
    main()
