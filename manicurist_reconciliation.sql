-- =============================================
-- TABLA: REPORTES DIARIOS (Conciliación)
-- =============================================
CREATE TABLE reportes_manicurista (
    id_reporte BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_manicurista VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL,
    valor_reportado DECIMAL(10, 2) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (email_manicurista) REFERENCES usuarios(email) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_manicurista_fecha (email_manicurista, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Registro manual de servicios por manicurista para conciliación de caja';
