from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from . import models, schemas


# Mapa de tipo largo a abreviatura para el JSON de IA
TYPE_SHORT = {
    "double":    "do",
    "triple":    "tr",
    "quad":      "qu",
    "quintuple": "qi",
}


def get_availability(db: Session, hotel_id: int, fecha: date) -> list[dict]:
    from sqlalchemy import text

    rooms = (
        db.query(models.Room)
        .filter(models.Room.hotel_id == hotel_id, models.Room.active == True)
        .order_by(models.Room.number)
        .all()
    )

    active_res = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.hotel_id == hotel_id,
            models.Reservation.status.in_(["confirmed", "pending"]),
            models.Reservation.check_in  <= fecha,
            models.Reservation.check_out >  fecha,
        )
        .all()
    )

    # Traer overrides vigentes para esa fecha
    overrides_raw = db.execute(text("""
        SELECT room_id, tipo_override, subtipo_override, capacidad_override
        FROM habitaciones_override
        WHERE hotel_id = :hotel_id
          AND fecha_desde <= :fecha
          AND fecha_hasta >= :fecha
    """), {"hotel_id": hotel_id, "fecha": fecha}).fetchall()

    overrides_by_room = {o.room_id: o for o in overrides_raw}

    res_by_room = {r.room_id: r for r in active_res}

    result = []
    for room in rooms:
        res = res_by_room.get(room.id)
        ov  = overrides_by_room.get(room.id)

        # Aplicar override si existe
        tipo      = ov.tipo_override     if ov and ov.tipo_override     else room.type
        subtipo   = ov.subtipo_override  if ov and ov.subtipo_override  else room.subtipo
        capacidad = ov.capacidad_override if ov and ov.capacidad_override else room.capacity

        result.append({
            "room_id":        room.id,
            "numero":         room.number,
            "tipo":           tipo,
            "subtipo":        subtipo,
            "capacidad":      capacidad,
            "estado":         "ocupada" if res else "libre",
            "origen":         res.channel.slug if res and res.channel else None,
            "huesped":        res.guest.name   if res and res.guest   else None,
            "grupo":          res.group.name   if res and res.group   else None,
            "tipo_ocupacion": res.tipo_ocupacion if res and res.tipo_ocupacion else "individual",
        })

    return result


def get_available_rooms(db: Session, hotel_id: int,
                        check_in: date, check_out: date) -> list[dict]:
    from sqlalchemy import text

    occupied_ids = (
        db.query(models.Reservation.room_id)
        .filter(
            models.Reservation.hotel_id == hotel_id,
            models.Reservation.status.in_(["confirmed", "pending"]),
            models.Reservation.check_in  < check_out,
            models.Reservation.check_out > check_in,
        )
        .subquery()
    )

    rooms = (
        db.query(models.Room)
        .filter(
            models.Room.hotel_id == hotel_id,
            models.Room.active   == True,
            ~models.Room.id.in_(occupied_ids),
        )
        .order_by(models.Room.number)
        .all()
    )

    # Traer overrides que se superpongan con el rango
    overrides_raw = db.execute(text("""
        SELECT room_id, tipo_override, subtipo_override, capacidad_override
        FROM habitaciones_override
        WHERE hotel_id = :hotel_id
            AND fecha_desde <= :check_out
            AND fecha_hasta >= :check_in
    """), {"hotel_id": hotel_id, "check_in": check_in, "check_out": check_out}).fetchall()

    overrides_by_room = {o.room_id: o for o in overrides_raw}

    result = []
    for room in rooms:
        ov = overrides_by_room.get(room.id)
        result.append({
            "id":       room.id,
            "number":   room.number,
            "type":     ov.tipo_override      if ov and ov.tipo_override      else room.type,
            "subtipo":  ov.subtipo_override   if ov and ov.subtipo_override   else room.subtipo,
            "capacity": ov.capacidad_override if ov and ov.capacidad_override else room.capacity,
        })

    return result


def create_reservation(db: Session, hotel_id: int,
                       data: schemas.ReservationCreate) -> models.Reservation:
    """
    Crea una reserva. El trigger de PostgreSQL maneja la validación
    de solapamiento — si hay conflicto, la DB lanza una excepción
    que capturamos en el router.
    """
    reservation = models.Reservation(
        hotel_id   = hotel_id,
        room_id    = data.room_id,
        guest_id   = data.guest_id,
        channel_id = data.channel_id,
        group_id   = data.group_id,
        check_in   = data.check_in,
        check_out  = data.check_out,
        notes      = data.notes,
        tipo_ocupacion = getattr(data, "tipo_ocupacion", "individual"),
        precio_total   = getattr(data, "precio_total", None),
        sena           = getattr(data, "sena", None),
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def cancel_reservation(db: Session, hotel_id: int,
                       reservation_id: int) -> models.Reservation | None:
    res = (
        db.query(models.Reservation)
        .filter(
            models.Reservation.id       == reservation_id,
            models.Reservation.hotel_id == hotel_id,
        )
        .first()
    )
    if not res:
        return None
    res.status = "cancelled"
    db.commit()
    db.refresh(res)
    return res


def build_ai_payload(hotel_id: int, fecha: date, rooms_data: list[dict]) -> dict:
    """
    Construye el JSON ultra-compacto para consultas de IA.
    Usa claves de 1-2 caracteres para minimizar tokens.
    e = L (libre) | O (ocupada)
    t = tipo abreviado: do/tr/qu/qi
    """
    hab = []
    for r in rooms_data:
        item = {
            "n": r["numero"],
            "t": TYPE_SHORT.get(r["tipo"], r["tipo"][:2]),
            "c": r["capacidad"],
            "e": "L" if r["estado"] == "libre" else "O",
        }
        if r["origen"]:
            item["o"] = r["origen"]
        hab.append(item)

    return {
        "f":   str(fecha),
        "h":   hotel_id,
        "hab": hab,
    }
