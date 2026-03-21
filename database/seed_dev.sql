-- =============================================================
-- HOTEL SYSTEM — Datos de ejemplo para desarrollo y testing
-- Ejecutar DESPUÉS de schema.sql
-- =============================================================

-- Hotel de ejemplo
INSERT INTO hotels (name, slug, city, address, phone, email) VALUES
    ('Hostal El Puerto', 'hostal-el-puerto', 'Mar del Plata',
     'Av. Colón 1234', '+54 223 000-0000', 'info@hostalpuerto.com');

-- 30 habitaciones: mezcla realista de tipos
-- Planta baja: 6 habitaciones dobles (101-106)
-- Primer piso: 8 habitaciones (201-208, mezcla dobles y triples)
-- Segundo piso: 10 habitaciones (301-310, triples y cuádruples)
-- Tercer piso: 6 habitaciones (401-406, cuádruples y quíntuples)

INSERT INTO rooms (hotel_id, number, type, capacity, floor) VALUES
-- Planta baja — dobles
(1, '101', 'double',    2, 0),
(1, '102', 'double',    2, 0),
(1, '103', 'double',    2, 0),
(1, '104', 'double',    2, 0),
(1, '105', 'double',    2, 0),
(1, '106', 'double',    2, 0),
-- Primer piso — dobles y triples
(1, '201', 'double',    2, 1),
(1, '202', 'double',    2, 1),
(1, '203', 'triple',    3, 1),
(1, '204', 'triple',    3, 1),
(1, '205', 'triple',    3, 1),
(1, '206', 'triple',    3, 1),
(1, '207', 'triple',    3, 1),
(1, '208', 'triple',    3, 1),
-- Segundo piso — triples y cuádruples
(1, '301', 'triple',    3, 2),
(1, '302', 'triple',    3, 2),
(1, '303', 'quad',      4, 2),
(1, '304', 'quad',      4, 2),
(1, '305', 'quad',      4, 2),
(1, '306', 'quad',      4, 2),
(1, '307', 'quad',      4, 2),
(1, '308', 'quad',      4, 2),
(1, '309', 'quad',      4, 2),
(1, '310', 'quad',      4, 2),
-- Tercer piso — cuádruples y quíntuples
(1, '401', 'quad',      4, 3),
(1, '402', 'quad',      4, 3),
(1, '403', 'quintuple', 5, 3),
(1, '404', 'quintuple', 5, 3),
(1, '405', 'quintuple', 5, 3),
(1, '406', 'quintuple', 5, 3);

-- Huéspedes de ejemplo
INSERT INTO guests (hotel_id, name, email, phone, nationality) VALUES
(1, 'Ana García',       'ana@email.com',     '+54 9 11 1111-1111', 'AR'),
(1, 'Carlos López',     'carlos@email.com',  '+54 9 11 2222-2222', 'AR'),
(1, 'Maria Silva',      'maria@email.com',   '+55 11 3333-3333',   'BR'),
(1, 'John Smith',       'john@email.com',    '+1 555 4444',        'US'),
(1, 'Contact Grupo A',  'grupo@scouts.com',  '+54 9 223 5555-555', 'AR');

-- Grupo de ejemplo
INSERT INTO groups (hotel_id, name, contact_name, contact_email, arrival_date, departure_date) VALUES
(1, 'Scouts Mar del Plata', 'Contact Grupo A', 'grupo@scouts.com',
 CURRENT_DATE + 30, CURRENT_DATE + 35);

-- Reservas de ejemplo (fechas relativas a hoy para que siempre sean válidas)
INSERT INTO reservations (hotel_id, room_id, guest_id, channel_id, check_in, check_out, status) VALUES
-- Reserva directa, hab 101, semana próxima
(1, 1, 1, 2, CURRENT_DATE + 7,  CURRENT_DATE + 10, 'confirmed'),
-- Booking, hab 102
(1, 2, 2, 1, CURRENT_DATE + 5,  CURRENT_DATE + 8,  'confirmed'),
-- Gmail, hab 201
(1, 9, 3, 3, CURRENT_DATE + 14, CURRENT_DATE + 17, 'pending'),
-- Grupo scouts: toma habitaciones 301-304
(1, 17, 5, 4, CURRENT_DATE + 30, CURRENT_DATE + 35, 'confirmed'),
(1, 18, 5, 4, CURRENT_DATE + 30, CURRENT_DATE + 35, 'confirmed'),
(1, 19, 5, 4, CURRENT_DATE + 30, CURRENT_DATE + 35, 'confirmed'),
(1, 20, 5, 4, CURRENT_DATE + 30, CURRENT_DATE + 35, 'confirmed');

-- Actualizar group_id en las reservas del grupo
UPDATE reservations
SET group_id = 1
WHERE room_id IN (17, 18, 19, 20)
  AND channel_id = 4;
