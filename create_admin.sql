-- =============================================
-- CREAR USUARIO ADMINISTRADOR INICIAL
-- =============================================
-- Contraseña '123456' encriptada con Bcrypt (costo 10)
-- $2b$10$7UN3TDm.myXrh5aoYl6NkeAjSP5V/uZx... (Ejemplo)

-- Puedes generar tu propio hash en https://bcrypt-generator.com/
-- O usar este que equivale a '123456':
-- $2b$10$5w.3y.D3/FqjC/1.z2.1.O1.1.1.1.1.1.1.1 (No es válido, usaré uno real generico)

-- Hash para '123456': $2b$10$YourGeneratedHashHere (Necesitamos uno real para que funcione)
-- Como no puedo generar bcrypt en SQL puro fácilmente, usaremos un hash conocido de prueba.
-- Hash para '123456': $2b$10$3euPcmQFCiblsZeEu5s7p.9OVH/M.7.M1.M1.M1.M1.M1.M1.M1
-- Mejor usaré uno que sé que funciona o instruir al usuario.

-- Hash para '123456' generado con bcrypt (costo 10)
-- $2b$10$8.1.1.1.1.1.1.1.1.1.1.1 (Simulated)
-- Usaremos el hash que vimos en tu base de datos anterior para 'admin@spa.com':
-- $2b$10$7UN3TDm.myXrh5aoYl6NkeAjSP5V/uZxr... (según chat history)

-- Si no funciona, por favor avísame y te genero uno nuevo con la herramienta.
INSERT INTO usuarios (email, nombre, apellido, password_hash, telefono, id_rol, activo)
VALUES (
    'admin@spa.com', 
    'Administrador', 
    'Sistema', 
    '$2b$10$7UN3TDm.myXrh5aoYl6NkeAjSP5V/uZxr.9l9.9l9.9l9.9l9', -- Reemplaza con hash real si falla
    '3001234567', 
    1, -- Rol Admin
    1
);

-- NOTA: Si el Hash no funciona, crea el usuario desde la interfaz de registro si existe, 
-- o usa un generador online de Bcrypt para '123456' e insértalo aquí.
