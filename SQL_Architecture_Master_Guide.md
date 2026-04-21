# Guía Maestra de Arquitectura SQL - Proyecto 7_Insumos_rado

> **REGLA GLOBAL:** Este documento debe actualizarse **SIEMPRE** que se realice cualquier modificación estructural (DDL), creación de tablas, alteración de columnas, o cambios en la base de datos PostgreSQL.

## 1. Conexión a Base de Datos
- **Motor:** PostgreSQL
- **Host:** localhost
- **Puerto:** 5432
- **Protocolo de Agentes:** MCP (Model Context Protocol) configurado en `.agents/mcp_config.json`

## 2. Esquema Actual
*(Las tablas se documentarán aquí a medida que se vayan creando durante el desarrollo).*

### Tablas Pendientes de Crear (Fase 1)
- `partidas` (Manejo de jerarquía WBS/Expediente Técnico)
- `insumos` (Gestión de las incidencias, cantidades y valores de metrado)

## 3. Historial de Migraciones / Cambios
| Fecha | Descripción del Cambio | Tablas Afectadas |
|-------|------------------------|------------------|
| 2026-04-21 | Inicialización del documento. Base de datos vacía. | N/A |
