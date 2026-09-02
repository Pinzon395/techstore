-- Indices respaldados por los planes EXPLAIN de las agregaciones temporales del Dashboard.
-- repairs solo tenia created_at detras de status/user; el resumen global por periodo no podia usarlo.
ALTER TABLE repairs
  ADD KEY idx_repairs_created_at_deleted (created_at, deleted_at);

-- Los pagos se agrupan por estado y fecha de registro; los indices existentes terminaban en uploaded_at.
ALTER TABLE commerce_payments
  ADD KEY idx_commerce_payments_status_created (status, created_at);
