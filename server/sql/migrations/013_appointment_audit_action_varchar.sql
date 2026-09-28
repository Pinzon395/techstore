-- 013_appointment_audit_action_varchar.sql
-- appointment_audit_logs.action era un ENUM con un vocabulario distinto al de
-- appointments.status (CHECK_IN vs CHECKED_IN, COMPLETE vs COMPLETED, CANCEL
-- vs CANCELLED_BY_ADMIN/CANCELLED_BY_CUSTOMER, RESCHEDULE vs RESCHEDULED).
-- updateStatus() escribia el status crudo como action: MySQL rechazaba el
-- valor ("Data truncated for column 'action'"), el UPDATE de appointments.status
-- ya habia comprometido (no estan en una transaccion), y el error del audit
-- log se propagaba como 400 al cliente, dejando la UI en estado obsoleto sin
-- reflejar el cambio real. Se elimina el ENUM para que cualquier valor de
-- status (actual o futuro) sea un action_log valido sin mantener dos listas
-- sincronizadas a mano.
ALTER TABLE appointment_audit_logs
  MODIFY COLUMN action VARCHAR(32) NOT NULL;
