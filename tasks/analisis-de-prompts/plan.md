# Análisis de prompts con rúbrica — Plan de implementación

> **Para agentes ejecutores:** los pasos usan casillas (`- [ ]`) para el seguimiento. No
> commitees sin aprobación explícita del usuario.

**Goal:** Estudiar el protocolo de trabajo con IA del usuario y la familia XDD (SDD, ODD, TDD,
CDD, SSD, BDD, DDD, ATDD, EDD, PDD, GitOps), registrar dónde encaja en backbone y si mejora
procesos (veredicto por pieza en la spec), y materializar lo único que faltaba: el comando
`/clarify` (v2, con C1–C7) y dos micro-huecos (clarificación en `/plan`, regla 9 en
`proteccion-de-datos`).

**Architecture:** Un comando de prosa, sin código nuevo. `core/workflows/clarify.md` más entrada
en `COMMANDS` de `sync.mjs`; los adaptadores se generan con `node scripts/sync.mjs`. Los
micro-huecos entran en ficheros existentes (`/plan`, `proteccion-de-datos`), sin comandos nuevos.

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
| `tasks/analisis-de-prompts/` | Esqueleto de la tarea (spec con el estudio, plan, progreso) | **Crear** |
| `core/workflows/clarify.md` | El comando `/clarify`: stakes, contexto, causa raíz, rúbrica, bucle | **Crear** |
| `core/workflows/plan.md` | Paso de clarificación de ambigüedades (SDD paso 3) al abrir la Fase 4 | Modificar |
| `core/guides/proteccion-de-datos.md` | Regla 9: stop-the-line con datos sensibles en conversación | Modificar |
| `scripts/sync.mjs` | Metadatos de frontmatter por comando | Modificar (objeto `COMMANDS`) |
| `plugins/backbone/…` | Generado por `sync.mjs`, no editar a mano | Generado |

---

### Task 1: El esqueleto de tarea

**Files:**
- Create: `tasks/analisis-de-prompts/spec.md`, `plan.md`, `progress.md`

- [x] **Step 1: Crear `spec.md`** — propósito, contexto, criterios de aceptación, alcance,
      fuera de alcance, enfoque técnico, áreas afectadas, riesgos y decisiones.
- [x] **Step 2: Crear `plan.md`** (este fichero).
- [x] **Step 3: Crear `progress.md`** con su primera entrada (fase `implement`, llegada
      inferida: no hubo `/start`, la tarea se abrió en conversación).

### Task 2: El comando `/clarify` (v1)

**Files:**
- Create: `core/workflows/clarify.md`

**Interfaces:**
- Consume: `{{guide:evidencia-y-preguntas}}` (qué se verifica, qué se asume, qué se pregunta) y
  `{{guide:proteccion-de-datos}}` (datos sensibles: anonimización o consentimiento).

- [x] **Step 1: Contrato del comando** — «no empiezas sin contexto, no inventas datos que no
      has comprobado y no escribes nada en el repo»; si sale tarea, la crea el usuario con
      `/define`.
- [x] **Steps 2-6: Fases 1-5 de la v1** — contexto (cuatro campos), causa raíz y
      descomposición, rúbrica de 3 criterios, bucle de corrección y salida; Banderas rojas.
- [x] **Step 7: Regenerar y verificar** — 13 de 14 checks en verde pre-commit (check-sync en
      rojo solo por los adaptadores generados sin commitear).

> La v1 queda **superada por la v2 de la Task 5** (C1–C7, Decisión 4 de la spec): se conserva en
> el historial, no se borra.

### Task 3: La entrada en `COMMANDS` y primer commit

**Files:**
- Modify: `scripts/sync.mjs`

- [x] **Step 1: Añadir la entrada `clarify`** después de `close`: `description`,
      `argumentHint` y `opencodeAgent: "build"`. Sin `allowed-tools` a propósito: no escribe.
- [x] **Step 2: Regenerar adaptadores** — los dos ficheros con la descripción entrecomillada y
      los tokens resueltos.
- [x] **Step 3: Commit (aprobado por el usuario: «crea una rama y mueve todo dentro de ella»)**

```bash
git checkout -b feat/analisis-de-prompts
git add core/workflows/clarify.md scripts/sync.mjs tasks/analisis-de-prompts/ plugins/backbone/
git commit -m "feat(clarify): comando de análisis de prompts con rúbrica de 3 criterios"
```

Rama `feat/analisis-de-prompts` creada desde `main` (convención `feat/<slug>` del repo, sin
taskId de ClickUp). `.gitignore` queda fuera del commit: cambio previo a esta sesión.

### Task 4: El estudio y el reencuadre de la spec

**Files:**
- Modify: `tasks/analisis-de-prompts/spec.md`

- [x] **Step 1: Reencuadrar el alcance** — de «solo el comando» al estudio completo: dónde encaja
      el protocolo y la familia XDD en backbone y si mejora procesos (A13).
- [x] **Step 2: Registrar los veredictos por pieza** en «Decisiones tomadas» (Decisión 5):
      adoptados de facto (SDD, ODD, TDD, BDD, ATDD, GitOps, SSD/DevSecOps), suficientes con lo
      existente (DDD, PDD), adoptado nuevo (protocolo conversacional → `/clarify`), rechazados
      con argumento (CDD, EDD, «constitución»).
