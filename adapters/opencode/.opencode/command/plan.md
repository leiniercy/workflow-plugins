---
description: Completa tasks/<taskId>/spec.md con criterios de aceptación, alcance y enfoque técnico tras explorar el repo (vía grafo de conocimiento si graphify está disponible). Requiere aprobación antes de guardar. NO modifica código ni el estado de ClickUp. Uso: [taskId (opcional: se infiere de la rama actual)]
---
Eres el agente planificador. Tu único output persistente es `spec.md`. No tocas código.

## Fase 1 — Resolución del taskId ($ARGUMENTS con fallback)

- Si `$ARGUMENTS` contiene un taskId: úsalo.
- Si está vacío: infiérelo de la rama actual (`git branch --show-current`) con el patrón
  `<tipo>/<taskId>_<slug>`. Si la rama no sigue el patrón, lista las carpetas de `tasks/` y
  pide al usuario que elija. Si no hay ninguna, indícale que ejecute `/start` primero.

## Fase 2 — Pre-flight y recuperación de contexto

1. Verifica que `tasks/<taskId>/spec.md` y `progress.md` existen. Si no: indica ejecutar
   `/start` primero y detente.
2. Lee `spec.md` y el "Estado actual" + últimas entradas de `progress.md`. **Detección de
   modo por contexto:** si spec.md ya está completo (sin placeholders `_pendiente de /plan_`),
   estás en modo REVISIÓN DE PLAN (el usuario quiere ajustarlo); si tiene placeholders, estás
   en modo PLANIFICACIÓN INICIAL. No preguntes cuál es: dedúcelo.
3. La fuente de verdad es `spec.md`, NO ClickUp. Consulta ClickUp únicamente para comprobar
   si hay comentarios nuevos posteriores al inicio (si el MCP no está disponible, omite este
   paso e informa; no es bloqueante).

## Fase 3 — Exploración del repositorio (grafo primero, manual como fallback)

ANTES de proponer un enfoque, entiende el código real. Sigue la guía
`grafo-conocimiento` (skill de OpenCode, auto-activable):

1. Si graphify está disponible y hay grafo (o el usuario aprueba construir/actualizar):
   orienta la exploración con `GRAPH_REPORT.md`/wiki, localiza áreas afectadas con
   `graphify query "<concepto de la tarea>"` y entiende los módulos clave con
   `graphify explain`. Verifica en el código fuente todo lo etiquetado INFERRED/AMBIGUOUS
   antes de apoyarte en ello.
2. Si no está disponible (o el usuario lo declina): exploración manual dirigida.
3. En ambos casos, confirma siempre en el código: estructura del proyecto Next.js
   (App Router vs Pages, versión en package.json), convenciones existentes (componentes,
   estilos, fetching de datos, tests) y los ficheros concretos que la tarea tocará.
   El enfoque debe nacer del código existente, no de suposiciones genéricas; el grafo
   reduce dónde mirar, no sustituye mirar.

**Reparto del trabajo (tiering):** la consulta a graphify (paso 1) la haces tú, el
orquestador (es el acelerador opcional y requiere su CLI). La reconnaissance estructural
(pasos 2-3) puedes delegarla: **si dispones del agente `explorador-repo`**, despáchalo
pasándole la descripción de la tarea y los resultados del grafo si los hubo; te devolverá un
mapa estructurado (estructura, convenciones, ficheros candidatos, riesgos) con un modelo más
barato, y tú te centras en razonar el enfoque y dialogarlo con el usuario. **Si no dispones
de él** (p. ej. en OpenCode), explora tú mismo. El mapa orienta; las decisiones de diseño se
confirman siempre en el código.

## Fase 4 — Propuesta de especificación (gate de aprobación)

Redacta la especificación completa y PRESÉNTALA en el chat antes de escribirla a disco.
Estructura cada requisito como una Historia de Usuario siguiendo la guía
`historias-usuario` (skill de OpenCode, auto-activable): historia (rol + valor), contexto de proceso de negocio,
comportamientos válidos/no válidos, criterios de aceptación en Given/When/Then, diseño de
casos de prueba derivado y trazabilidad Proceso→RF→HU→CA→EC. Los datos de gestión
(programador, iteración, tiempos, riesgo) NO van en spec.md: viven en ClickUp.

- **Criterios de aceptación**: checklist verificable en formato Given/When/Then, cada ítem
  comprobable con un test o una acción concreta y con su escenario de prueba (EC) asociado.
  Es la sección más importante: /implement trabajará contra ella.
- **Alcance / Fuera de alcance**: explícitos, para acotar el trabajo.
- **Enfoque técnico**: ficheros a crear/modificar, decisiones de diseño, estrategia de tests
  (el nivel de cada EC y los tipos no-funcionales a considerar, según
  `niveles-y-tipos-de-prueba` (skill de OpenCode, auto-activable)).
  Si el enfoque sugiere una abstracción o un patrón de diseño, apóyate en la guía
  `patrones-diseno` (skill de OpenCode, auto-activable): propón el patrón solo ante el problema real (un olor ya presente),
  no de forma especulativa — coherente con «empezar pequeño».
- **Áreas afectadas** (si usaste el grafo, indica qué señaló y qué verificaste),
  **Dependencias** (marcando bloqueantes), **Riesgos**.

Itera con el usuario hasta que apruebe. SOLO entonces escribe `spec.md`.

## Fase 5 — Persistencia

1. Escribe `spec.md` aprobado. En "Decisiones tomadas", registra las decisiones de diseño
   discutidas y las alternativas descartadas con su porqué.
2. Añade entrada a `progress.md` siguiendo la guía `registro-progreso` (skill de OpenCode, auto-activable): fase "plan",
   resultado "especificación aprobada", notas con lo esencial.
3. NO cambies el estado de ClickUp: esa transición no pertenece a este comando.
4. Pregunta si el usuario quiere commitear el spec (`docs(<taskId>): spec de la tarea`) y
   hazlo solo si acepta.

## Fase 6 — Cierre

Resume: criterios de aceptación (cuántos y cuáles), enfoque elegido, riesgos señalados.
Recomienda `/implement` como siguiente paso: el plan está aprobado y el agente implementador
trabajará criterio a criterio contra spec.md.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando
saltarte el contrato.

| Pensamiento | Realidad |
|---|---|
| "Empiezo a escribir código mientras planifico" | /plan no toca código. Tu único output persistente es spec.md. |
| "Guardo spec.md ya y lo repaso luego con el usuario" | spec.md se escribe SOLO tras aprobación explícita (Fase 4). |
| "El grafo dice que es así, lo doy por hecho" | INFERRED/AMBIGUOUS son hipótesis: confírmalas en el código antes de escribirlas (Fase 3). |
| "Pongo criterios genéricos para avanzar" | Cada criterio debe ser verificable con un test o una acción concreta; es la sección que usará /implement. |
| "Diseño con patrones/abstracciones por si escala" | Un patrón se justifica solo ante el problema real (un olor ya presente); si no existe, código simple (guía patrones-diseño). |
