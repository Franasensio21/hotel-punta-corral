-- =============================================================
-- HOTEL SYSTEM — Schema principal
-- Compatible con PostgreSQL 14+
-- Diseñado para multi-hotel desde el día uno (hotel_id en todo)
-- =============================================================

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABLA: hotels
-- Cada propiedad es un registro. Un solo hotel hoy,
-- pero la arquitectura ya soporta múltiples.
-- =============================================================
CREATE TABLE hotels (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120)  NOT NULL,
    slug        VARCHAR(60)   NOT NULL UNIQUE,   -- ej: "hostal-sol" (para URLs y JSON)
    city        VARCHAR(80),
    address     TEXT,
    phone       VARCHAR(30),
    email       VARCHAR(120),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLA: rooms (habitaciones)
-- type refleja la capacidad: double, triple, quad, quintuple
-- capacity = cantidad de camas/personas máxima
-- =============================================================
CREATE TABLE rooms (
    id          SERIAL PRIMARY KEY,
    hotel_id    INTEGER       NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    number      VARCHAR(10)   NOT NULL,           -- ej: "101", "A2"
    type        VARCHAR(20)   NOT NULL            -- double | triple | quad | quintuple
                CHECK (type IN ('double','triple','quad','quintuple')),
    capacity    SMALLINT      NOT NULL CHECK (capacity BETWEEN 2 AND 5),
    floor       SMALLINT,
    description TEXT,
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    UNIQUE (hotel_id, number)                     -- nro único por hotel
);

-- =============================================================
-- TABLA: channels (canales de reserva)
-- Datos de referencia: Booking, Directa, Gmail, Grupo, etc.
-- =============================================================
CREATE TABLE channels (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(60)  NOT NULL,
    slug    VARCHAR(30)  NOT NULL UNIQUE          -- booking | direct | email | group | other
);

-- Valores iniciales
INSERT INTO channels (name, slug) VALUES
    ('Booking.com',     'booking'),
    ('Reserva directa', 'direct'),
    ('Gmail / Email',   'email'),
    ('Grupo',           'group'),
    ('Otro',            'other');

-- =============================================================
-- TABLA: guests (clientes)
-- Un huésped puede repetirse entre estadías.
-- hotel_id permite que cada hotel tenga su propia base de clientes.
-- =============================================================
CREATE TABLE guests (
    id           SERIAL PRIMARY KEY,
    hotel_id     INTEGER      NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    email        VARCHAR(120),
    phone        VARCHAR(30),
    nationality  CHAR(2),                        -- código ISO-3166 ej: "AR", "BR"
    id_number    VARCHAR(30),                    -- DNI / pasaporte
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guests_hotel    ON guests(hotel_id);
CREATE INDEX idx_guests_email    ON guests(hotel_id, email);

-- =============================================================
-- TABLA: groups (reservas grupales)
-- Un grupo agrupa múltiples reservas individuales.
-- Puede ser un grupo escolar, delegación, agencia, etc.
-- =============================================================
CREATE TABLE groups (
    id             SERIAL PRIMARY KEY,
    hotel_id       INTEGER      NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name           VARCHAR(120) NOT NULL,         -- ej: "Grupo Scouts Mar del Plata"
    contact_name   VARCHAR(120),
    contact_email  VARCHAR(120),
    contact_phone  VARCHAR(30),
    arrival_date   DATE         NOT NULL,
    departure_date DATE         NOT NULL,
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CHECK (departure_date > arrival_date)
);

CREATE INDEX idx_groups_hotel        ON groups(hotel_id);
CREATE INDEX idx_groups_arrival      ON groups(hotel_id, arrival_date);

-- =============================================================
-- TABLA: reservations (reservas)
-- Es la tabla central. Cada fila = una habitación reservada
-- para un huésped, con un rango de fechas (check_in/check_out).
--
-- NOTA: check_out es la fecha de salida (no inclusiva).
--   Una reserva del 10 al 12 ocupa las noches del 10 y del 11.
--   La consulta de disponibilidad usa: check_in <= fecha < check_out
-- =============================================================
CREATE TABLE reservations (
    id          SERIAL PRIMARY KEY,
    hotel_id    INTEGER     NOT NULL REFERENCES hotels(id)    ON DELETE CASCADE,
    room_id     INTEGER     NOT NULL REFERENCES rooms(id)     ON DELETE RESTRICT,
    guest_id    INTEGER              REFERENCES guests(id)    ON DELETE SET NULL,
    channel_id  INTEGER     NOT NULL REFERENCES channels(id)  ON DELETE RESTRICT,
    group_id    INTEGER              REFERENCES groups(id)    ON DELETE SET NULL,

    check_in    DATE        NOT NULL,
    check_out   DATE        NOT NULL,

    status      VARCHAR(20) NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed','pending','cancelled','no_show')),

    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (check_out > check_in),

    -- Clave única: una habitación no puede tener dos reservas activas
    -- que se solapan. Se refuerza también con la función de validación abajo.
    UNIQUE (hotel_id, room_id, check_in)         -- punto de partida; la función cubre solapamiento
);

CREATE INDEX idx_res_hotel          ON reservations(hotel_id);
CREATE INDEX idx_res_room           ON reservations(room_id);
CREATE INDEX idx_res_dates          ON reservations(hotel_id, check_in, check_out);
CREATE INDEX idx_res_status         ON reservations(hotel_id, status);
CREATE INDEX idx_res_channel        ON reservations(hotel_id, channel_id);
CREATE INDEX idx_res_group          ON reservations(hotel_id, group_id);

-- =============================================================
-- FUNCIÓN + TRIGGER: evitar solapamiento de reservas
-- Antes de insertar o actualizar, verifica que no haya otra
-- reserva activa (confirmed o pending) para la misma habitación
-- en el mismo rango de fechas.
-- =============================================================
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM reservations
        WHERE  room_id   = NEW.room_id
          AND  id       != COALESCE(NEW.id, -1)
          AND  status   IN ('confirmed', 'pending')
          AND  check_in  < NEW.check_out
          AND  check_out > NEW.check_in
    ) THEN
        RAISE EXCEPTION
            'La habitación % ya tiene una reserva activa en ese rango de fechas.',
            NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_overlap
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION check_reservation_overlap();

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- VISTA: availability_view
-- Facilita consultar disponibilidad sin escribir JOINs cada vez.
-- El backend y los scripts la usan directamente.
-- =============================================================
CREATE OR REPLACE VIEW availability_view AS
SELECT
    r.hotel_id,
    r.id           AS room_id,
    r.number       AS room_number,
    r.type         AS room_type,
    r.capacity,
    res.id         AS reservation_id,
    res.check_in,
    res.check_out,
    res.status     AS reservation_status,
    c.slug         AS channel_slug,
    c.name         AS channel_name,
    g.name         AS guest_name,
    grp.name       AS group_name
FROM rooms r
LEFT JOIN reservations res
       ON res.room_id  = r.id
      AND res.status  IN ('confirmed', 'pending')
LEFT JOIN channels c   ON c.id  = res.channel_id
LEFT JOIN guests g     ON g.id  = res.guest_id
LEFT JOIN groups grp   ON grp.id = res.group_id;
