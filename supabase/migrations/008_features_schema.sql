-- 008_features_schema.sql
-- P1: campos base para las features de P2/P3/P4.
-- 100% aditivo e idempotente: no rompe datos ni funciones existentes.

-- §3.2-E  Categorías de producto (texto libre, opcional)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;

-- §3.2-D  Fecha real de venta (se poblará al "marcar entregado" en P3; clave para el BI)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- §3.2-C  Override de total: marca si el total fue fijado manualmente por Emi
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_personalizado BOOLEAN NOT NULL DEFAULT FALSE;

-- §3.1-B  Búsqueda de pedido abierto por teléfono
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
