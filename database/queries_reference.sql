-- =============================================================
-- HOTEL SYSTEM — Queries de referencia
-- Estas son las consultas que usa el backend y los scripts.
-- Guardadas aquí como documentación viva.
-- =============================================================


-- -----------------------------------------------------------
-- 1. DISPONIBILIDAD EN UNA FECHA
--    Devuelve todas las habitaciones con su estado para un día.
--    "Ocupada" = tiene reserva activa que cubre ese día.
-- -----------------------------------------------------------
-- Reemplazar :fecha y :hotel_id con los valores reales
SELECT
    r.id           AS room_id,
    r.number       AS room_number,
    r.type         AS room_type,
    r.capacity,
    CASE
        WHEN res.id IS NOT NULL THEN 'occupied'
        ELSE 'available'
    END            AS status,
    c.slug         AS channel,
    g.name         AS guest_name,
    grp.name       AS group_name
FROM rooms r
LEFT JOIN reservations res
       ON res.room_id   = r.id
      AND res.status   IN ('confirmed', 'pending')
      AND res.check_in  <= :fecha
      AND res.check_out >  :fecha
LEFT JOIN channels c   ON c.id  = res.channel_id
LEFT JOIN guests g     ON g.id  = res.guest_id
LEFT JOIN groups grp   ON grp.id = res.group_id
WHERE r.hotel_id = :hotel_id
  AND r.active   = TRUE
ORDER BY r.number;


-- -----------------------------------------------------------
-- 2. DISPONIBILIDAD EN UN RANGO
--    ¿Qué habitaciones están libres entre dos fechas?
--    Útil para mostrar qué se puede reservar.
-- -----------------------------------------------------------
SELECT
    r.id, r.number, r.type, r.capacity
FROM rooms r
WHERE r.hotel_id = :hotel_id
  AND r.active   = TRUE
  AND r.id NOT IN (
      SELECT room_id FROM reservations
      WHERE  status  IN ('confirmed', 'pending')
        AND  check_in  < :fecha_out
        AND  check_out > :fecha_in
  )
ORDER BY r.number;


-- -----------------------------------------------------------
-- 3. OCUPACIÓN POR TIPO EN UNA FECHA
--    Cuántas habitaciones de cada tipo están ocupadas/libres.
-- -----------------------------------------------------------
SELECT
    r.type,
    COUNT(*)                                    AS total,
    COUNT(res.id)                               AS occupied,
    COUNT(*) - COUNT(res.id)                    AS available
FROM rooms r
LEFT JOIN reservations res
       ON res.room_id   = r.id
      AND res.status   IN ('confirmed', 'pending')
      AND res.check_in  <= :fecha
      AND res.check_out >  :fecha
WHERE r.hotel_id = :hotel_id
  AND r.active   = TRUE
GROUP BY r.type
ORDER BY r.type;


-- -----------------------------------------------------------
-- 4. RESERVAS DE UN GRUPO
-- -----------------------------------------------------------
SELECT
    res.id,
    r.number  AS room_number,
    r.type    AS room_type,
    g.name    AS guest_name,
    res.check_in,
    res.check_out,
    res.status
FROM reservations res
JOIN rooms   r ON r.id  = res.room_id
LEFT JOIN guests g ON g.id = res.guest_id
WHERE res.group_id  = :group_id
  AND res.hotel_id  = :hotel_id
ORDER BY r.number;


-- -----------------------------------------------------------
-- 5. OCUPACIÓN PRÓXIMOS 30 DÍAS (para dashboard)
-- -----------------------------------------------------------
WITH dates AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '29 days',
        '1 day'
    )::DATE AS fecha
),
total_rooms AS (
    SELECT COUNT(*) AS total FROM rooms
    WHERE hotel_id = :hotel_id AND active = TRUE
)
SELECT
    d.fecha,
    COUNT(res.id)                           AS occupied,
    tr.total - COUNT(res.id)               AS available,
    ROUND(COUNT(res.id)::NUMERIC / tr.total * 100, 1) AS occupancy_pct
FROM dates d
CROSS JOIN total_rooms tr
LEFT JOIN reservations res
       ON res.hotel_id  = :hotel_id
      AND res.status   IN ('confirmed', 'pending')
      AND res.check_in  <= d.fecha
      AND res.check_out >  d.fecha
GROUP BY d.fecha, tr.total
ORDER BY d.fecha;
