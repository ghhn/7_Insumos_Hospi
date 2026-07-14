# SKILL: Analizador y Mapeador del Funcionamiento del Sistema

## Identidad del Skill
- **Nombre**: `analizador_funcionamiento`
- **Versión**: 1.0.0
- **Propósito**: Realizar un mapeo exhaustivo y detallado de todo el funcionamiento del programa, identificando flujos de datos, arquitectura, componentes clave y su interacción con la base de datos (Supabase) y el frontend.

## Cuándo Invocar este Skill
Invoca este Skill cuando el usuario solicite:
- "Mapea el funcionamiento del programa"
- "Explícame cómo funciona todo el sistema"
- "Haz un mapa de la arquitectura"
- "Analiza el flujo de datos completo"
- "Documenta el sistema"

## Instrucciones de Ejecución para el Agente

Cuando se active este skill, debes seguir rigurosamente los siguientes pasos:

### 1. Exploración Inicial y Mapeo de Componentes
- Utiliza las herramientas de lectura de directorios (`list_dir`) y búsqueda (`grep_search`) para identificar los archivos principales del proyecto (tanto en el directorio raíz como en la carpeta `frontend/`).
- Identifica los endpoints, scripts de Python, scripts de Node.js, y los archivos principales de la interfaz.

### 2. Integración con otros Skills (CRÍTICO)
- Antes de generar el reporte final, **debes revisar el directorio `.agents/skills`** para identificar qué otras habilidades especializadas tiene el proyecto (por ejemplo: `exportador_reportes`, `validador_postgresql`, `exportador-cuadro-osce`).
- Integra el conocimiento de esos skills en tu mapeo. Si el sistema exporta un reporte, explica que debe hacerse bajo las reglas corporativas definidas en el skill correspondiente.

### 3. Análisis del Flujo de Datos
- Rastrea el ciclo de vida de los datos:
  - **Entrada**: ¿Cómo ingresa la información al sistema? (Carga de Excels, APUs, interacción del usuario).
  - **Procesamiento**: ¿Qué scripts procesan o cruzan la data? (por ejemplo, cruce de APUs con Presupuesto).
  - **Almacenamiento**: ¿Cómo y en qué tablas de Supabase/PostgreSQL se almacena? (Relacionar con la guía de arquitectura SQL).
  - **Salida**: ¿Cómo se visualiza o exporta? (Streamlit, Next.js, Excel).

### 4. Generación del Reporte (Artifact)
El resultado final debe presentarse al usuario en un Artifact de Markdown detallado, que incluya:
1. **Resumen Ejecutivo**: Propósito principal del software.
2. **Arquitectura Tecnológica**: Stack utilizado y cómo se conectan (Frontend -> Backend/Scripts -> Supabase).
3. **Diagramas de Flujo (Mermaid)**: Crea al menos un diagrama de flujo en Mermaid que represente la operación core del sistema.
4. **Mapeo de Módulos Core**: Explicación de cada módulo principal.
5. **Integración de Skills Activos**: Una sección dedicada a explicar cómo los skills locales del proyecto actúan dentro del flujo del sistema.
6. **Propuestas de Mejora**: Aprovechando tu libertad absoluta para proponer (según las reglas globales del usuario), identifica posibles cuellos de botella y ofrece sugerencias arquitectónicas o de código.

### 5. Regla de Autonomía
Si al realizar el mapeo descubres que falta información, investiga el código a fondo y usa tu capacidad de deducción para llenar los vacíos. Si encuentras oportunidades de mejora evidentes, plantéalas directamente como la "mejor solución".
