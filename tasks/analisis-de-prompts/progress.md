# Progreso — analisis-de-prompts: comando `/clarify`, análisis de prompts con rúbrica

## Estado actual

Tarea completa y probada en sesiones reales de Claude y OpenCode (prueba manual del usuario en
la interfaz de OpenCode incluida). Queda: push de la rama y PR cuando el usuario lo pida, y
`/close` para validar A1–A16.

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

### 2026-10-23 22:10 — implement

- **Resultado:** estudio del protocolo de trabajo con IA y la familia XDD registrado en la spec:
  alcance reencuadrado (de «solo el comando» a «estudio + /clarify» — el usuario aclaró que el
  encargo era estudiar todo el contenido y decidir dónde encaja en el plugin, no fabricar un
  comando), veredicto por pieza en las Decisiones 5-7 (SDD, ODD, TDD, BDD, ATDD, GitOps y
  SSD/DevSecOps adoptados de facto; DDD y PDD suficientes con lo existente; protocolo
  conversacional adoptado como `/clarify`; CDD, EDD y la «constitución» rechazados con
  argumento). Criterios ampliados a A1-A15. `/clarify` v2 (C1-C7: stakes, evidencia obligatoria,
  registro del bucle, roles con pregunta fija + pre-mortem, anonimización activa, medición,
  desacuerdo) y micro-huecos implementados: paso de clarificación en la Fase 4 de `/plan`
  (A14) y regla 9 en `proteccion-de-datos` (A15). `sync.mjs` regeneró 7 ficheros; 13 de 14
  checks en verde, `check-sync` en rojo solo pre-commit.
- **Notas:** esta entrada **supera el alcance** registrado en las dos entradas anteriores: el
  estudio es el entregable principal y `/clarify` su resultado; los veredictos de rechazo evitan
  re-proponer CDD/EDD/constitución en el futuro (Decisión 5). La v1 de la prosa queda superada
  por la v2 sin borrarse del historial de la rama (commit `a96dceb`). Siguiente paso previsto:
  commit propuesto (Task 6, Step 4) y luego aserciones + documentación (Task 7).

### 2026-10-24 00:03 — implement

- **Resultado:** revisión con el skill `brainstorming` de superpowers (instalado en el caché,
  v6.3.0; clasificada bounded, gate de aprobación respetado). Cuatro hallazgos, cuatro arreglos
  aplicados con aprobación del usuario: (1) gatillo de auto-activación de `proteccion-de-datos`
  ampliado a la conversación — la regla 9 podía no activarse nunca fuera de `/clarify` — con la
  description comprimida a ≤ 500 chars que exige `check-behavior` (un primer intento a 594 lo
  cazó); (2) Fase 0 de `/clarify` explícita: el trivial salta a la respuesta sin Fases 2-4 y el
  gate de datos sensibles vale en los tres niveles; (3) description de `clarify` actualizada a
  la v2 (stakes, evidencia, desacuerdo); (4) `proteccion-de-datos` compartida con voice
  (`packages`), novena guía compartida — voice maneja datos de cliente. Registrado como
  Decisión 8 de la spec.
- **Notas:** el enrutado mejoró con las descriptions nuevas (rank-1 53,1 % → 55,2 %, mismo
  top-3 74,0 %); `sync.mjs` pasa de 139 a 140 ficheros generados. El checklist del skill sin
  hallazgos: placeholders cero, consistencia interna OK, alcance OK, YAGNI OK (los 6 roles y el
  pre-mortem solo en crítico se quedan). Queda fuera de esta revisión el proceso completo
  (flujo /define→/close) por decisión del usuario. Siguiente paso previsto: commit propuesto
  (Task 6, Step 4) y aserciones + documentación (Task 8).

### 2026-10-24 00:22 — implement

- **Resultado:** commit ejecutado con aprobación del usuario («ejecutalo») en la rama
  `feat/analisis-de-prompts`: estudio registrado en la spec (Decisiones 5-8, criterios A1-A15),
  `/clarify` v2 (C1-C7), micro-huecos (`/plan` Fase 4 y regla 9 en `proteccion-de-datos`),
  arreglos de la revisión brainstorm y la guía compartida con voice. 15 ficheros, 717
  inserciones.
