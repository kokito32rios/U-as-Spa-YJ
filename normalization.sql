SET FOREIGN_KEY_CHECKS=0;

-- 0. Drop existing Foreign Key to unblock changes
-- (Try-catch not available in standard MySQL script, so we assume it exists based on screenshot)
ALTER TABLE usuarios DROP FOREIGN KEY usuarios_ibfk_1;

-- 1. Modify ROLES table to add ID
ALTER TABLE roles DROP PRIMARY KEY;
ALTER TABLE roles ADD COLUMN id_rol INT AUTO_INCREMENT PRIMARY KEY FIRST;
-- Ensure nombre_rol is unique
ALTER TABLE roles ADD UNIQUE INDEX idx_nombre_rol (nombre_rol);

-- 2. Modify USUARIOS table structure
-- User Requirement: Email MUST remain the Primary Key.
-- We only add id_rol to normalize the role relation.
ALTER TABLE usuarios ADD COLUMN id_rol INT AFTER email;

-- 3. Migrate data: Link usuarios to roles via ID
UPDATE usuarios u 
JOIN roles r ON u.nombre_rol = r.nombre_rol 
SET u.id_rol = r.id_rol;

-- 4. Clean up USUARIOS table
-- Validate that all users have a role ID before dropping the column (Optional safety check in manual run)
ALTER TABLE usuarios DROP COLUMN nombre_rol;

-- 5. Add Foreign Key for integrity
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol);

-- 6. Insert default roles if they don't exist (Safety net)
INSERT IGNORE INTO roles (nombre_rol, descripcion) VALUES 
('admin', 'Administrador del sistema'),
('manicurista', 'Profesional de servicios'),
('usuario', 'Cliente regular');

SET FOREIGN_KEY_CHECKS=1;
