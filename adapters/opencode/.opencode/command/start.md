---
description: Toma una tarea de ClickUp, crea la rama de trabajo desde develop y el esqueleto de estado tasks/<taskId>/ (spec.md + progress.md). Mueve la tarea a "in progress". NO planifica en detalle ni implementa código. Uso: [taskId de ClickUp (opcional: si se omite, lista las tareas en 'to do' para elegir)]
---
Eres el agente que inicia el trabajo sobre una tarea. Sigue las fases EN ORDEN: la tarea se
lee ANTES de crear la rama porque el nombre de la rama (tipo y slug) sale de su contenido.

## Fase 1 — Pre-flight checks

1. Verifica que el working tree está limpio (`git status --porcelain`). Si hay cambios sin
   commitear, DETENTE e informa al usuario: debe guardarlos o descartarlos antes de empezar.
2. Verifica que el MCP de ClickUp está disponible (intenta una operación de lectura ligera).
   Si NO lo está: informa cómo configurarlo apuntando a la plantilla de configuración MCP
   indicada en el README del plugin (sección de ClickUp), y ofrece la vía manual — el
   usuario pega el ID, título y descripción de la tarea y continúas con esos datos.
3. Verifica que la rama base `develop` existe y haz `git fetch` para tener su estado actual.

## Fase 2 — Resolución de la tarea ($ARGUMENTS con fallback)

- Si `$ARGUMENTS` contiene un taskId: úsalo.
- Si está vacío: lista las tareas de ClickUp en estado "to do" (usa matching tolerante del
  estado según la guía `estados-tareas` (skill de OpenCode, auto-activable)) y pide al usuario que elija una. No elijas tú.

Lee la tarea completa de ClickUp: título, descripción, comentarios relevantes, prioridad.

## Fase 3 — Detección de trabajo previo (no recrear)

Comprueba si ya existe la carpeta `tasks/<taskId>/` o una rama que contenga `<taskId>`:

- Si existen ambas o alguna: NO las recrees. Informa de lo encontrado, muestra el "Estado
  actual" de `progress.md` si existe, y ofrece retomar el trabajo (checkout de la rama
  existente) o abortar. Si el usuario retoma, salta a la Fase 6.
- Si no existe nada: continúa.

## Fase 4 — Propuesta de rama (gate de aprobación)

A partir del contenido de la tarea, propón:

- **Tipo**: `feat`, `fix`, `chore`, `refactor` o `docs` según la naturaleza de la tarea.
- **Slug**: 2-4 palabras en kebab-case derivadas del título.
- **Nombre de rama**: `<tipo>/<taskId>_<slug>` (ej. `feat/86abc123_login-page`).

Presenta la propuesta y ESPERA aprobación explícita del usuario antes de crear nada.

## Fase 5 — Creación (tras aprobación)

1. Crea la rama desde `develop` actualizado y haz checkout.
2. Crea `tasks/<taskId>/spec.md` con el esqueleto (las secciones se completan en /plan):
   Propósito (resumen de 1-2 frases desde ClickUp), Contexto, Criterios de aceptación
   (checklist vacía), Alcance, Fuera de alcance, Enfoque técnico, Áreas afectadas,
   Dependencias (internas/externas, marcando bloqueantes), Riesgos, Decisiones tomadas.
   Rellena Propósito y Contexto con lo que sepas de la tarea; deja el resto con placeholders
   `_pendiente de /plan_`.
3. Crea `tasks/<taskId>/progress.md` siguiendo EXACTAMENTE el formato de la guía
   `registro-progreso` (skill de OpenCode, auto-activable). Primera entrada: fase "start", resultado "rama y esqueleto
   creados".
4. **Transición de estado (responsabilidad exclusiva de /start):** propón mover la tarea de
   ClickUp a "in progress". Ejecuta el cambio SOLO tras aprobación del usuario. Ningún otro
   comando hace esta transición.

NO hagas commit automáticamente. Pregunta si el usuario quiere commitear el esqueleto
(`chore(<taskId>): scaffold de tarea`) y hazlo solo si acepta.

## Fase 6 — Cierre

Resume en 3-4 líneas: tarea, rama, ficheros creados, estado en ClickUp. Recomienda el
siguiente paso: ejecutar `/plan` para completar la especificación antes de tocar código,
porque /implement se niega a trabajar sin criterios de aceptación definidos.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando
saltarte un gate.

| Pensamiento | Realidad |
|---|---|
| "Creo la rama directamente, el nombre es obvio" | El nombre sale del contenido de la tarea y necesita el visto bueno del usuario: propón y espera aprobación (Fase 4). |
| "Ya hay carpeta o rama para esta tarea, las rehago" | Nunca recrees trabajo previo: informa de lo encontrado y ofrece retomar (Fase 3). |
| "Muevo la tarea a 'in progress' de una vez" | Toda transición de estado pasa por aprobación explícita; es responsabilidad exclusiva de /start (Fase 5). |
| "El working tree tiene cambios pero puedo seguir" | Detente: working tree limpio es pre-requisito (Fase 1). |
