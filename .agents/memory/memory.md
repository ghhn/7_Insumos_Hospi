# Memoria de Trabajo del Agente (Corto/Mediano Plazo)

*Este archivo es mantenido automáticamente por el agente de IA para persistir el contexto entre sesiones y recordar problemas resueltos y tareas pendientes.*

## Estado Actual
- **Última Acción Mayor**: Migración de datos hacia un nuevo proyecto de Supabase (`ndcqypwtkiayagkykdrx.supabase.co`).
- **Estado de Base de Datos**: Identica a la versión anterior. `SQL_Architecture_Master_Guide.md` se mantiene vigente.
- **Entorno Local**: Las credenciales locales de Supabase han sido actualizadas en `.env` (raíz) y `frontend/.env`. Confirmado su seguimiento en Git.

## Decisiones Arquitectónicas Recientes
- Se ha implementado el "Sistema de Aprendizaje Progresivo (Hermes)". A partir de ahora, tras resolver tareas críticas o errores recurrentes, el agente debe usar `skill-creator` o documentar su aprendizaje en un nuevo skill local.

## Fallos Conocidos y Prevenciones (Pitfalls Globales)
- N/A hasta el momento en esta sesión.

## Tareas Pendientes o Propuestas
- Realizar el primer mapeo general de la arquitectura utilizando el nuevo skill `analizador_funcionamiento` cuando el usuario lo disponga.
- Realizar validaciones en el entorno productivo si se levanta el frontend.
