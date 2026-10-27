-- =====================================================================
-- RADAR DE PRECIOS NEUQUÉN (CP 8300) - ESQUEMA DE BASE DE DATOS SUPABASE
-- Versión Idempotente (Segura para re-ejecución)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: SUPERMERCADOS Y SUCURSALES FÍSICAS DE NEUQUÉN CAPITAL
CREATE TABLE IF NOT EXISTS public.supermarkets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('minorista', 'mayorista')),
    branch_name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC(9,6) NOT NULL,
    lon NUMERIC(9,6) NOT NULL,
    zone TEXT NOT NULL,
    hours TEXT NOT NULL,
    is_open_now BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA: PRODUCTOS DEL CATÁLOGO
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    ean TEXT UNIQUE,
    image_url TEXT,
    unit TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA: OBSERVACIONES DE PRECIOS VIGENTES
CREATE TABLE IF NOT EXISTS public.price_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    supermarket_id TEXT NOT NULL REFERENCES public.supermarkets(id) ON DELETE CASCADE,
    regular_price NUMERIC(10,2) NOT NULL,
    offer_price NUMERIC(10,2),
    discount_percentage NUMERIC(5,2),
    promo_condition TEXT,
    in_stock BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (product_id, supermarket_id)
);

-- 4. TABLA: HISTORIAL DE PRECIOS
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    supermarket_id TEXT NOT NULL REFERENCES public.supermarkets(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS) - DROP PREVIO SI YA EXISTEN
-- =====================================================================
ALTER TABLE public.supermarkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de supermercados" ON public.supermarkets;
DROP POLICY IF EXISTS "Lectura publica de productos" ON public.products;
DROP POLICY IF EXISTS "Lectura publica de precios" ON public.price_observations;
DROP POLICY IF EXISTS "Lectura publica de historial" ON public.price_history;

CREATE POLICY "Lectura publica de supermercados" ON public.supermarkets FOR SELECT USING (true);
CREATE POLICY "Lectura publica de productos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Lectura publica de precios" ON public.price_observations FOR SELECT USING (true);
CREATE POLICY "Lectura publica de historial" ON public.price_history FOR SELECT USING (true);

