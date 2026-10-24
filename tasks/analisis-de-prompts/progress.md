# Progreso — analisis-de-prompts: comando `/clarify`, análisis de prompts con rúbrica

## Estado actual

Comando `/clarify` commiteado en la rama `feat/analisis-de-prompts` (commit local, sin push) con
la suite completa en verde (14/14 checks, `check-sync` 84/84); queda la Task 4 (aserciones en
`check-behavior`, README/CHANGELOG, recuento 8 → 9) y el push/PR cuando el usuario lo pida.

## Historial

### 2026-10-23 21:07 — implement

- **Resultado:** tarea abierta (`spec.md` con criterios A1–A8 y `plan.md`) y comando
  `/clarify` implementado: prosa en `core/workflows/clarify.md` con las 5 fases (contexto,
  causa raíz, rúbrica de 3 criterios, bucle de corrección, salida) y Banderas rojas; entrada
  añadida a `COMMANDS` en `scripts/sync.mjs`; `node scripts/sync.mjs` generó los adaptadores de
  Claude y OpenCode. Suite de checks: 13 de 14 en verde; `check-sync` falla solo por los dos
  adaptadores generados sin commitear (su aserción exige `git status` limpio en
  `plugins/backbone`).
- **Notas:** decisión de encaje — es un comando de prosa (como `/define`), no una guía, y no
  escribe en el repo (su artefacto es la respuesta en la conversación); sin `allowed-tools` a
  propósito y con `opencodeAgent: "build"`. «¿Sirve para mi contexto?» se evaluó dentro de
  Completitud con cita obligatoria contra los cuatro campos de contexto. Nomenclatura: slug de
  tarea en español (`analisis-de-prompts`, como `cierre-y-telemetria`), comando en inglés
  (`clarify`, como `define`/`start`/`plan`). Una primera versión en inglés
  (`tasks/prompt-clarification/` + `core/workflows/prompt-clarification.md`) se borró antes de
  commitear: quedaba fuera de las convenciones del repo. Siguiente paso previsto: commit
  propuesto al usuario (Task 3, Step 3) y luego aserciones en `check-behavior` + README /
  CHANGELOG (Task 4).
- **Llegada:** inferida — el trabajo empezó antes de este sello (no hubo `/start`: la tarea se
  abrió en conversación, sin taskId de ClickUp)

### 2026-10-23 21:32 — implement

- **Resultado:** rama `feat/analisis-de-prompts` creada desde `main` (convención `feat/<slug>`
  del repo; sin taskId de ClickUp) y todo el trabajo de la tarea commiteado dentro con
  aprobación explícita del usuario («crea una rama y mueve todo dentro de ella»): prosa del
  comando, entrada en `COMMANDS`, los dos adaptadores generados y el esqueleto
  `tasks/analisis-de-prompts/`. Con el commit, la suite completa pasa: 14/14 checks
  (`check-sync` 84/84, ya sin el rojo pre-commit). Sin push ni PR: pendientes de aprobación.
- **Notas:** `.gitignore` (línea `opencode.json`) quedó FUERA del commit a propósito: cambio
  local previo a esta sesión, no es de esta tarea; sigue sin commitear en el árbol de trabajo.
  El commit es local sobre una base `main` que a su vez va por delante de `origin/main`
  (0.26.0 sin pushear, estado previo del repo). Siguiente paso previsto: Task 4 del plan
  (aserciones de `/clarify` en `check-behavior` + eval manual, fila en README, CHANGELOG y
  recuento 8 → 9 al publicar) y `/review` cuando el usuario lo pida.
