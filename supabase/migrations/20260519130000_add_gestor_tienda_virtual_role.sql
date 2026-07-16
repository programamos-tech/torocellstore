-- Rol sistema: gestor de catálogo público (/tienda) — imágenes y precio tienda virtual.

INSERT INTO public.roles (name, description, permissions, is_system)
SELECT
  'Gestor Tienda Virtual',
  'Gestiona imágenes y precios del catálogo público en /tienda',
  '[{"module":"virtual_store","actions":["view","edit"]}]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE lower(name) = lower('Gestor Tienda Virtual')
);