-- =====================================================================
-- CARGA INICIAL: SUCURSALES EXACTAS DE NEUQUÉN CAPITAL (CP 8300)
-- =====================================================================
INSERT INTO public.supermarkets (id, name, brand, type, branch_name, address, lat, lon, zone, hours) VALUES
('coto-nqn', 'Coto Hipermercado', 'Coto', 'minorista', 'Sucursal 187 Neuquén', 'Dr. Ramón y Ruta 7 (Alto Comahue Shopping)', -38.941600, -68.055800, 'Centro / Shoppings', '08:30 - 21:30'),
('la-anonima-rioja', 'La Anónima', 'La Anónima', 'minorista', 'Sucursal 24 Centro', 'La Rioja y Roca', -38.951500, -68.061200, 'Centro / Shoppings', '08:30 - 21:30'),
('la-anonima-antartida', 'La Anónima', 'La Anónima', 'minorista', 'Sucursal 32 Antártida', 'Antártida Argentina 1111', -38.946500, -68.072000, 'Centro / Shoppings', '08:30 - 21:30'),
('la-anonima-alta-barda', 'La Anónima', 'La Anónima', 'minorista', 'Sucursal 67 Alta Barda', 'Av. Las Flores y Los Pensamientos', -38.932000, -68.061000, 'Barrios Norte', '08:30 - 21:30'),
('la-anonima-shopping', 'La Anónima', 'La Anónima', 'minorista', 'Sucursal 146 Portal Patagonia', 'J. J. Lastra 2400', -38.959800, -68.093000, 'Corredor Ruta 22', '09:00 - 22:00'),
('la-anonima-lastra', 'La Anónima', 'La Anónima', 'minorista', 'Sucursal 183 Lastra', 'J. J. Lastra y Bejarano', -38.961000, -68.098000, 'Corredor Ruta 22', '08:30 - 21:30'),
('cooperativa-san-martin', 'Cooperativa Obrera', 'Cooperativa Obrera', 'minorista', 'Sucursal 110 Centro', 'San Martín 245', -38.953800, -68.062000, 'Centro / Shoppings', '08:30 - 20:30'),
('cooperativa-chocon', 'Cooperativa Obrera', 'Cooperativa Obrera', 'minorista', 'Sucursal 113 Chocón', 'El Chocón 644 (e/ Bahía Blanca y Linares)', -38.967500, -68.051500, 'Barrios Sur / Río', '08:30 - 20:30'),
('cooperativa-belgrano', 'Cooperativa Obrera', 'Cooperativa Obrera', 'minorista', 'Sucursal 118 Belgrano', 'Belgrano 1650', -38.948000, -68.079000, 'Oeste', '08:30 - 20:30'),
('cooperativa-alta-barda', 'Cooperativa Obrera', 'Cooperativa Obrera', 'minorista', 'Sucursal 134 Alta Barda', 'Av. 25 de Mayo 1230', -38.935000, -68.063000, 'Barrios Norte', '08:30 - 20:30'),
('changomas-perticone', 'ChangoMás', 'ChangoMás', 'minorista', 'Hiper ChangoMás Perticone', 'Perticone 1255 (Colectora Sur Ruta 22)', -38.960200, -68.046500, 'Corredor Ruta 22', '08:00 - 22:00'),
('yaguar-nqn', 'Yaguar Mayorista', 'Yaguar', 'mayorista', 'Sucursal Neuquén', 'Perticone 1805 (Colectora Sur Ruta 22)', -38.960500, -68.040200, 'Corredor Ruta 22', '08:00 - 18:00'),
('vital-nqn', 'Supermayorista Vital', 'Vital', 'mayorista', 'Sucursal 17 Neuquén', 'Félix San Martín 1550 (Colectora Norte Ruta 22)', -38.959200, -68.043500, 'Corredor Ruta 22', '07:30 - 18:30'),
('diarco-nqn', 'Diarco Mayorista', 'Diarco', 'mayorista', 'Sucursal Neuquén', 'Perticone 2405 (Colectora Sur Ruta 22)', -38.961000, -68.032000, 'Corredor Ruta 22', '08:00 - 18:00'),
('makro-nqn', 'Makro Mayorista', 'Makro', 'mayorista', 'Sucursal 22 Neuquén', 'Teodoro Planas 4055 (Ruta 22 Oeste)', -38.959000, -68.125000, 'Ruta 22 Oeste', '08:00 - 19:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- CARGA INICIAL: PRODUCTOS TESTIGO CANASTA BÁSICA NEUQUÉN
-- =====================================================================
INSERT INTO public.products (id, name, brand, category, ean, image_url, unit, description) VALUES
('prod-001', 'Aceite de Girasol Natura 1.5L', 'Natura', 'Almacén', '7790272001005', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80', '1.5 Litros', 'Aceite 100% puro de girasol refinado'),
('prod-002', 'Leche Entera La Serenísima Clásica 1L', 'La Serenísima', 'Lácteos', '7793940428003', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80', '1 Litro (Sachet)', 'Leche entera pasteurizada adicionada con vitaminas A y D'),
('prod-003', 'Yerba Mate Playadito con Palo 1kg', 'Playadito', 'Almacén', '7790387011036', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80', '1 Kilogramo', 'Yerba mate tradicional elaborada con palo'),
('prod-004', 'Fideos Tallarines Matarazzo 500g', 'Matarazzo', 'Almacén', '7790070318048', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80', '500 Gramos', 'Fideos secos semolados al huevo'),
('prod-005', 'Asado Vacuno Especial de Novillito', 'Carnicería Regional', 'Carnes', '2000001005001', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80', '1 Kilogramo', 'Corte parrillero especial vacuno faenado en la región'),
('prod-006', 'Pollo Entero Fresco Calibre 1', 'Soychú', 'Carnes', '2000001006002', 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&q=80', '1 Kilogramo', 'Pollo eviscerado fresco de primera calidad'),
('prod-007', 'Shampoo Herbal Essences Bio:Renew 400ml', 'Herbal Essences', 'Perfumería', '7500435122005', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&q=80', '400 ml', 'Shampoo hidratante con extractos botánicos naturales'),
('prod-008', 'Queso Cremoso Ilolay', 'Ilolay', 'Lácteos', '7790080045002', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&q=80', '1 Kilogramo', 'Queso de pasta blanda ideal para pizzas y tartas'),
('prod-009', 'Harina de Trigo 000 Morixe 1kg', 'Morixe', 'Almacén', '7790174000014', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80', '1 Kilogramo', 'Harina de trigo enriquecida ideal panadería y repostería'),
('prod-010', 'Mayonesa Hellmanns Clásica Doypack 475g', 'Hellmanns', 'Almacén', '7794000591024', 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=500&q=80', '475 Gramos', 'Aderezo a base de mayonesa emulsionada'),
('prod-011', 'Gaseosa Coca-Cola Original 3L', 'Coca-Cola', 'Bebidas', '7790895000997', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80', '3 Litros (No retornable)', 'Bebida sin alcohol carbonatada de extractos vegetales'),
('prod-012', 'Cerveza Heineken Rubia Lata 473ml', 'Heineken', 'Bebidas', '7792798000456', 'https://images.unsplash.com/photo-1608270146059-c2901c5905ec?w=500&q=80', '473 ml (Lata)', 'Cerveza rubia lager premium tipo Pilsen pura malta'),
('prod-013', 'Lavandina Clásica Ayudín 1L', 'Ayudín', 'Limpieza', '7790250012016', 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=500&q=80', '1 Litro', 'Desinfectante concentrado con cloro activo al 55 g/l'),
('prod-014', 'Jabón en Polvo Granby Baja Espuma 800g', 'Granby', 'Limpieza', '7791293021004', 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=500&q=80', '800 Gramos', 'Detergente en polvo multiacción para lavarropas automático'),
('prod-015', 'Desodorante de Ambientes Lysoform Aerosol 360ml', 'Lysoform', 'Limpieza', '7790520008405', 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=500&q=80', '360 ml', 'Desinfectante antibacteriano en aerosol aroma montaña'),
('prod-016', 'Manzana Roja Red Delicious de Río Negro y Neuquén', 'Producción del Valle', 'Frutas y Verduras', '2000001016008', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80', '1 Kilogramo', 'Manzana seleccionada del Alto Valle de Río Negro y Neuquén'),
('prod-017', 'Pan de Mesa Fargo Blanco Rodajas 550g', 'Fargo', 'Panadería', '7790040112003', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80', '550 Gramos', 'Pan lacteado feteado tradicional')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- CARGA INICIAL: OBSERVACIONES DE PRECIOS VIGENTES EN NEUQUÉN
-- =====================================================================
INSERT INTO public.price_observations (product_id, supermarket_id, regular_price, offer_price, discount_percentage, promo_condition, in_stock) VALUES
-- Aceite Natura
('prod-001', 'coto-nqn', 3890.00, 3112.00, 20.00, '20% con Comunidad Coto', true),
('prod-001', 'cooperativa-chocon', 3450.00, 2990.00, 13.33, 'Precio Fiel Asociados', true),
('prod-001', 'la-anonima-rioja', 3990.00, 3990.00, 0.00, NULL, true),
('prod-001', 'yaguar-nqn', 2850.00, 2750.00, 3.51, 'Llevando 6 unidades o más', true),
('prod-001', 'makro-nqn', 2890.00, 2890.00, 0.00, NULL, true),
('prod-001', 'vital-nqn', 2790.00, 2690.00, 3.58, 'Precio Mayorista bulto cerrado', true),

-- Leche La Serenísima
('prod-002', 'coto-nqn', 1450.00, 1290.00, 11.03, 'Promo Semanal', true),
('prod-002', 'cooperativa-chocon', 1390.00, 1190.00, 14.39, 'Ahorro Cooperativo Mi Coope', true),
('prod-002', 'la-anonima-rioja', 1480.00, 1480.00, 0.00, NULL, true),
('prod-002', 'changomas-perticone', 1420.00, 1250.00, 11.97, 'Precios que la Rompen', true),
('prod-002', 'yaguar-nqn', 1180.00, 1180.00, 0.00, NULL, true),

-- Yerba Playadito
('prod-003', 'coto-nqn', 4690.00, 3986.50, 15.00, '15% de descuento en el acto', true),
('prod-003', 'cooperativa-san-martin', 4490.00, 3890.00, 13.36, 'Oferta Mi Coope', true),
('prod-003', 'la-anonima-rioja', 4850.00, 4850.00, 0.00, NULL, true),
('prod-003', 'makro-nqn', 3750.00, 3600.00, 4.00, 'Llevando caja x 10 unidades', true),
('prod-003', 'vital-nqn', 3690.00, 3690.00, 0.00, NULL, true),

-- Fideos Matarazzo
('prod-004', 'coto-nqn', 1650.00, 1155.00, 30.00, '70% en la 2da unidad llevando 2', true),
('prod-004', 'cooperativa-chocon', 1520.00, 1290.00, 15.13, 'Oferta Quincenal', true),
('prod-004', 'la-anonima-rioja', 1690.00, 1690.00, 0.00, NULL, true),
('prod-004', 'yaguar-nqn', 1190.00, 1090.00, 8.40, 'Por bulto cerrado x 20', true),
('prod-004', 'changomas-perticone', 1580.00, 1264.00, 20.00, 'Super Descuento Más', true),

-- Asado Vacuno
('prod-005', 'coto-nqn', 10490.00, 8990.00, 14.30, 'Viernes y Sábados de Carnes', true),
('prod-005', 'cooperativa-chocon', 9800.00, 8490.00, 13.37, 'Jueves y Domingos de Asado', true),
('prod-005', 'la-anonima-rioja', 10900.00, 10900.00, 0.00, NULL, true),
('prod-005', 'changomas-perticone', 9900.00, 8790.00, 11.21, 'Parrillada Fin de Semana', true),

-- Pollo Entero
('prod-006', 'coto-nqn', 3190.00, 2690.00, 15.67, 'Promo Frescos Coto', true),
('prod-006', 'cooperativa-chocon', 2990.00, 2490.00, 16.72, 'Miércoles de Granja', true),
('prod-006', 'la-anonima-rioja', 3290.00, 3290.00, 0.00, NULL, true),
('prod-006', 'yaguar-nqn', 2390.00, 2250.00, 5.86, 'Cajón cerrado x 20kg', true),

-- Gaseosa Coca-Cola 3L
('prod-011', 'coto-nqn', 4450.00, 3782.50, 15.00, 'Fin de semana Gigante', true),
('prod-011', 'cooperativa-san-martin', 4290.00, 3690.00, 13.99, 'Promo Ahorro Bebidas', true),
('prod-011', 'la-anonima-rioja', 4590.00, 4590.00, 0.00, NULL, true),
('prod-011', 'vital-nqn', 3590.00, 3390.00, 5.57, 'Pack x 6 unidades', true)
ON CONFLICT (product_id, supermarket_id) DO UPDATE 
SET regular_price = EXCLUDED.regular_price,
    offer_price = EXCLUDED.offer_price,
    discount_percentage = EXCLUDED.discount_percentage,
    promo_condition = EXCLUDED.promo_condition,
    updated_at = timezone('utc'::text, now());
