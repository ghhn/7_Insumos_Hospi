# Documento Maestro: Sistema de Insumos Rado (7_Insumos_rado)

## 📌 1. Visión General del Proyecto
Este documento sirve como el **Master README** y guía de arquitectura para el desarrollo del **Sistema de Control y Ajuste de Insumos (Proyecto Rado)**. 
El sistema es una aplicación colaborativa en tiempo real diseñada para el Equipo de Presupuestos (6 usuarios en LAN) que permite ajustar metrados y generar cuadros comparativos para OSCE.

## 🛠 2. Stack Tecnológico y Arquitectura
- **Frontend / UI**: Streamlit (Python)
- **Base de Datos**: PostgreSQL Local (Puerto `5432`)
- **Control de Versiones**: Git Local
- **Exportación de Reportes**: Pandas + XlsxWriter (Directo a memoria via `io.BytesIO`)
- **Motor Matemático**: `scipy.optimize` / Distribución Proporcional
- **Concurrencia**: Formularios de Streamlit (`st.form`) para protección contra sobreescrituras en red LAN.

## 🤖 3. Ecosistema de Skills (Habilidades del Agente)
El agente de Antigravity trabajará bajo las reglas estrictas de 4 Skills fundamentales ya inicializados en `.agents/skills/`:

1. **`optimizacion_metrados`**: 
   - **Regla:** Uso estricto de distribución proporcional o `scipy.optimize` para cuadrar incidencias/cantidades contra el "Metrado" fijo hasta alcanzar el valor "Adquirido".
   - **Restricción:** Todo debe redondearse a **4 decimales**. JAMÁS alterar la columna original de metrados fijos del expediente técnico.

2. **`validador-streamlit-colaborativo`**:
   - **Regla:** Cada tabla interactiva (`st.data_editor`) DEBE estar envuelta en un bloque `with st.form('nombre'):` con su respectivo `st.form_submit_button`.
   - **Propósito:** Prevenir que los 6 usuarios en la red LAN sobrescriban la base de datos PostgreSQL al mismo tiempo.

3. **`exportador-cuadro-osce`**:
   - **Regla:** Exportación a Excel con `startcol` para alinear: Expediente Original (Izquierda) vs Modificadas (Derecha).
   - **Estilos:** Cabeceras Verdes (Metrado), Amarillas (Modificado) y Azules (Adquirido). Descarga directa en Streamlit sin archivos temporales en disco.

4. **`MCP PostgreSQL Local`**:
   - **Regla:** El agente lee la estructura de la base de datos local en tiempo real para evitar alucinaciones en las consultas SQL.
   - **Mantenimiento:** Cualquier cambio en la base de datos obligará a actualizar el documento `SQL_Architecture_Master_Guide.md` (si existe en este proyecto).

## 🚀 4. Roadmap de Desarrollo (Pasos a Seguir)

### Fase 1: Estructura Base e Inicialización de DB
- [ ] Configurar el archivo `app.py` principal de Streamlit con su layout básico.
- [ ] Crear el script de conexión a la base de datos PostgreSQL local (`database.py`).
- [ ] Definir el esquema SQL inicial (DDL) para las tablas de "Partidas" e "Insumos".
- [ ] Crear / Actualizar `SQL_Architecture_Master_Guide.md` con el esquema actual.

### Fase 2: Interfaz de Usuario y Concurrencia
- [ ] Construir la tabla principal de metrados usando `st.data_editor`.
- [ ] Aplicar la envoltura `st.form` (Skill: validador-streamlit-colaborativo) para bloqueo de concurrencia.
- [ ] Implementar la carga visual de datos desde PostgreSQL.

### Fase 3: Motor Matemático (El Reemplazo del "Buscar Objetivo")
- [ ] Integrar el algoritmo de ajuste de "cantidades/incidencias" (Skill: optimizacion_metrados).
- [ ] Asegurar protección de la columna de metrados fijos del expediente técnico.
- [ ] Validar que la suma total coincida con el valor "Adquirido" a 4 decimales.

### Fase 4: Reportes y Exportación OSCE
- [ ] Crear el botón de exportación "Descargar Cuadro OSCE".
- [ ] Implementar la lógica con `pandas` y `XlsxWriter` (Skill: exportador-cuadro-osce).
- [ ] Aplicar formatos condicionales (Verde, Amarillo, Azul).

## 📝 5. Reglas Globales de Desarrollo (User Rules)
1. **Prioridad Git Local:** Lo primero que se debe hacer antes de grandes cambios es confirmar que el Git local está al día.
2. **Actualización SQL:** Cada vez que se haga un cambio en el SQL Server / PostgreSQL, SE DEBE actualizar el archivo `SQL_Architecture_Master_Guide.md` (deberemos crearlo).
3. **Autonomía:** Si el agente carece de un "skill" específico para una tarea, tiene libertad absoluta de investigar, pensar y proponer la mejor solución de arquitectura.
