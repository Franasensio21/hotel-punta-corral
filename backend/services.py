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
    """
    Devuelve todas las habitaciones del hotel con su estado para una fecha.
    Una habitación está ocupada si tiene una reserva confirmed/pending
    cuyo check_in <= fecha < check_out.
    """
    rooms = (
        db.query(models.Room)
        .filter(models.Room.hotel_id == hotel_id, models.Room.active == True)
        .order_by(models.Room.number)
        .all()
    )

    # Traemos todas las reservas activas que cubren esa fecha en una sola query
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

    # Indexamos por room_id para lookup O(1)
    res_by_room = {r.room_id: r for r in active_res}

    result = []
    for room in rooms:
        res = res_by_room.get(room.id)
        result.append({
            "room_id":   room.id,
            "numero":    room.number,
            "tipo":      room.type,
            "subtipo":   room.subtipo,
            "capacidad": room.capacity,
            "estado":    "ocupada" if res else "libre",
            "origen":    res.channel.slug  if res and res.channel else None,
            "huesped":   res.guest.name    if res and res.guest   else None,
            "grupo":     res.group.name    if res and res.group   else None,
            "tipo_ocupacion": res.tipo_ocupacion if res and res.tipo_ocupacion else "individual",
        })

    return result


def get_available_rooms(db: Session, hotel_id: int,
                        check_in: date, check_out: date) -> list[models.Room]:
    """
    Habitaciones libres en un rango de fechas.
    Excluye las que tienen solapamiento con reservas activas.
    """
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

    return (
        db.query(models.Room)
        .filter(
            models.Room.hotel_id == hotel_id,
            models.Room.active   == True,
            ~models.Room.id.in_(occupied_ids),
        )
        .order_by(models.Room.number)
        .all()
    )


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
