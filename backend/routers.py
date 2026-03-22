from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from . import models, schemas, services
from .database import get_db
from .config import settings
from . import auth as auth_module
from .auth import get_current_user, require_admin, hash_password


# Router público — sin autenticación (solo login)
public_router = APIRouter()

# Router protegido — requiere token JWT
router = APIRouter(dependencies=[Depends(get_current_user)])


# ══════════════════════════════════════════════════════════════
# DISPONIBILIDAD
# ══════════════════════════════════════════════════════════════

@public_router.get(
    "/disponibilidad",
    response_model=schemas.AvailabilityResponse,
    summary="Disponibilidad de habitaciones por fecha",
    tags=["Disponibilidad"],
)
def get_disponibilidad(
    fecha:    date     = Query(...,  description="Fecha a consultar (YYYY-MM-DD)"),
    tipo:     Optional[str] = Query(None, description="Filtrar por tipo: double/triple/quad/quintuple"),
    origen:   Optional[str] = Query(None, description="Filtrar por canal: booking/direct/email/group"),
    hotel_id: int      = Query(settings.DEFAULT_HOTEL_ID),
    db:       Session  = Depends(get_db),
):
    """
    Devuelve todas las habitaciones con su estado (libre/ocupada) para una fecha.
    Ideal para el panel web. Soporta filtros por tipo y canal de origen.
    """
    rooms_data = services.get_availability(db, hotel_id, fecha)

    # Aplicar filtros opcionales
    if tipo:
        rooms_data = [r for r in rooms_data if r["tipo"] == tipo]
    if origen:
        rooms_data = [r for r in rooms_data if r["origen"] == origen]

    habitaciones = [
        schemas.RoomAvailability(
            room_id   = r["room_id"],
            numero    = r["numero"],
            tipo      = r["tipo"],
            subtipo   = r["subtipo"],
            capacidad = r["capacidad"],
            estado    = r["estado"],
            origen    = r["origen"],
            huesped   = r["huesped"],
            grupo     = r["grupo"],
        )
        for r in rooms_data
    ]

    return schemas.AvailabilityResponse(
        fecha        = str(fecha),
        hotel_id     = hotel_id,
        habitaciones = habitaciones,
    )


@public_router.get(
    "/disponibilidad/ai",
    summary="Disponibilidad optimizada para IA (mínimo tokens)",
    tags=["Disponibilidad"],
)
def get_disponibilidad_ai(
    fecha:    date  = Query(...),
    hotel_id: int   = Query(settings.DEFAULT_HOTEL_ID),
    db:       Session = Depends(get_db),
):
    """
    Versión ultra-compacta para consultas de IA.
    Claves abreviadas (n/t/c/e/o) para minimizar uso de tokens.

    Ejemplo de respuesta:
    {
      "f": "2026-04-01",
      "h": 1,
      "hab": [
        {"n":"101","t":"do","c":2,"e":"O","o":"booking"},
        {"n":"102","t":"do","c":2,"e":"L"},
        ...
      ]
    }
    e = L (libre) | O (ocupada)
    t = do(uble) | tr(iple) | qu(ad) | qi(ntuple)
    o = origen solo si está ocupada
    """
    rooms_data = services.get_availability(db, hotel_id, fecha)
    return services.build_ai_payload(hotel_id, fecha, rooms_data)


@public_router.get(
    "/disponibilidad/rango",
    summary="Habitaciones libres en un rango de fechas",
    tags=["Disponibilidad"],
)
def get_disponibilidad_rango(
    check_in:  date = Query(..., description="Fecha de entrada (YYYY-MM-DD)"),
    check_out: date = Query(..., description="Fecha de salida (YYYY-MM-DD)"),
    tipo:      Optional[str] = Query(None),
    hotel_id:  int  = Query(settings.DEFAULT_HOTEL_ID),
    db:        Session = Depends(get_db),
):
    """
    Habitaciones completamente libres entre dos fechas.
    Útil para mostrar qué se puede reservar al crear una reserva.
    """
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out debe ser posterior a check_in")

    rooms = services.get_available_rooms(db, hotel_id, check_in, check_out)

    if tipo:
        rooms = [r for r in rooms if r.type == tipo]

    return {
        "check_in":   str(check_in),
        "check_out":  str(check_out),
        "hotel_id":   hotel_id,
        "disponibles": len(rooms),
        "habitaciones": [
            {"id": r.id, "numero": r.number, "tipo": r.type, "capacidad": r.capacity}
            for r in rooms
        ],
    }


