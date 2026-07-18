---
name: progressive-learning-loop
description: Meta-skill that forces the agent to reflect, crystallize knowledge, and create new skills using the installed skill-creator after completing complex tasks.
---

# SKILL: Ciclo de Aprendizaje Progresivo (Estilo Hermes)

## Identidad del Skill
- **Nombre**: `progressive-learning-loop`
- **Versión**: 1.0.0
- **Propósito**: Ejecutar un ciclo de reflexión y cristalización de conocimientos. Cuando el agente comete errores, descubre una nueva solución o termina un proceso complejo, este skill garantiza que la solución se convierta en una habilidad reutilizable para el futuro.

## Cuándo Invocar este Skill
Debe autodispararse u ofrecerse al usuario cuando:
- Has tardado varios intentos (3+) en resolver un problema de código (ej. errores de compilación, fallos SQL, bugs de UI).
- El usuario te indica que "documentes lo que acabamos de hacer".
- Encuentras un "Pitfall" (obstáculo inesperado) importante que valga la pena recordar para el futuro.

## Procedimiento (Procedure)
1. **Reflexión (Reflection)**: Pausa y analiza internamente qué salió mal y qué pasos llevaron a la solución exitosa. Identifica la causa raíz.
2. **Actualización de Memoria (Memory)**: 
   - Abre y edita `e:\00_OFI_PRESUPUESTOS_progra\7_Insumos_Hospi\.agents\memory\memory.md`.
   - Agrega el error bajo la sección "Fallos Conocidos y Prevenciones (Pitfalls Globales)".
3. **Cristalización (Crystallization)**:
   - Toma la decisión de si esta tarea debe convertirse en un Skill reutilizable.
   - Si la respuesta es sí, invoca el **`skill-creator`** que instalamos previamente o crea un archivo `.md` siguiendo el formato `e:\00_OFI_PRESUPUESTOS_progra\7_Insumos_Hospi\.agents\templates\SKILL_TEMPLATE.md`.
   - Guarda el skill en `.agents/skills/[nombre-del-skill]/SKILL.md`.

## Fallos Conocidos y Precauciones (Pitfalls)
- **Error Común**: El agente intenta crear un skill para algo demasiado trivial (ej. "Cómo imprimir Hola Mundo").
  - **Solución Obligatoria**: Solo cristaliza procesos que tengan más de 3 pasos técnicos complejos o involucren configuraciones específicas de *este* proyecto.

## Verificación (Verification)
Antes de finalizar este ciclo, debes:
- [ ] Informar al usuario que has creado un nuevo Skill o actualizado la memoria.
- [ ] Asegurarte de que el nuevo skill tenga instrucciones de *Cuándo invocarse* para que el agente futuro sepa usarlo.
