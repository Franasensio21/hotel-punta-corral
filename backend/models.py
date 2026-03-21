from datetime import date, datetime
from sqlalchemy import (
    Boolean, Column, Date, ForeignKey, Integer,
    SmallInteger, String, Text, TIMESTAMP, CheckConstraint
)
from sqlalchemy.orm import relationship
from .database import Base


class Hotel(Base):
    __tablename__ = "hotels"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(120), nullable=False)
    slug       = Column(String(60),  nullable=False, unique=True)
    city       = Column(String(80))
    address    = Column(Text)
    phone      = Column(String(30))
    email      = Column(String(120))
    active     = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    rooms        = relationship("Room",        back_populates="hotel")
    guests       = relationship("Guest",       back_populates="hotel")
    groups       = relationship("Group",       back_populates="hotel")
    reservations = relationship("Reservation", back_populates="hotel")
    users = relationship("User", back_populates="hotel")

class Room(Base):
    __tablename__ = "rooms"

    id          = Column(Integer, primary_key=True)
    hotel_id    = Column(Integer, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    number      = Column(String(10),  nullable=False)
    type        = Column(String(20),  nullable=False)
    capacity    = Column(SmallInteger, nullable=False)
    floor       = Column(SmallInteger)
    description = Column(Text)
    subtipo     = Column(String(20))
    active      = Column(Boolean, nullable=False, default=True)
    created_at  = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    hotel        = relationship("Hotel",       back_populates="rooms")
    reservations = relationship("Reservation", back_populates="room")
    

class Channel(Base):
    __tablename__ = "channels"

    id   = Column(Integer, primary_key=True)
    name = Column(String(60), nullable=False)
    slug = Column(String(30), nullable=False, unique=True)

    reservations = relationship("Reservation", back_populates="channel")


class Guest(Base):
    __tablename__ = "guests"

    id          = Column(Integer, primary_key=True)
    hotel_id    = Column(Integer, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(120), nullable=False)
    email       = Column(String(120))
    phone       = Column(String(30))
    nationality = Column(String(2))
    id_number   = Column(String(30))
    notes       = Column(Text)
    created_at  = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    hotel        = relationship("Hotel",       back_populates="guests")
    reservations = relationship("Reservation", back_populates="guest")


class Group(Base):
    __tablename__ = "groups"

    id             = Column(Integer, primary_key=True)
    hotel_id       = Column(Integer, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    name           = Column(String(120), nullable=False)
    contact_name   = Column(String(120))
    contact_email  = Column(String(120))
    contact_phone  = Column(String(30))
    arrival_date   = Column(Date, nullable=False)
    departure_date = Column(Date, nullable=False)
    notes          = Column(Text)
    created_at     = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    hotel        = relationship("Hotel",       back_populates="groups")
    reservations = relationship("Reservation", back_populates="group")


class Reservation(Base):
    __tablename__ = "reservations"

    id         = Column(Integer, primary_key=True)
    hotel_id   = Column(Integer, ForeignKey("hotels.id",    ondelete="CASCADE"),  nullable=False)
    room_id    = Column(Integer, ForeignKey("rooms.id",     ondelete="RESTRICT"),  nullable=False)
    guest_id   = Column(Integer, ForeignKey("guests.id",    ondelete="SET NULL"))
    channel_id = Column(Integer, ForeignKey("channels.id",  ondelete="RESTRICT"),  nullable=False)
    group_id   = Column(Integer, ForeignKey("groups.id",    ondelete="SET NULL"))

    check_in   = Column(Date, nullable=False)
    check_out  = Column(Date, nullable=False)
    status     = Column(String(20), nullable=False, default="confirmed")
    notes      = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    tipo_ocupacion = Column(String(20), default="individual")

    hotel   = relationship("Hotel",   back_populates="reservations")
    room    = relationship("Room",    back_populates="reservations")
    guest   = relationship("Guest",   back_populates="reservations")
    channel = relationship("Channel", back_populates="reservations")
    group   = relationship("Group",   back_populates="reservations")

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    hotel_id      = Column(Integer, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=True)
    email         = Column(String(255), unique=True, nullable=False)
    name          = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), nullable=False, default="employee")
    active        = Column(Boolean, nullable=False, default=True)
    created_at    = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    phone         = Column(String(20))
    categoria     = Column(String(50))
    fecha_ingreso = Column(Date)
    
    hotel = relationship("Hotel", back_populates="users")