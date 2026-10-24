# Análisis de prompts con rúbrica — Plan de implementación

> **Para agentes ejecutores:** los pasos usan casillas (`- [ ]`) para el seguimiento. No
> commitees sin aprobación explícita del usuario.

**Goal:** Añadir el comando `/clarify` —analiza un prompt antes de responder: contexto, causa
raíz, descomposición y rúbrica de 3 criterios con bucle de corrección— y dejar el esqueleto de
tarea `tasks/analisis-de-prompts/`.

**Architecture:** Un comando de prosa, sin código nuevo. `core/workflows/clarify.md` más entrada
en `COMMANDS` de `sync.mjs`; los adaptadores se generan con `node scripts/sync.mjs`.

**Tech Stack:** Markdown en `core/` (única fuente de verdad). Los adaptadores se generan con
`node scripts/sync.mjs`; nunca se editan a mano.

**Spec:** `tasks/analisis-de-prompts/spec.md`

## Global Constraints

- **`core/` es la única fuente de verdad.** Jamás edites `plugins/backbone/claude/commands/` ni
  `plugins/backbone/opencode/.opencode/`: se sobrescriben. Tras tocar `core/`, ejecuta
  `node scripts/sync.mjs`.
- **Referencias cruzadas entre guías y comandos con tokens `{{guide:nombre}}`**, nunca con rutas.
- **No hay framework de tests.** Los "tests" son `scripts/check-*.mjs` ejecutados con `node`.
- **No commitees sin aprobación explícita del usuario.** Cada paso de commit del plan es una
  propuesta, no una licencia.
- **Fecha real del sistema** en toda entrada de `progress.md`
  (`Get-Date -Format "yyyy-MM-dd HH:mm"` en PowerShell, `date +"%Y-%m-%d %H:%M"` en bash).

---

## Estructura de ficheros

| Fichero | Responsabilidad | Acción |
|---|---|---|
| `tasks/analisis-de-prompts/` | Esqueleto de la tarea (spec, plan, progreso) | **Crear** |
| `core/workflows/clarify.md` | El comando `/clarify`: contexto, causa raíz, rúbrica, bucle | **Crear** |
| `scripts/sync.mjs` | Metadatos de frontmatter por comando | Modificar (objeto `COMMANDS`) |
| `plugins/backbone/…/clarify.md` (×2) | Generado por `sync.mjs`, no editar a mano | Generado |

---

### Task 1: El esqueleto de tarea

**Files:**
- Create: `tasks/analisis-de-prompts/spec.md`, `plan.md`, `progress.md`

- [x] **Step 1: Crear `spec.md`** — propósito, contexto, criterios de aceptación (A1–A8),
      alcance, fuera de alcance, enfoque técnico, áreas afectadas, riesgos y decisiones.
- [x] **Step 2: Crear `plan.md`** (este fichero).
- [x] **Step 3: Crear `progress.md`** con su primera entrada (fase `implement`, llegada
      inferida: no hubo `/start`, la tarea se abrió en conversación).

### Task 2: El comando `/clarify`

**Files:**
- Create: `core/workflows/clarify.md`

**Interfaces:**
- Consume: `{{guide:evidencia-y-preguntas}}` (qué se verifica, qué se asume, qué se pregunta) y
  `{{guide:proteccion-de-datos}}` (datos sensibles: anonimización o consentimiento).

- [x] **Step 1: Contrato del comando** — «no empiezas sin contexto, no inventas datos que no
      has comprobado y no escribes nada en el repo»; si sale tarea, la crea el usuario con
      `/define`.
- [x] **Step 2: Fase 1, contexto** — los cuatro campos; con lo que falte, pregunta antes de
      continuar. Datos sensibles: detener y exigir anonimización o autorización explícita.
- [x] **Step 3: Fase 2, causa raíz y descomposición** — máximo 5 partes, instrucciones precisas
      por parte; si no caben en 5, volver a acotar.
- [x] **Step 4: Fase 3, rúbrica** — 3 criterios con veredicto explícito, 4 preguntas, sesgos
      nombrados (representación, confirmación, omisión); «¿sirve para mi contexto?» dentro de
      Completitud con cita obligatoria.
- [x] **Step 5: Fase 4, bucle de corrección** — qué mantener, qué cambiar, re-evaluar; límite
      del bucle (dos rojos del mismo criterio = problema mal delimitado).
- [x] **Step 6: Fase 5, salida** — documento con contexto, causa raíz, partes, rúbrica y
      feedback; lo no comprobado se marca, no se inventa.
- [x] **Step 7: Banderas rojas** — tabla obligatoria.
- [x] **Step 8: Regenerar y verificar** —

```bash
node scripts/sync.mjs
node scripts/check-behavior.mjs; node scripts/check-hygiene.mjs; node scripts/check-routing.mjs; node scripts/check-sync.mjs
```

Esperado: suite completa en verde. Pre-commit, `check-sync` queda en rojo solo por los dos
adaptadores generados sin commitear (su última aserción exige `git status` limpio en
`plugins/backbone`); con el commit de la Task 3, 14 de 14 en verde (`check-sync`: 84/84).

### Task 3: La entrada en `COMMANDS`

**Files:**
- Modify: `scripts/sync.mjs`

- [x] **Step 1: Añadir la entrada `clarify`** después de `close`: `description`,
      `argumentHint` y `opencodeAgent: "build"`. Sin `allowed-tools` a propósito: no escribe.
- [x] **Step 2: Regenerar adaptadores** — `node scripts/sync.mjs` generó los dos ficheros con
      la descripción entrecomillada y los tokens resueltos.
- [x] **Step 3: Commit (aprobado por el usuario: «crea una rama y mueve todo dentro de ella»)**

```bash
git checkout -b feat/analisis-de-prompts
git add core/workflows/clarify.md scripts/sync.mjs tasks/analisis-de-prompts/ plugins/backbone/
git commit -m "feat(clarify): comando de análisis de prompts con rúbrica de 3 criterios"
```

Rama `feat/analisis-de-prompts` creada desde `main` (convención `feat/<slug>` del repo, sin
taskId de ClickUp). `.gitignore` queda fuera del commit: cambio previo a esta sesión.

---

### Task 4 (tarea siguiente, fuera de esta): aserciones y documentación

- [ ] Añadir `clarify` a la lista de comandos de `check-behavior.mjs` con sus aserciones
      (rúbrica, cuatro campos, «no escribe») y sus casos en `docs/eval-comportamiento.md`.
- [ ] Fila del comando en `README.md` y entrada en `CHANGELOG.md` con la release; actualizar el
      recuento de comandos (8 → 9) en `MEMORY.md` al publicar.
