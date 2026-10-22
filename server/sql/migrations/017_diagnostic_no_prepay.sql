-- 017_diagnostic_no_prepay.sql
-- Política 2026-10-22: el diagnóstico ($600 MXN) ya no se cobra por adelantado para agendar.
-- Se abona completo a la reparación y solo se paga si el cliente decide no reparar.
-- Con requires_payment = 1 las citas en línea quedaban en PENDING_PAYMENT y expiraban a los
-- hold_duration_minutes (15 min por defecto) si nadie confirmaba el pago.
-- Idempotente.

UPDATE appointment_type_configs
SET requires_payment = 0
WHERE appointment_type = 'DIAGNOSTIC';
