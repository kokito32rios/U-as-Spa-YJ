-- =============================================
-- CREAR LA BASE DE DATOS LIMPIA
-- =============================================
DROP DATABASE IF EXISTS spa_unas;
CREATE DATABASE spa_unas 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE spa_unas;

-- =============================================
-- 1. ROLES (Normalizada con ID numérico)
-- =============================================
CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Roles del sistema: admin, manicurista, cliente';

-- Insertar roles por defecto
INSERT INTO roles (nombre_rol, descripcion) VALUES 
('admin', 'Administrador del sistema'),
('manicurista', 'Profesional de servicios'),
('usuario', 'Cliente regular');

-- =============================================
-- 2. USUARIOS (Email PK, id_rol FK)
-- =============================================
CREATE TABLE usuarios (
    email VARCHAR(255) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) DEFAULT NULL,
    id_rol INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1 COMMENT '1=activo, 0=inactivo/bloqueado',
    
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_rol (id_rol),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Todos los usuarios: admin, manicuristas y clientes';

-- =============================================
-- 3. SERVICIOS
-- =============================================
CREATE TABLE servicios (
    id_servicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    precio DECIMAL(10,2) NOT NULL,
    duracion_minutos SMALLINT NOT NULL CHECK (duracion_minutos > 0),
    descripcion TEXT DEFAULT NULL,
    observaciones TEXT DEFAULT NULL, -- Campo agregado recientemente
    activo TINYINT(1) DEFAULT 1,
    
    INDEX idx_nombre (nombre),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Tipos de servicios ofrecidos';

-- Insertar servicios iniciales
INSERT INTO servicios (nombre, precio, duracion_minutos, descripcion, activo) VALUES
('Manicura Tradicional', 35000, 60, 'Limado, cutícula, esmaltado y crema hidratante', 1),
('Manicura en Gel', 55000, 60, 'Aplicación de esmalte semipermanente con secado UV', 1),
('Pedicura Spa', 45000, 60, 'Baño de pies, exfoliación, limado, cutícula y esmaltado', 1),
('Uñas Acrílicas', 80000, 120, 'Extensión con acrílico, forma personalizada', 1),
('Diseño de Uñas', 15000, 30, 'Diseño artístico sobre manicura o pedicura', 1),
('Kapping Gel', 70000, 90, 'Recubrimiento de gel para fortalecer', 1);

-- =============================================
-- 4. HORARIOS DE TRABAJO
-- =============================================
CREATE TABLE horarios_trabajo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_manicurista VARCHAR(255) NOT NULL,
    dia_semana TINYINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=lunes, 7=domingo
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    
    FOREIGN KEY (email_manicurista) REFERENCES usuarios(email) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    UNIQUE KEY uk_manicurista_dia (email_manicurista, dia_semana),
    INDEX idx_manicurista (email_manicurista)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. EXCEPCIONES DE HORARIO
-- =============================================
CREATE TABLE excepciones_horario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_manicurista VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    todo_el_dia TINYINT(1) DEFAULT 1,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    motivo VARCHAR(150) DEFAULT NULL,
    
    FOREIGN KEY (email_manicurista) REFERENCES usuarios(email) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    UNIQUE KEY uk_excepcion (email_manicurista, fecha),
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. CITAS
-- =============================================
CREATE TABLE citas (
    id_cita BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_cliente VARCHAR(255) NOT NULL,
    email_manicurista VARCHAR(255) NOT NULL,
    id_servicio INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' 
        CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio')),
    precio DECIMAL(10, 2) DEFAULT 0, -- Precio al momento de la cita
    notas_cliente TEXT DEFAULT NULL,
    notas_manicurista TEXT DEFAULT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (email_cliente) REFERENCES usuarios(email) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (email_manicurista) REFERENCES usuarios(email) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_manicurista_fecha (email_manicurista, fecha),
    INDEX idx_fecha_estado (fecha, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. COMISIONES POR MANICURISTA
-- =============================================
CREATE TABLE comisiones_manicuristas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_manicurista VARCHAR(255) NOT NULL,
    anio YEAR NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL CHECK (porcentaje BETWEEN 0 AND 100),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (email_manicurista) REFERENCES usuarios(email) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    UNIQUE KEY uk_comision_anio (email_manicurista, anio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. PAGOS
-- =============================================
CREATE TABLE pagos (
    id_pago BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_cita BIGINT NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    comision_manicurista DECIMAL(10,2) NOT NULL,
    estado_pago_cliente VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    estado_pago_manicurista VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    metodo_pago_cliente VARCHAR(50) DEFAULT NULL,
    fecha_pago_cliente DATETIME DEFAULT NULL,
    fecha_pago_manicurista DATETIME DEFAULT NULL,
    notas TEXT DEFAULT NULL,
    
    FOREIGN KEY (id_cita) REFERENCES citas(id_cita) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_cita (id_cita)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 9. TRABAJOS_IMAGENES (Galería)
-- =============================================
CREATE TABLE trabajos_imagenes (
    id_imagen BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_servicio INT NOT NULL,
    email_manicurista VARCHAR(255) DEFAULT NULL,
    id_cita BIGINT DEFAULT NULL,
    url_imagen VARCHAR(500) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    orden SMALLINT DEFAULT 0,
    imagen_principal TINYINT(1) DEFAULT 0 COMMENT '1 = principal, 0 = secundaria',
    
    FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (email_manicurista) REFERENCES usuarios(email) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (id_cita) REFERENCES citas(id_cita) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_servicio_principal (id_servicio, imagen_principal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 10. GASTOS Y DEDUCCIONES
-- =============================================
CREATE TABLE gastos (
    id_gasto INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    tipo ENUM('gasto_local', 'deduccion_manicurista') NOT NULL,
    email_manicurista VARCHAR(255) DEFAULT NULL,
    fecha_gasto DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (email_manicurista) REFERENCES usuarios(email) 
        ON DELETE SET NULL ON UPDATE CASCADE,
        
    INDEX idx_fecha (fecha_gasto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 11. CIERRES DE CAJA
-- =============================================
CREATE TABLE cierres_caja (
    id_cierre INT AUTO_INCREMENT PRIMARY KEY,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    total_ingresos_efectivo DECIMAL(10, 2) DEFAULT 0,
    total_ingresos_transferencia DECIMAL(10, 2) DEFAULT 0,
    total_gastos DECIMAL(10, 2) DEFAULT 0,
    total_pagado_manicuristas DECIMAL(10, 2) DEFAULT 0,
    balance_final DECIMAL(10, 2) DEFAULT 0,
    observaciones TEXT DEFAULT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_fechas (fecha_inicio, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
