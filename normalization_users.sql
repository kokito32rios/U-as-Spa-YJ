-- SCRIPT SOLO PARA LA TABLA USUARIOS
-- (Asume que la tabla ROLES ya fue modificada exitosamente)

SET FOREIGN_KEY_CHECKS=0;
SET SQL_SAFE_UPDATES=0;

-- 1. Agregar columna id_rol (sin tocar la PK email)
-- Usamos IF NOT EXISTS (mariadb/mysql 8+) o ignoramos el error si ya existe manualmente
-- Si falla diciendo "Duplicate column", es que ya existe, puedes comentar esta línea.
ALTER TABLE usuarios ADD COLUMN id_rol INT AFTER email;

-- 2. Migrar datos: Llenar id_rol basado en nombre_rol
UPDATE usuarios u 
JOIN roles r ON u.nombre_rol = r.nombre_rol 
SET u.id_rol = r.id_rol;

-- 3. Limpiar tabla usuarios (borrar nombre_rol antiguo)
ALTER TABLE usuarios DROP COLUMN nombre_rol;

-- 4. Agregar restricción de llave foránea
-- Primero borramos la vieja si existe (por seguridad)
-- ALTER TABLE usuarios DROP FOREIGN KEY usuarios_ibfk_1; 

ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol);

SET FOREIGN_KEY_CHECKS=1;
