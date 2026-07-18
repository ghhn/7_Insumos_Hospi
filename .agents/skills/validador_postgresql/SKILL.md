# SKILL: Validador de Esquemas PostgreSQL

## Identidad del Skill
- **Nombre**: `validador_postgresql`
- **Versión**: 1.0.0
- **Autor**: Equipo Presupuestos OFI
- **Fecha**: 2026-04-21
- **Proyecto**: 7_Insumos_rado

## Propósito
Valida archivos de esquema SQL y sentencias DDL/DML antes de ejecutarlos 
contra la base de datos (PostgreSQL / Supabase). Garantiza que:
- Las tablas de presupuestos y partidas cumplan las reglas del proyecto
- No haya claves foráneas rotas
- Los tipos de dato sean correctos (especialmente NUMERIC vs TEXT para metrados)
- Las columnas obligatorias estén presentes
- Los valores numéricos tengan precisión de 4 decimales

## Cuándo Invocar este Skill
Invoca este Skill cuando el usuario diga:
- "valida este SQL"
- "revisa el esquema"
- "¿está bien este CREATE TABLE?"
- "valida antes de ejecutar"
- "verifica las tablas"
- "comprueba la migración"

## Reglas de Validación del Proyecto
Definidas en `resources/reglas_validacion.json`:

### Tablas Obligatorias
| Tabla | Descripción |
|-------|-------------|
| `partidas_p` | Catálogo maestro de partidas presupuestales (Inmutable) |
| `insumos_p` | Catálogo unificado de recursos presupuestados (Inmutable) |
| `acus` | **TABLA BASE DE VERDAD**: Desglose detallado de APUs. Define qué partidas y qué insumos existen realmente en el proyecto. |
| `compras_c` | Registro físico de adquisiciones reales (Transaccional/Editable) |
| `mapeo_vinculacion` | Tabla pivote que enlaza `compras_c` con `insumos_p`/`acus` |

### Columnas Críticas
| Columna | Tipo Correcto | Tabla |
|---------|--------------|-------|
| `cantidad_p` | `NUMERIC(15,4)` | `partidas_p`, `insumos_p`, `acus` |
| `cantidad_c` | `NUMERIC(15,4)` | `acus`, `compras_c` |
| `item_partida` | `VARCHAR(50)` | `acus` |
| `codigo_insumo` | `VARCHAR(50)` | `acus`, `insumos_p`, `mapeo_vinculacion` |
| `cantidad_und` | `NUMERIC(15,4)` | `compras_c` |

### Restricciones de Integridad y Lógica de Negocio
- **`acus` es la fuente de verdad absoluta**: Si una partida existe en `acus` pero falta en `partidas_p`, se debe manejar como partida huérfana en el frontend (con metrado 0 y advertencia visual `[PARTIDA FALTANTE EN PRESUPUESTO]`) en lugar de ocultarla.
- Nunca ocultar datos por falta de cruce (usar siempre `LEFT JOIN partidas_p`).
- Toda tabla debe normalizarse sin duplicados exactos. Si existen duplicados en la BD (ej. el mismo insumo doble en un APU), las APIs deben agruparlos (`SUM` y `GROUP BY`) para evitar fallos de llaves en React.
- La gestión de incidencias se controla estrictamente por CANTIDADES (`cantidad_c` vs `cantidad_p`), sin cruces de precios en las interfaces de ajuste.

## Parámetros de Entrada
```
Texto SQL (DDL o DML) o ruta a un archivo .sql
```

## Salida del Skill
```json
{
  "valido": false,
  "errores": [
    { "linea": 12, "tipo": "tipo_dato", "mensaje": "metrado debe ser NUMERIC(12,4), no FLOAT" },
    { "linea": 45, "tipo": "columna_faltante", "mensaje": "Falta columna 'cantidad_adquirida' en tabla 'insumos'" }
  ],
  "advertencias": [
    { "linea": 8, "tipo": "precision", "mensaje": "NUMERIC(10,2) tiene solo 2 decimales, se recomienda 4" }
  ],
  "resumen": "2 errores críticos, 1 advertencia"
}
```

## Script Principal
```
scripts/validar_esquema.py
```

## Instrucciones para el Agente
1. Recibe el texto SQL o ruta de archivo del usuario
2. Ejecuta `scripts/validar_esquema.py` con el input
3. Si hay errores críticos → muestra la lista detallada y **NO procede**
4. Si solo hay advertencias → pregunta al usuario si desea continuar
5. Si está limpio → confirma "✅ Esquema válido. Seguro para ejecutar."
6. Registra la validación en `resources/log_validaciones.txt` con timestamp
