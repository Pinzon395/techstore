-- Fuente contable explícita para las salidas del Dashboard.
-- No intenta inferir gastos desde ventas: cada movimiento conserva fecha, categoría y autor.
CREATE TABLE IF NOT EXISTS business_expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  category ENUM('PURCHASE','PART','OPERATING','SERVICE','TAX','OTHER') NOT NULL DEFAULT 'OTHER',
  description VARCHAR(180) NOT NULL,
  amount DECIMAL(12,2) UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  incurred_on DATE NOT NULL,
  commerce_order_id BIGINT UNSIGNED NULL,
  repair_id BIGINT UNSIGNED NULL,
  created_by CHAR(36) NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_business_expenses_public_id (public_id),
  KEY idx_business_expenses_period (incurred_on, deleted_at),
  KEY idx_business_expenses_category_period (category, incurred_on),
  KEY idx_business_expenses_commerce_order (commerce_order_id),
  KEY idx_business_expenses_repair (repair_id)
) ENGINE=InnoDB;