- **Notas:** con el commit, `check-sync` debe pasar de su rojo pre-commit a verde (su aserción
  exige `git status` limpio en `plugins/backbone`). `.gitignore` (línea `opencode.json`, cambio
  previo a esta sesión) sigue fuera, sin commitear. Siguiente paso previsto: Task 8 — aserciones
  de `/clarify` en `check-behavior` + eval manual, fila en README, CHANGELOG y recuento
  8 → 9 comandos / 9 guías compartidas con la release — y push/PR cuando el usuario lo pida.

### 2026-10-27 11:53 — implement

- **Resultado:** análisis de toda la rama, con nueve problemas encontrados. El usuario eligió que
  `/clarify` **solo clarifique** (Decisión 9 de la spec). Aplicado: `/clarify` v3 (no responde
  al fondo; la rúbrica pasa a ser el contrato de la respuesta, con condiciones de rojo
  concretas; la revisión del encargo tiene un tope de dos correcciones; 2–3 roles con stakes
  normal; la salida empieza por lo que se usa; frontera con `/define` y `/plan`);
  `allowed-tools` de solo lectura en Claude y el agente `plan` en OpenCode; regla 9 y
  `/clarify` unificados («muestra la plantilla aplicada»), con la nota de qué protege el
  stop-the-line; el párrafo de `/plan` reducido a una regla de la entrevista; argumento de CDD
  corregido; README de voice con nueve guías compartidas. Criterios A3, A5–A7, A10–A12, A14 y
  A15 reescritos, más el A16 nuevo. Caso de eval `datos-sensibles-en-chat` (las sondas de
  `check-graders` pasan, 9 casos). Suite estática en verde salvo `check-sync`, que falla antes
  del commit como siempre.
- **Notas:** sin comprobar que el agente `plan` de OpenCode v2 bloquee la edición (anotado en
  `sync.mjs`). El commit `075d67b` (`.gitignore`) se queda en la rama por decisión del usuario:
  se menciona en la PR como cambio aparte.

### 2026-10-27 12:06 — implement

- **Resultado:** caso `datos-sensibles-en-chat` ajustado por decisión del usuario: el grupo de
  «combinación» sale del grader (vocabulario abierto, ADR-0011) y se mide solo la anonimización;
  base 0/3, con plugin 3/3, leído el texto. Commit `3b1d79a`. Task 8 hecha: 22 aserciones en
  `check-behavior` (846 en total), fila de `/clarify` en el README y recuento 8 → 9 comandos,
  casos manuales 1.33–1.37 en `docs/eval-comportamiento.md` y entrada en el CHANGELOG bajo
  «No publicado». Suite estática completa en verde.
- **Notas:** el brazo base del eval cargó la guía instalada (sin regla 9) en 2 de 3 corridas:
  el delta es regla 9 frente a la guía sin ella. Los casos 1.34–1.37 de `/clarify` son manuales,
  sin pasar todavía.

### 2026-10-27 13:45 — implement

- **Resultado:** `/clarify` probado en sesiones reales. **Claude** (`claude -p` con
  `--plugin-dir`, repo de prueba en el scratchpad): stack → stakes, una pregunta con
  recomendación y sin responder; con las respuestas, encargo + partes + contrato + registro;
  dos correcciones sin cerrar → para y devuelve las decisiones (tope de A6); trivial; tarea del
  repo → `/define` (A16); nómina pegada → versión anonimizada, aviso de combinación y «ya lo he
  leído» (A3). Cero permisos denegados y el repo de prueba intacto (A7). **OpenCode v2.1.4**:
  frontera correcta con `--agent plan`; `plan` se niega a escribir (sin intentarlo). Prueba
  manual del usuario en la interfaz: `/clarify` aparece, corre como `plan` y se comporta igual.
  Tras la prueba, el usuario decidió que lo **trivial se responda directamente** (Decisión 10):
  cambiado en el comando, la bandera roja, una aserción nueva (847), el caso 1.35, el CHANGELOG
  y A9; reprobado en Claude.
- **Notas:** `opencode run` v2.1.4 **no ejecuta comandos de barra** (el mensaje entra literal;
  ya no hay `--command`): los comandos solo se prueban en la interfaz. Desde Git Bash, OpenCode
  falla al resolver el directorio; desde PowerShell vía `cmd /c`, el mensaje llega con las
  comillas dentro. Proveedores de esta máquina: `freellmapi` devuelve 502 (enruta a DeepSeek
  R1), Groq 403, el gratuito de OpenCode agotó su cupo; `nvidia/z-ai/glm-5.3` funciona pero se
  colgó en dos casos. La interfaz de v2.1.4 sí encuentra `.opencode/command/` en singular.