# ══════════════════════════════════════════════════════════════
# HABITACIONES
# ══════════════════════════════════════════════════════════════

@router.get(
    "/habitaciones",
    response_model=list[schemas.RoomOut],
    summary="Listar habitaciones",
    tags=["Habitaciones"],
)
def get_habitaciones(
    hotel_id: int            = Query(settings.DEFAULT_HOTEL_ID),
    tipo:     Optional[str]  = Query(None),
    activas:  Optional[bool] = Query(None),
    db:       Session        = Depends(get_db),
):
    query = db.query(models.Room).filter(models.Room.hotel_id == hotel_id)
    if activas is not None:
        query = query.filter(models.Room.active == activas)
    if tipo:
        query = query.filter(models.Room.type == tipo)
    return query.order_by(models.Room.number).all()


@router.get("/habitaciones/overrides", tags=["Habitaciones"])
def get_overrides(hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT o.*, r.number as numero
        FROM habitaciones_override o
        JOIN rooms r ON r.id = o.room_id
        WHERE o.hotel_id = :hotel_id
        ORDER BY o.fecha_desde
    """), {"hotel_id": hotel_id}).fetchall()
    return [dict(r._mapping) for r in result]


@router.post("/habitaciones/overrides", status_code=201, tags=["Habitaciones"])
def create_override(data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        INSERT INTO habitaciones_override 
        (hotel_id, room_id, fecha_desde, fecha_hasta, tipo_override, subtipo_override, capacidad_override, notas)
        VALUES (:hotel_id, :room_id, :fecha_desde, :fecha_hasta, :tipo_override, :subtipo_override, :capacidad_override, :notas)
    """), {
        "hotel_id":           hotel_id,
        "room_id":            data["room_id"],
        "fecha_desde":        data["fecha_desde"],
        "fecha_hasta":        data["fecha_hasta"],
        "tipo_override":      data.get("tipo_override"),
        "subtipo_override":   data.get("subtipo_override"),
        "capacidad_override": data.get("capacidad_override"),
        "notas":              data.get("notas"),
    })
    db.commit()
    return {"ok": True}


