-- Seed data for Capiatá Conecta Categories

INSERT INTO public.categories (name, slug, icon, color, description) VALUES
('Servicios Técnicos y Oficios', 'servicios-tecnicos', 'Wrench', '#1E3A5F', 'Electricidad, plomería, mecánica, reparaciones y soporte técnico'),
('Construcción y Hogar', 'construccion-hogar', 'Home', '#D97706', 'Materiales, albañilería, pintura, fletes, muebles y jardinería'),
('Gastronomía y Comidas', 'gastronomia-comidas', 'Utensils', '#DC2626', 'Rotiserías, bocaditos, tortas, minutas y catering para eventos'),
('Moda y Calzados', 'moda-calzados', 'ShoppingBag', '#EC4899', 'Ropa, calzados, accesorios, confección y arreglos'),
('Electrónica y Celulares', 'electronica-celulares', 'Smartphone', '#2563EB', 'Celulares, computadoras, accesorios y servicio de reparación'),
('Vehículos y Motos', 'vehiculos-motos', 'Car', '#059669', 'Autos, motos, repuestos, talleres y mantenimiento'),
('Salud y Belleza', 'salud-belleza', 'Heart', '#8B5CF6', 'Peluquería, barbería, manicura, farmacia y cuidado personal'),
('Educación y Clases', 'educacion-clases', 'GraduationCap', '#0284C7', 'Tutorías escolares, cursos particulares, idiomas y talleres'),
('Inmuebles y Alquileres', 'inmuebles-alquileres', 'Building', '#4B5563', 'Casas, terrenos, departamentos, salones comerciales y alquileres'),
('Empleos y Trabajo', 'empleos-trabajo', 'Briefcase', '#15803D', 'Ofertas laborales, personas buscando empleo y trabajos temporales'),
('Mascotas y Animales', 'mascotas-animales', 'Dog', '#F59E0B', 'Veterinarias, alimentos, accesorios, peluquería canina y adopción'),
('Eventos y Fiestas', 'eventos-fiestas', 'PartyPopper', '#9333EA', 'Decoración, alquiler de sillas/mesas, sonido, animación e inflables'),
('Deportes y Hobbies', 'deportes-hobbies', 'Dumbbell', '#06B6D4', 'Bicicletas, equipos deportivos, instrumentos musicales y artesanías'),
('Varios y Ocasión', 'varios-ocasion', 'Tag', '#64748B', 'Artículos variados, usados en buen estado y oportunidad')
ON CONFLICT (slug) DO NOTHING;
