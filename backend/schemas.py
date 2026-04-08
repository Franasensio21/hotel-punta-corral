from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ── Rooms ──────────────────────────────────────────────────────────────────

class RoomOut(BaseModel):
    id:          int
    number:      str
    type:        str
    capacity:    int
    floor:       Optional[int]
    description: Optional[str]
    active:      bool
    subtipo: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Guests ─────────────────────────────────────────────────────────────────

class GuestCreate(BaseModel):
    name:        str
    email:       Optional[str] = None
    phone:       Optional[str] = None
    nationality: Optional[str] = None
    id_number:   Optional[str] = None
    notes:       Optional[str] = None


class GuestOut(GuestCreate):
    id:         int
    hotel_id:   int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Channels ───────────────────────────────────────────────────────────────

class ChannelOut(BaseModel):
    id:   int
    name: str
    slug: str

    model_config = {"from_attributes": True}


# ── Groups ─────────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name:                    str
    contact_name:            Optional[str] = None
    contact_email:           Optional[str] = None
    contact_phone:           Optional[str] = None
    arrival_date:            date
    departure_date:          date
    notes:                   Optional[str] = None
    personas:                Optional[int] = None
    status:                  Optional[str] = "confirmado"
    incluye_cena:            Optional[bool] = False
    precio_cena_por_persona: Optional[float] = None

    @field_validator("departure_date")
    @classmethod
    def departure_after_arrival(cls, v, info):
        if "arrival_date" in info.data and v <= info.data["arrival_date"]:
            raise ValueError("departure_date debe ser posterior a arrival_date")
        return v


class GroupOut(GroupCreate):
    id:                      int
    hotel_id:                int
    habitaciones_asignadas:  Optional[int] = 0
    created_at:              datetime

    model_config = {"from_attributes": True}

# ── Reservations ───────────────────────────────────────────────────────────

class ReservationCreate(BaseModel):
    room_id:        int
    guest_id:       Optional[int] = None
    channel_id:     int
    group_id:       Optional[int] = None
    check_in:       date
    check_out:      date
    notes:          Optional[str] = None
    tipo_ocupacion: Optional[str] = "individual"
    precio_total:   Optional[float] = None
    sena:           Optional[float] = None

    @field_validator("check_out")
    @classmethod
    def checkout_after_checkin(cls, v, info):
        if "check_in" in info.data and v <= info.data["check_in"]:
            raise ValueError("check_out debe ser posterior a check_in")
        return v


class ReservationOut(BaseModel):
    id:             int
    hotel_id:       int
    room_id:        int
    guest_id:       Optional[int]
    channel_id:     int
    group_id:       Optional[int]
    check_in:       date
    check_out:      date
    status:         str
    notes:          Optional[str]
    created_at:     datetime
    precio_total:   Optional[float] = None
    sena:           Optional[float] = None

    room_number:    Optional[str] = None
    room_type:      Optional[str] = None
    guest_name:     Optional[str] = None
    channel_name:   Optional[str] = None
    group_name:     Optional[str] = None
    tipo_ocupacion: Optional[str] = None
    model_config = {"from_attributes": True}


class ReservationUpdate(BaseModel):
    status:       Optional[str]   = None
    notes:        Optional[str]   = None
    precio_total: Optional[float] = None
    sena:         Optional[float] = None


# ── Availability ───────────────────────────────────────────────────────────

class RoomAvailability(BaseModel):
    room_id:     int
    numero:      str
    tipo:        str
    subtipo: Optional[str] = None
    capacidad:   int
    estado:      str           # "libre" | "ocupada"
    origen:      Optional[str] = None
    huesped:     Optional[str] = None
    grupo:       Optional[str] = None
    tipo_ocupacion: Optional[str] = None

class AvailabilityResponse(BaseModel):
    fecha:       str
    hotel_id:    int
    habitaciones: list[RoomAvailability]


# ── AI JSON (formato optimizado para tokens mínimos) ───────────────────────

class RoomAI(BaseModel):
    n:  str            # numero
    t:  str            # tipo  (do/tr/qu/qi)
    c:  int            # capacidad
    e:  str            # estado (L=libre, O=ocupada)
    o:  Optional[str]  # origen slug (booking/direct/email/group)


class AIAvailabilityResponse(BaseModel):
    f:   str           # fecha
    h:   int           # hotel_id
    hab: list[RoomAI]