@router.delete("/habitaciones/overrides/{override_id}", tags=["Habitaciones"])
def delete_override(override_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("DELETE FROM habitaciones_override WHERE id = :id AND hotel_id = :hotel_id"), {"id": override_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}


@router.get(
    "/habitaciones/{room_id}",
    response_model=schemas.RoomOut,
    tags=["Habitaciones"],
)
def get_habitacion(room_id: int, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    return room

@router.patch("/habitaciones/{room_id}", tags=["Habitaciones"])
def update_habitacion(room_id: int, data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    campos = []
    params = {"id": room_id, "hotel_id": hotel_id}
    for field in ["type", "subtipo", "capacity", "active"]:
        if field in data:
            campos.append(f"{field} = :{field}")
            params[field] = data[field]
    if not campos:
        return {"ok": True}
    db.execute(text(f"UPDATE rooms SET {', '.join(campos)} WHERE id = :id AND hotel_id = :hotel_id"), params)
    db.commit()
    return {"ok": True}

# ══════════════════════════════════════════════════════════════
# CLIENTES
# ══════════════════════════════════════════════════════════════

@router.get(
    "/clientes",
    response_model=list[schemas.GuestOut],
    summary="Listar clientes",
    tags=["Clientes"],
)
def get_clientes(
    hotel_id: int           = Query(settings.DEFAULT_HOTEL_ID),
    search:   Optional[str] = Query(None, description="Buscar por nombre o email"),
    db:       Session       = Depends(get_db),
):
    query = db.query(models.Guest).filter(models.Guest.hotel_id == hotel_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            models.Guest.name.ilike(like) | models.Guest.email.ilike(like)
        )
    return query.order_by(models.Guest.name).all()


@router.post(
    "/clientes",
    response_model=schemas.GuestOut,
    status_code=201,
    summary="Crear cliente",
    tags=["Clientes"],
)
def create_cliente(
    data:     schemas.GuestCreate,
    hotel_id: int     = Query(settings.DEFAULT_HOTEL_ID),
    db:       Session = Depends(get_db),
):
    guest = models.Guest(hotel_id=hotel_id, **data.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


@router.get(
    "/clientes/{guest_id}",
    response_model=schemas.GuestOut,
    tags=["Clientes"],
)
def get_cliente(guest_id: int, db: Session = Depends(get_db)):
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return guest

@router.patch("/clientes/{guest_id}", tags=["Clientes"])
def update_cliente(guest_id: int, data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id, models.Guest.hotel_id == hotel_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field in ["name", "email", "phone"]:
        if field in data:
            setattr(guest, field, data[field])
    db.commit()
    db.refresh(guest)
    return guest


@router.delete("/clientes/{guest_id}", tags=["Clientes"])
def delete_cliente(guest_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id, models.Guest.hotel_id == hotel_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    try:
        db.delete(guest)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar el cliente porque tiene reservas asociadas")
    return {"ok": True}

# ══════════════════════════════════════════════════════════════
# RESERVAS
# ══════════════════════════════════════════════════════════════

@router.post(
    "/reservar",
    response_model=schemas.ReservationOut,
    status_code=201,
    summary="Crear reserva",
    tags=["Reservas"],
)
def crear_reserva(
    data:     schemas.ReservationCreate,
    hotel_id: int     = Query(settings.DEFAULT_HOTEL_ID),
    db:       Session = Depends(get_db),
):
    """
    Crea una reserva. Si la habitación ya está ocupada en ese rango,
    el trigger de PostgreSQL rechaza la operación y se devuelve 409.
    """
    try:
        reservation = services.create_reservation(db, hotel_id, data)
    except IntegrityError as e:
    db.rollback()
    print(f"ERROR RESERVA: {str(e)}")
    raise HTTPException(
        status_code=409,
        detail="La habitación ya tiene una reserva en ese rango de fechas.",
    )
    return reservation


@router.get(
    "/reservas",
    response_model=list[schemas.ReservationOut],
    summary="Listar reservas",
    tags=["Reservas"],
)
def get_reservas(
    hotel_id:  int           = Query(settings.DEFAULT_HOTEL_ID),
    status:    Optional[str] = Query(None, description="confirmed/pending/cancelled/no_show"),
    room_id:   Optional[int] = Query(None),
    desde:     Optional[date] = Query(None),
    hasta:     Optional[date] = Query(None),
    db:        Session        = Depends(get_db),
):
    query = db.query(models.Reservation).filter(
        models.Reservation.hotel_id == hotel_id
    )
    if status:
        query = query.filter(models.Reservation.status == status)
    if room_id:
        query = query.filter(models.Reservation.room_id == room_id)
    if desde:
        query = query.filter(models.Reservation.check_in >= desde)
    if hasta:
        query = query.filter(models.Reservation.check_out <= hasta)

    return query.order_by(models.Reservation.check_in).all()


@router.patch(
    "/reservas/{reservation_id}",
    response_model=schemas.ReservationOut,
    summary="Actualizar reserva (status / notas)",
    tags=["Reservas"],
)
def update_reserva(
    reservation_id: int,
    data:           schemas.ReservationUpdate,
    hotel_id:       int     = Query(settings.DEFAULT_HOTEL_ID),
    db:             Session = Depends(get_db),
):
    res = db.query(models.Reservation).filter(
        models.Reservation.id       == reservation_id,
        models.Reservation.hotel_id == hotel_id,
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if data.status:
        res.status = data.status
    if data.notes is not None:
        res.notes = data.notes

    db.commit()
    db.refresh(res)
    return res


@router.delete(
    "/reservas/{reservation_id}",
    summary="Cancelar reserva",
    tags=["Reservas"],
)
def cancelar_reserva(
    reservation_id: int,
    hotel_id:       int     = Query(settings.DEFAULT_HOTEL_ID),
    db:             Session = Depends(get_db),
):
    """
    No borra el registro. Cambia el status a 'cancelled' para preservar historial.
    """
    res = services.cancel_reservation(db, hotel_id, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return {"ok": True, "id": res.id, "status": res.status}

@router.delete("/reservas/{reserva_id}/borrar", tags=["Reservas"])
def borrar_reserva(reserva_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("DELETE FROM reservations WHERE id = :id AND hotel_id = :hotel_id"), 
               {"id": reserva_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════
# CANALES
# ══════════════════════════════════════════════════════════════

@router.get(
    "/canales",
    response_model=list[schemas.ChannelOut],
    summary="Listar canales de reserva",
    tags=["Canales"],
)
def get_canales(db: Session = Depends(get_db)):
    return db.query(models.Channel).order_by(models.Channel.id).all()


# ══════════════════════════════════════════════════════════════
# GRUPOS
# ══════════════════════════════════════════════════════════════

@router.post(
    "/grupos",
    response_model=schemas.GroupOut,
    status_code=201,
    summary="Crear grupo",
    tags=["Grupos"],
)
def crear_grupo(
    data:     schemas.GroupCreate,
    hotel_id: int     = Query(settings.DEFAULT_HOTEL_ID),
    db:       Session = Depends(get_db),
):
    group = models.Group(hotel_id=hotel_id, **data.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.get(
    "/grupos",
    response_model=list[schemas.GroupOut],
    summary="Listar grupos",
    tags=["Grupos"],
)
def get_grupos(
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    db: Session   = Depends(get_db),
):
    return (
        db.query(models.Group)
        .filter(models.Group.hotel_id == hotel_id)
        .order_by(models.Group.arrival_date)
        .all()
    )
# ══════════════════════════════════════════════════════════════
# PRECIOS
# ══════════════════════════════════════════════════════════════

@public_router.get("/precios", tags=["Precios"])
def get_precios(
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    query = "SELECT id, hotel_id, tipo, fecha_desde, fecha_hasta, precio_noche, precio_grupo FROM precios WHERE hotel_id = :hotel_id"
    params = {"hotel_id": hotel_id}
    if tipo:
        query += " AND tipo = :tipo"
        params["tipo"] = tipo
    query += " ORDER BY fecha_desde"
    result = db.execute(text(query), params).fetchall()
    return [dict(row._mapping) for row in result]

@router.post("/precios", status_code=201, tags=["Precios"])
def create_precio(data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        INSERT INTO precios (hotel_id, tipo, fecha_desde, fecha_hasta, precio_noche, precio_grupo)
        VALUES (:hotel_id, :tipo, :fecha_desde, :fecha_hasta, :precio_noche, :precio_grupo)
    """), {
        "hotel_id":     hotel_id,
        "tipo":         data["tipo"],
        "fecha_desde":  data["fecha_desde"],
        "fecha_hasta":  data["fecha_hasta"],
        "precio_noche": data["precio_noche"],
        "precio_grupo": data.get("precio_grupo"),
    })
    db.commit()
    return {"ok": True}


@router.delete(
    "/precios/{precio_id}",
    summary="Eliminar precio",
    tags=["Precios"],
)
def delete_precio(
    precio_id: int,
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    db.execute(text(
        "DELETE FROM precios WHERE id = :id AND hotel_id = :hotel_id"
    ), {"id": precio_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}


@public_router.get("/precios/consulta", tags=["Precios"])
def consultar_precio(
    fecha: date = Query(...),
    tipo:  str   = Query(...),
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT precio_noche, precio_grupo FROM precios
        WHERE hotel_id   = :hotel_id
          AND tipo       = :tipo
          AND fecha_desde <= :fecha
          AND fecha_hasta >= :fecha
        ORDER BY fecha_desde DESC
        LIMIT 1
    """), {"hotel_id": hotel_id, "tipo": tipo, "fecha": fecha}).fetchone()

    if not result:
        return {"precio": None, "precio_grupo": None, "mensaje": "No hay precio cargado para esa fecha"}
    return {
        "precio":       float(result[0]) if result[0] else None,
        "precio_grupo": float(result[1]) if result[1] else None,
    }
# ══════════════════════════════════════════════════════════════
# AUTENTICACIÓN
# ══════════════════════════════════════════════════════════════

from fastapi.security import OAuth2PasswordRequestForm

@public_router.post("/auth/login", tags=["Auth"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.email == form_data.username,
        models.User.active == True
    ).first()

    if not user or not auth_module.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    token = auth_module.create_access_token({
    "sub":      str(user.id),
    "role":     user.role,
    "categoria": user.categoria,
    "hotel_id": user.hotel_id,
})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id":       user.id,
            "name":     user.name,
            "email":    user.email,
            "role":     user.role,
            "hotel_id": user.hotel_id,
        }
    }


@router.get("/auth/me", tags=["Auth"])
def get_me(current_user=Depends(get_current_user)):
    return {
        "id":       current_user.id,
        "name":     current_user.name,
        "email":    current_user.email,
        "role":     current_user.role,
        "hotel_id": current_user.hotel_id,
    }


@router.post("/auth/logout", tags=["Auth"])
def logout():
    return {"ok": True}
# ══════════════════════════════════════════════════════════════
# USUARIOS / EMPLEADOS
# ══════════════════════════════════════════════════════════════

@router.get("/usuarios", tags=["Usuarios"])
def get_usuarios(
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT id, name, email, phone, role, categoria, fecha_ingreso, active, created_at
        FROM users
        WHERE hotel_id = :hotel_id
        ORDER BY name
    """), {"hotel_id": hotel_id}).fetchall()
    return [dict(r._mapping) for r in result]


@router.post("/usuarios", status_code=201, tags=["Usuarios"])
def create_usuario(data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        INSERT INTO users (hotel_id, name, email, phone, password_hash, role, categoria, fecha_ingreso)
        VALUES (:hotel_id, :name, :email, :phone, :password_hash, :role, :categoria, :fecha_ingreso)
    """), {
        "hotel_id":      hotel_id,
        "name":          data["name"],
        "email":         data["email"],
        "phone":         data.get("phone"),
        "password_hash": hash_password(data["password"]),
        "role":          data.get("role", "employee"),
        "categoria":     data.get("categoria"),
        "fecha_ingreso": data.get("fecha_ingreso"),
    })
    db.commit()
    return {"ok": True}


@router.patch("/usuarios/{user_id}", tags=["Usuarios"])
def update_usuario(user_id: int, data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    campos = []
    params = {"id": user_id, "hotel_id": hotel_id}
    for field in ["name", "email", "phone", "role", "categoria", "fecha_ingreso", "active"]:
        if field in data:
            campos.append(f"{field} = :{field}")
            params[field] = data[field]
    if "password" in data and data["password"]:
        campos.append("password_hash = :password_hash")
        params["password_hash"] = hash_password(data["password"])
    if not campos:
        return {"ok": True}
    db.execute(text(f"UPDATE users SET {', '.join(campos)} WHERE id = :id AND hotel_id = :hotel_id"), params)
    db.commit()
    return {"ok": True}


@router.delete("/usuarios/{user_id}", tags=["Usuarios"])
def deactivate_usuario(user_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("UPDATE users SET active = false WHERE id = :id AND hotel_id = :hotel_id"), {"id": user_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════
# FICHAJES
# ══════════════════════════════════════════════════════════════

@router.get("/fichajes", tags=["Fichajes"])
def get_fichajes(
    fecha: date = Query(date.today()),
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT f.id, f.user_id, u.name, u.categoria, f.fecha,
               f.hora_entrada, f.hora_salida, f.notas
        FROM fichajes f
        JOIN users u ON u.id = f.user_id
        WHERE f.hotel_id = :hotel_id AND f.fecha = :fecha
        ORDER BY u.name
    """), {"hotel_id": hotel_id, "fecha": fecha}).fetchall()
    return [dict(r._mapping) for r in result]


@router.post("/fichajes", status_code=201, tags=["Fichajes"])
def create_fichaje(data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        INSERT INTO fichajes (hotel_id, user_id, fecha, hora_entrada, hora_salida, notas)
        VALUES (:hotel_id, :user_id, :fecha, :hora_entrada, :hora_salida, :notas)
        ON CONFLICT DO NOTHING
    """), {
        "hotel_id":     hotel_id,
        "user_id":      data["user_id"],
        "fecha":        data["fecha"],
        "hora_entrada": data.get("hora_entrada"),
        "hora_salida":  data.get("hora_salida"),
        "notas":        data.get("notas"),
    })
    db.commit()
    return {"ok": True}


@router.patch("/fichajes/{fichaje_id}", tags=["Fichajes"])
def update_fichaje(fichaje_id: int, data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    campos = []
    params = {"id": fichaje_id, "hotel_id": hotel_id}
    for field in ["hora_entrada", "hora_salida", "notas"]:
        if field in data:
            campos.append(f"{field} = :{field}")
            params[field] = data[field]
    if not campos:
        return {"ok": True}
    db.execute(text(f"UPDATE fichajes SET {', '.join(campos)} WHERE id = :id AND hotel_id = :hotel_id"), params)
    db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════
# GASTOS
# ══════════════════════════════════════════════════════════════

@router.get("/gastos", tags=["Gastos"])
def get_gastos(
    mes: int = Query(None),
    anio: int = Query(None),
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    db: Session = Depends(get_db),
):
    from sqlalchemy import text
    import datetime
    hoy = datetime.date.today()
    mes  = mes  or hoy.month
    anio = anio or hoy.year
    result = db.execute(text("""
        SELECT * FROM gastos
        WHERE hotel_id = :hotel_id
          AND EXTRACT(MONTH FROM fecha) = :mes
          AND EXTRACT(YEAR  FROM fecha) = :anio
        ORDER BY fecha DESC
    """), {"hotel_id": hotel_id, "mes": mes, "anio": anio}).fetchall()
    return [dict(r._mapping) for r in result]


@router.post("/gastos", status_code=201, tags=["Gastos"])
def create_gasto(data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        INSERT INTO gastos (hotel_id, fecha, descripcion, monto, categoria, notas)
        VALUES (:hotel_id, :fecha, :descripcion, :monto, :categoria, :notas)
    """), {
        "hotel_id":    hotel_id,
        "fecha":       data["fecha"],
        "descripcion": data["descripcion"],
        "monto":       data["monto"],
        "categoria":   data.get("categoria", "otro"),
        "notas":       data.get("notas"),
    })
    db.commit()
    return {"ok": True}


@router.delete("/gastos/{gasto_id}", tags=["Gastos"])
def delete_gasto(gasto_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("DELETE FROM gastos WHERE id = :id AND hotel_id = :hotel_id"), {"id": gasto_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════
# SUELDOS
# ══════════════════════════════════════════════════════════════

@router.get("/sueldos", tags=["Sueldos"])
def get_sueldos(hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT s.id, s.user_id, u.name, u.categoria, s.sueldo_fijo, s.sueldo_por_hora, s.activo
        FROM sueldos s
        JOIN users u ON u.id = s.user_id
        WHERE s.hotel_id = :hotel_id
        ORDER BY u.name
    """), {"hotel_id": hotel_id}).fetchall()
    return [dict(r._mapping) for r in result]


@router.post("/sueldos", status_code=201, tags=["Sueldos"])
def create_sueldo(data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        INSERT INTO sueldos (hotel_id, user_id, sueldo_fijo, sueldo_por_hora)
        VALUES (:hotel_id, :user_id, :sueldo_fijo, :sueldo_por_hora)
        ON CONFLICT (hotel_id, user_id) DO UPDATE
        SET sueldo_fijo = :sueldo_fijo, sueldo_por_hora = :sueldo_por_hora
    """), {
        "hotel_id":        hotel_id,
        "user_id":         data["user_id"],
        "sueldo_fijo":     data.get("sueldo_fijo", 0),
        "sueldo_por_hora": data.get("sueldo_por_hora", 0),
    })
    db.commit()
    return {"ok": True}
# ══════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════

@router.get("/configuracion", tags=["Configuracion"])
def get_configuracion(hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    result = db.execute(text("SELECT * FROM configuracion WHERE hotel_id = :hotel_id"), {"hotel_id": hotel_id}).fetchall()
    return [dict(r._mapping) for r in result]


@router.patch("/configuracion/{clave}", tags=["Configuracion"])
def update_configuracion(clave: str, data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        INSERT INTO configuracion (hotel_id, clave, valor)
        VALUES (:hotel_id, :clave, :valor)
        ON CONFLICT (hotel_id, clave) DO UPDATE SET valor = :valor
    """), {"hotel_id": hotel_id, "clave": clave, "valor": data["valor"]})
    db.commit()
    return {"ok": True}

# ══════════════════════════════════════════════════════════════
# GRUPOS
# ══════════════════════════════════════════════════════════════

@router.get("/grupos", tags=["Grupos"])
def get_grupos(hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT g.*, 
               COUNT(r.id) as habitaciones_asignadas
        FROM groups g
        LEFT JOIN reservations r ON r.group_id = g.id 
            AND r.status NOT IN ('cancelled')
        WHERE g.hotel_id = :hotel_id
        GROUP BY g.id
        ORDER BY g.arrival_date DESC
    """), {"hotel_id": hotel_id}).fetchall()
    return [dict(r._mapping) for r in result]


@router.post("/grupos", status_code=201, tags=["Grupos"])
def create_grupo(data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    result = db.execute(text("""
        INSERT INTO groups (hotel_id, name, contact_name, contact_email, contact_phone, 
                           arrival_date, departure_date, personas, notes, status)
        VALUES (:hotel_id, :name, :contact_name, :contact_email, :contact_phone,
                :arrival_date, :departure_date, :personas, :notes, :status)
        RETURNING id
    """), {
        "hotel_id":      hotel_id,
        "name":          data["name"],
        "contact_name":  data.get("contact_name"),
        "contact_email": data.get("contact_email"),
        "contact_phone": data.get("contact_phone"),
        "arrival_date":  data["arrival_date"],
        "departure_date": data["departure_date"],
        "personas":      data.get("personas"),
        "notes":         data.get("notes"),
        "status":        data.get("status", "confirmado"),
    })
    db.commit()
    return {"id": result.fetchone()[0], "ok": True}


@router.patch("/grupos/{grupo_id}", tags=["Grupos"])
def update_grupo(grupo_id: int, data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    campos = []
    params = {"id": grupo_id, "hotel_id": hotel_id}
    for field in ["name", "contact_name", "contact_email", "contact_phone",
                  "arrival_date", "departure_date", "personas", "notes", "status"]:
        if field in data:
            campos.append(f"{field} = :{field}")
            params[field] = data[field]
    if not campos:
        return {"ok": True}
    db.execute(text(f"UPDATE groups SET {', '.join(campos)} WHERE id = :id AND hotel_id = :hotel_id"), params)

    # Si cambiaron las fechas, actualizar todas las reservas del grupo
    if "arrival_date" in data or "departure_date" in data:
        grupo = db.execute(text("SELECT arrival_date, departure_date FROM groups WHERE id = :id"), 
                          {"id": grupo_id}).fetchone()
        db.execute(text("""
            UPDATE reservations 
            SET check_in = :check_in, check_out = :check_out
            WHERE group_id = :grupo_id 
              AND hotel_id = :hotel_id
              AND status != 'cancelled'
        """), {
            "check_in":   grupo.arrival_date,
            "check_out":  grupo.departure_date,
            "grupo_id":   grupo_id,
            "hotel_id":   hotel_id,
        })

    db.commit()
    return {"ok": True}

@router.delete("/grupos/{grupo_id}", tags=["Grupos"])
def delete_grupo(grupo_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    # Cancelar todas las reservas del grupo
    db.execute(text("""
        UPDATE reservations SET status = 'cancelled' 
        WHERE group_id = :grupo_id AND hotel_id = :hotel_id
    """), {"grupo_id": grupo_id, "hotel_id": hotel_id})
    # Borrar el grupo
    db.execute(text("DELETE FROM groups WHERE id = :id AND hotel_id = :hotel_id"), 
               {"id": grupo_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}

@router.get("/grupos/{grupo_id}/habitaciones", tags=["Grupos"])
def get_grupo_habitaciones(grupo_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    result = db.execute(text("""
        SELECT r.id as reserva_id, r.room_id, r.check_in, r.check_out, r.status,
               ro.number as numero, ro.type as tipo, ro.subtipo, ro.capacity as capacidad
        FROM reservations r
        JOIN rooms ro ON ro.id = r.room_id
        WHERE r.group_id = :grupo_id 
          AND r.hotel_id = :hotel_id
          AND r.status != 'cancelled'
        ORDER BY CAST(ro.number AS INTEGER)
    """), {"grupo_id": grupo_id, "hotel_id": hotel_id}).fetchall()
    return [dict(r._mapping) for r in result]


@router.post("/grupos/{grupo_id}/habitaciones", status_code=201, tags=["Grupos"])
def asignar_habitacion_grupo(grupo_id: int, data: dict, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    grupo = db.execute(text("SELECT * FROM groups WHERE id = :id AND hotel_id = :hotel_id"),
                       {"id": grupo_id, "hotel_id": hotel_id}).fetchone()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    # Verificar disponibilidad real en todo el rango de fechas
    conflicto = db.execute(text("""
        SELECT id FROM reservations
        WHERE room_id   = :room_id
          AND hotel_id  = :hotel_id
          AND status    IN ('confirmed', 'pending')
          AND check_in  < :check_out
          AND check_out > :check_in
    """), {
        "room_id":   data["room_id"],
        "hotel_id":  hotel_id,
        "check_in":  grupo.arrival_date,
        "check_out": grupo.departure_date,
    }).fetchone()

    if conflicto:
        raise HTTPException(
            status_code=400,
            detail=f"La habitación tiene una reserva activa que se superpone con las fechas del grupo ({grupo.arrival_date} - {grupo.departure_date})"
        )

    db.execute(text("""
        INSERT INTO reservations (hotel_id, room_id, group_id, channel_id, check_in, check_out, status)
        VALUES (:hotel_id, :room_id, :group_id, 4, :check_in, :check_out, 'confirmed')
    """), {
        "hotel_id":  hotel_id,
        "room_id":   data["room_id"],
        "group_id":  grupo_id,
        "check_in":  grupo.arrival_date,
        "check_out": grupo.departure_date,
    })
    db.commit()
    return {"ok": True}


@router.delete("/grupos/{grupo_id}/habitaciones/{reserva_id}", tags=["Grupos"])
def desasignar_habitacion_grupo(grupo_id: int, reserva_id: int, hotel_id: int = Query(settings.DEFAULT_HOTEL_ID), db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("""
        UPDATE reservations SET status = 'cancelled' 
        WHERE id = :id AND group_id = :grupo_id AND hotel_id = :hotel_id
    """), {"id": reserva_id, "grupo_id": grupo_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}

@router.patch("/reservas/{reserva_id}/mover", tags=["Reservas"])
def mover_reserva(
    reserva_id: int,
    data: dict,
    hotel_id: int = Query(settings.DEFAULT_HOTEL_ID),
    db: Session = Depends(get_db)
):
    from sqlalchemy import text
    # Verificar que la habitación destino esté libre en esas fechas
    reserva = db.execute(text("""
        SELECT * FROM reservations WHERE id = :id AND hotel_id = :hotel_id
    """), {"id": reserva_id, "hotel_id": hotel_id}).fetchone()
    
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Verificar que no haya otra reserva en la habitación destino para esas fechas
    conflicto = db.execute(text("""
        SELECT id FROM reservations 
        WHERE room_id = :room_id 
          AND hotel_id = :hotel_id
          AND status IN ('confirmed', 'pending')
          AND check_in < :check_out 
          AND check_out > :check_in
    """), {
        "room_id":   data["room_id_destino"],
        "hotel_id":  hotel_id,
        "check_in":  reserva.check_in,
        "check_out": reserva.check_out,
    }).fetchone()

    if conflicto:
        raise HTTPException(status_code=400, detail="La habitación destino ya tiene una reserva para esas fechas")

    db.execute(text("""
        UPDATE reservations SET room_id = :room_id WHERE id = :id AND hotel_id = :hotel_id
    """), {"room_id": data["room_id_destino"], "id": reserva_id, "hotel_id": hotel_id})
    db.commit()
    return {"ok": True}


