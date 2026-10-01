-- 012_update_workshop_hours.sql
-- Actualiza los horarios de atencion de taller en appointment_settings:
-- Lunes a Sabado: 11:00 AM a 10:00 PM (11:00:00 a 22:00:00)
-- Domingo: 11:00 AM a 6:00 PM (11:00:00 a 18:00:00)
-- Slots de 30 minutos

UPDATE appointment_settings 
SET start_time = '11:00:00', end_time = '22:00:00', slot_minutes = 30 
WHERE weekday BETWEEN 1 AND 6;

UPDATE appointment_settings 
SET start_time = '11:00:00', end_time = '18:00:00', slot_minutes = 30 
WHERE weekday = 0;
