-- ============================================
-- SEED LOCAL — TOROCELL STORE
-- ============================================
-- Se ejecuta con: supabase db reset
-- ============================================

INSERT INTO roles (name, description, permissions, is_system) VALUES
('superadmin', 'Super Administrador con todos los permisos',
  '["all"]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Password local de desarrollo: admin123 (texto plano, igual que el login local)
INSERT INTO users (name, email, password, role, permissions, is_active) VALUES
(
  'Admin Torocell',
  'admin@torocell.store',
  'admin123',
  'superadmin',
  '["all"]'::jsonb,
  true
)
ON CONFLICT (email) DO NOTHING;

-- Tienda principal (mismo UUID fijo que usa el código)
INSERT INTO stores (id, name, invoice_prefix, is_active, city)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TOROCELL STORE',
  'TC',
  true,
  'Corozal'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  invoice_prefix = EXCLUDED.invoice_prefix,
  is_active = true;

INSERT INTO categories (name, description) VALUES
('Telefonía', 'Teléfonos móviles y accesorios'),
('Accesorios', 'Cables, fundas y periféricos'),
('Audio', 'Audífonos y sonido')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, category_id, brand, reference, price, cost, stock_warehouse, stock_store, status) VALUES
(
  'iPhone 14 128GB',
  'iPhone 14 128GB — demo Torocell',
  (SELECT id FROM categories WHERE name = 'Telefonía' LIMIT 1),
  'Apple',
  'TC-IPH-001',
  3200000,
  2800000,
  5,
  2,
  'active'
),
(
  'Samsung A54 128GB',
  'Galaxy A54 — demo Torocell',
  (SELECT id FROM categories WHERE name = 'Telefonía' LIMIT 1),
  'Samsung',
  'TC-SAM-001',
  1450000,
  1200000,
  8,
  4,
  'active'
),
(
  'Cargador USB-C 20W',
  'Cargador rápido USB-C',
  (SELECT id FROM categories WHERE name = 'Accesorios' LIMIT 1),
  'Genérico',
  'TC-ACC-001',
  45000,
  22000,
  30,
  15,
  'active'
)
ON CONFLICT (reference) DO NOTHING;

INSERT INTO clients (name, email, phone, document, address, city, state, type, status) VALUES
('Cliente Demo', 'demo@torocell.store', '3000000001', '1000000001', 'Calle 1 #1-1', 'Corozal', 'Sucre', 'consumidor_final', 'active')
ON CONFLICT DO NOTHING;

SELECT 'Seed TOROCELL STORE OK' AS message,
       (SELECT COUNT(*) FROM products) AS productos,
       (SELECT COUNT(*) FROM users) AS usuarios,
       (SELECT COUNT(*) FROM stores) AS tiendas;
