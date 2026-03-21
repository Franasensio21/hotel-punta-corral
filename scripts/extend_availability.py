"""
extend_availability.py
Verifica que siempre haya al menos 365 días de disponibilidad futura.
Se corre diariamente via cron — no hace nada si ya hay suficientes días.

Uso:
    python scripts/extend_availability.py
"""

import sys
import json
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal
from backend.models import Room
from backend.services import get_availability, build_ai_payload


AI_JSON_PATH = Path("scripts/output/availability_ai.json")
DIAS_MINIMOS = 365


def cargar_json_existente():
    if not AI_JSON_PATH.exists():
        return None
    try:
        return json.loads(AI_JSON_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None


def ultima_fecha_en_json(data: dict) -> date | None:
    if not data or not data.get("dias"):
        return None
    try:
        return date.fromisoformat(data["dias"][-1]["f"])
    except Exception:
        return None


def main():
    hotel_id = 1
    hoy = date.today()
    fecha_limite = hoy + timedelta(days=DIAS_MINIMOS)

    data = cargar_json_existente()
    ultima = ultima_fecha_en_json(data)

    if ultima and ultima >= fecha_limite:
        print(f"OK — el JSON ya cubre hasta {ultima}, no es necesario extender.")
        return

    if ultima:
        fecha_inicio = ultima + timedelta(days=1)
        print(f"Extendiendo desde {fecha_inicio} hasta {fecha_limite}...")
    else:
        fecha_inicio = hoy
        print(f"JSON no encontrado, generando desde {fecha_inicio} hasta {fecha_limite}...")
        data = {"hotel_id": hotel_id, "generado": str(hoy), "dias": []}

    db = SessionLocal()
    nuevos_dias = []

    try:
        fecha = fecha_inicio
        while fecha <= fecha_limite:
            rooms_data = get_availability(db, hotel_id, fecha)
            payload = build_ai_payload(hotel_id, fecha, rooms_data)
            nuevos_dias.append(payload)
            fecha += timedelta(days=1)
    finally:
        db.close()

    data["dias"].extend(nuevos_dias)
    data["generado"] = str(hoy)

    AI_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    AI_JSON_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    size_kb = AI_JSON_PATH.stat().st_size / 1024
    print(f"Agregados {len(nuevos_dias)} días nuevos.")
    print(f"Total: {len(data['dias'])} días — {size_kb:.1f} KB")
    print(f"Archivo: {AI_JSON_PATH}")


if __name__ == "__main__":
    main()
