"""
cron_daily.py
Script maestro que se ejecuta diariamente.

Configurar en Windows Task Scheduler:
  Program: backend/venv/Scripts/python.exe
  Arguments: scripts/cron_daily.py
  Start in: C:/Users/franc/hotel-system
"""

import sys
import logging
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Configurar logging
log_dir = Path("scripts/logs")
log_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_dir / "cron_daily.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)

log = logging.getLogger(__name__)


def step(nombre: str, fn):
    log.info(f"--- Iniciando: {nombre} ---")
    try:
        fn()
        log.info(f"--- Completado: {nombre} ---")
    except Exception as e:
        log.error(f"--- ERROR en {nombre}: {e} ---", exc_info=True)


def tarea_extender_disponibilidad():
    from scripts.extend_availability import main
    main()


def tarea_generar_json_hoy():
    """Regenera el JSON completo una vez por semana (los lunes)."""
    if datetime.today().weekday() == 0:  # 0 = lunes
        log.info("Es lunes — regenerando JSON completo...")
        from scripts.generate_ai_json import main
        main()
    else:
        log.info("No es lunes — se omite regeneración completa.")


def main():
    log.info("========================================")
    log.info(f"Cron diario iniciado: {datetime.now()}")
    log.info("========================================")

    step("Extender disponibilidad futura", tarea_extender_disponibilidad)
    step("Regenerar JSON semanal",         tarea_generar_json_hoy)

    log.info("========================================")
    log.info("Cron diario finalizado")
    log.info("========================================")


if __name__ == "__main__":
    main()