- [x] **Step 3: Registrar las decisiones 4 y 6-7** — C1–C7 superan al rigor uniforme de la v1;
      micro-huecos adoptados en lo que ya existe; el estudio vive en la spec, no en documento
      aparte.

### Task 5: C1–C7 — la v2 de la prosa

**Files:**
- Modify: `core/workflows/clarify.md`

- [x] **Step 1: Fase 0, stakes** — clasificar trivial / normal / crítico antes de aplicar nada,
      con el nivel declarado y su motivo; en duda, el mayor (A9).
- [x] **Step 2: Fase 1, anonimización activa** — stop-the-line: el agente aplica la plantilla
      (`Cliente-1`, `MONTO-1`, `Fecha-1`) y avisa de reidentificación por combinación de valores
      (A3 ampliado).
- [x] **Step 3: Fase 2, roles con pregunta fija + pre-mortem** — seis lentes, una pregunta
      canónica cada una; pre-mortem obligatorio solo en crítico (A10).
- [x] **Step 4: Fase 3, veredicto con evidencia** — cita de la parte que respalda cada veredicto
      + «¿qué haría falta para que saliera rojo?»; «¿sirve para mi contexto?» anclada al campo
      Criterio (A5 ampliado).
- [x] **Step 5: Fase 4, bucle con registro y desacuerdo** — cada vuelta roja deja registro;
      2 rojos del mismo criterio = vuelta a Fase 1; desacuerdo: gana el usuario (A6 ampliado, A12).
- [x] **Step 6: Fase 5, medición** — vueltas de bucle y rojos→verde en la salida; toda verde a
      la primera se dice en voz alta (A11).
- [x] **Step 7: Banderas rojas actualizadas** — fricción sobre prompt trivial, rúbrica decorativa
      sin evidencia, bucle sin registro.

### Task 6: Los micro-huecos (SDD paso 3 y datos sensibles transversales)

**Files:**
- Modify: `core/workflows/plan.md`, `core/guides/proteccion-de-datos.md`

- [x] **Step 1: Paso de clarificación en `/plan`** — abre la Fase 4: ambigüedades,
      contradicciones y huecos (para qué, para quién) con `evidencia-y-preguntas`, antes de
      escribir criterios (A14).
- [x] **Step 2: Regla 9 en `proteccion-de-datos`** — la conversación como canal de salida:
      stop-the-line ante datos sensibles pegados en el chat, plantilla y aviso de
      reidentificación por combinación (A15).
- [x] **Step 3: Regenerar y verificar** — `node scripts/sync.mjs` regenera los 7 ficheros
      afectados (comandos, skills y `fase-plan`); 13 de 14 checks en verde, `check-sync` en rojo
      solo por el estado pre-commit (su aserción exige `git status` limpio en
      `plugins/backbone`).
- [x] **Step 4: Commit (aprobado por el usuario: «ejecutalo»)**

```bash
git add core/workflows/clarify.md core/workflows/plan.md core/guides/proteccion-de-datos.md scripts/sync.mjs tasks/analisis-de-prompts/ plugins/
git commit -m "feat(clarify): estudio del protocolo de IA, v2 con stakes y evidencia, y revisión brainstorm"
```

Incluye los arreglos de la revisión brainstorm (Task 7) y la guía compartida con voice.

---

### Task 7: Revisión con brainstorming de superpowers

**Files:**
- Modify: `scripts/sync.mjs` (descriptions), `core/workflows/clarify.md` (Fase 0)

- [x] **Step 1: Clasificar la revisión** — bounded (trabajo existente en el repo); preguntas de
      una en una y gate de aprobación antes de tocar ficheros, como exige el skill.
- [x] **Step 2: Pasar el checklist del skill** — placeholders (ninguno), consistencia interna
      (sin contradicciones), alcance (un plan), ambigüedad y YAGNI (los 6 roles se quedan).
- [x] **Step 3: Hallazgos presentados y aprobados por el usuario (los cuatro)** — gatillo de
      auto-activación de `proteccion-de-datos` (regla 9), trivial + datos sensibles en la Fase 0
      de `/clarify`, description de `clarify` en v1, y guía no compartida con voice.
- [x] **Step 4: Aplicar los cuatro arreglos** — description de `proteccion-de-datos` con gatillo
      de conversación comprimida a ≤ 500 chars (el límite que `check-behavior` exige), Fase 0
      explícita (trivial salta a la respuesta; el gate de datos no depende del nivel),
      description de `clarify` en v2, y `packages: ["backbone", "voice"]`.
- [x] **Step 5: Regenerar y verificar** — 140 ficheros (la guía viaja a voice); suite en verde
      salvo `check-sync` pre-commit; el enrutado mejoró (rank-1 53,1 % → 55,2 %).

### Task 8: aserciones y documentación

- [x] Añadir `clarify` a la lista de comandos de `check-behavior.mjs` con sus aserciones
      (stakes, rúbrica con evidencia, «no escribe») y sus casos en `docs/eval-comportamiento.md`.
- [x] Fila del comando en `README.md` y entrada en `CHANGELOG.md` con la release; actualizar el
      recuento de comandos (8 → 9) en `MEMORY.md` al publicar.
