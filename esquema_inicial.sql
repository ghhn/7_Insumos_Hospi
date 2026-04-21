-- Esquema Inicial para el Proyecto 7_Insumos_rado
-- Ejecutar en la base de datos: 7_insumos_rado

-- 1. Tabla Partidas
CREATE TABLE IF NOT EXISTS partidas (
    codigo VARCHAR(50) PRIMARY KEY,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    metrado_fijo NUMERIC(15, 4) NOT NULL DEFAULT 0.0000
);

-- 2. Tabla Insumos
CREATE TABLE IF NOT EXISTS insumos (
    id SERIAL PRIMARY KEY,
    codigo_partida VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    incidencia NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    cantidad_adquirida NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    cantidad_modificada NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    CONSTRAINT fk_partida FOREIGN KEY (codigo_partida) REFERENCES partidas(codigo) ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_insumos_codigo_partida ON insumos(codigo_partida);
