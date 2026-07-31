# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Añadido

- **Guía nueva `espacio-de-trabajo-aislado`** (fuente: `obra/superpowers` `using-git-worktrees` +
  `Significant-Gravitas/AutoGPT`): worktrees de git como **opción** en `/start`, degradando
  siempre a rama normal. Detección previa del aislamiento **con guarda de submódulo**
  (`GIT_DIR != GIT_COMMON` también es cierto dentro de un submódulo: sin esa guarda, la lógica
  se equivoca), preferencia por la herramienta nativa del entorno sobre `git worktree add` (que
  deja estado que el harness no sabe limpiar), **verificación de que el directorio está ignorado
  antes de crearlo** (si no, se commitea el árbol entero del segundo checkout), aprovisionamiento
  del espacio (config no versionada —`.env`, `.mcp.json`—, dependencias, puertos que chocan con
  el checkout principal), línea base de tests en verde y limpieza solo de lo creado por uno
  mismo.

### Corregido

- **El frontmatter de skills y agentes no parseaba como YAML** — fallo silencioso presente ya en
  la **v0.6.0 publicada** (10 ficheros afectados; verificado extrayendo el HEAD commiteado y
  validándolo aparte). `sync.mjs` emitía `description:` como escalar YAML **plano**, y un escalar
  plano no puede contener «: », que nuestras descripciones llevan de forma natural («GoF:
  catálogo de estilos…»). Consecuencia, en palabras del validador oficial: *«at runtime this
  skill loads with empty metadata (all frontmatter fields silently dropped)»* — se perdían
  `name`, `description` y `user-invocable`, así que **las guías dejaban de auto-activarse sin que
  nada lo indicara**. Arreglado con un helper `yamlString()` que entrecomilla y escapa todo
  escalar de `description` y `argument-hint` (7 puntos de emisión + el agente primario de
  OpenCode).

### Añadido

- **CI nuevo `manifest-check.yml`**: ejecuta `claude plugin validate --strict` sobre el plugin y
  sobre el marketplace en cada push y PR. Teníamos tres capas de CI (drift, versión,
  comportamiento) y ninguna comprobaba que el artefacto publicado fuese **cargable**; es la única
  que detecta un frontmatter inválido. `check-behavior.mjs` asevera además que la `description`
  va entrecomillada. Añadida también la `description` del marketplace, que `--strict` reclamaba.
  Convención tomada de `mattpocock/skills`.

## [0.6.0] - 2026-07-30

### Añadido

- **Guía nueva `calidad-producto`** (fuente: ISO/IEC 25010:2023, familia SQuaRE; ver §8 de
  `docs/referencias.md`): skill auto-activable en ambos adaptadores con el modelo de calidad de
  producto como **taxonomía compartida** — las 9 características con subcaracterísticas, el
  mapeo a las dimensiones de `/review` y la disciplina anti-inventario (una característica se
  marca solo ante una fuerza real, con criterio verificable). Cableada en `/plan` (nueva
  sección «Requisitos no funcionales» del enfoque técnico) y en el informe de `/review` (cada
  hallazgo se etiqueta con su característica ISO 25010). Registrada en `sync.mjs` y aseverada
  en `check-behavior.mjs`.
- **Guía nueva `usabilidad-accesibilidad` + dimensión 6 de `/review`** (fuente: 10 heurísticas
  de Nielsen, WCAG 2.2 y lista de chequeo de usabilidad de laboratorio de pruebas UCI,
  destiladas; §8 de `docs/referencias.md`): cubre la característica «capacidad de interacción»
  de ISO 25010 con la frontera dura **verificable en código vs evaluación manual** (títulos/
  estados, lenguaje del usuario, validación cliente+servidor, mensajes de error útiles,
  alt/labels/semántica/teclado/foco; lo estético se nombra, no se intenta). Nuevo subagente
  read-only `revisor-usabilidad-accesibilidad` (sonnet) con **gate de aplicabilidad**: se
  despacha solo si el diff toca UI. Cableada además en los CA de UI de `/plan` y en el paso 1
  del TDD de `/implement`.
- **Checks de gestión de sesión y autenticación en `revisor-bugs-seguridad`** (fuente: lista de
  chequeo de seguridad UCI destilada y modernizada a criterio OWASP/NIST actual; §8 de
  `docs/referencias.md`): A07 amplía con mensajes de login que revelan cuál credencial falló,
  sesión no invalidada en el servidor tras logout (botón «Atrás»/URL copiada), ID de sesión sin
  rotar/predecible/en URL, expiración por inactividad y política de contraseñas (mínimo ≥ 8,
  lockout/rate limit, historial); A01 añade operaciones peligrosas sobre la propia cuenta
  (admin que se auto-elimina, degradar al último admin) y propagación inmediata de cambios de
  rol; A05 añade errores que filtran internals (consulta a BD, versiones).

### Cambiado

- **Core agnóstico de stack** (primer paso de la visión «perfiles de stack», §7 de
  `docs/referencias.md`): los defaults duros de Next.js en `core/` se sustituyen por la
  instrucción de **detectar el stack del repo** (manifiesto, framework, paradigma de render) y
  adaptar los checks, conservando los casos concretos como ejemplos ilustrativos multi-stack
  (p. ej. `NEXT_PUBLIC_`/`VITE_`, `dangerouslySetInnerHTML`/`v-html`). Afecta a `plan`,
  `review`, `implement`, `explorador-repo`, `revisor-bugs-seguridad`,
  `niveles-y-tipos-de-prueba` (tabla de herramientas «según el stack»), las descripciones de
  `sync.mjs`, el workflow reusable de CI y `plugin.json`.
- **`/review` pasa de 5 a 6 dimensiones** (usabilidad/accesibilidad) y el informe etiqueta cada
  hallazgo con su característica ISO 25010 además de la severidad.

## [0.5.0] - 2026-07-24

### Añadido

- **Guía nueva `arquitectura`** (fuente: Martin Fowler, Richards & Ford —*Fundamentals of Software
  Architecture* y *The Hard Parts*— y DDD de Vlad Khononov; ver §7 de `docs/referencias.md`): skill
  auto-activable en ambos adaptadores, un piso por encima de `patrones-diseno`, para decidir y
  respetar la arquitectura a nivel de módulo/sistema. **Crítica-first**: la arquitectura responde a
  fuerzas reales, no al prestigio. Catálogo de estilos (monolito en capas, monolito modular,
  hexagonal, event-driven, service-based, microservicios) con la fuerza que justifica cada uno y su
  coste; DDD transversal (táctico solo en el *core*); criterios de decisión; y el default conservador
  (monolito modular + hexagonal solo donde haya un adaptador real + DDD táctico solo en el *core*),
  con migración StranglerFig cuando una fuerza aparezca. Dos **modos** —recomendar (pregunta las
  fuerzas y propone el estilo más simple que sirva) o elegir (presenta el catálogo y valida la
  elección del usuario)— y dos **situaciones** —conformar la arquitectura de un repo existente vs
  elegir el estilo de arranque de uno nuevo—. Cableada en el «Enfoque técnico» de `/plan` y en la
  dimensión 4 de `/review` (`revisor-convenciones`), con una bandera roja nueva en `/plan` («de paso
  reorganizo la arquitectura del repo»). Registrada en `sync.mjs` y aseverada en `check-behavior.mjs`.

## [0.4.0] - 2026-07-24

### Añadido

- **Técnicas de diseño de casos de prueba en `historias-usuario`** (fuente: ISTQB Foundation
  Level + ISO/IEC/IEEE 29119-4, ver §6 de `docs/referencias.md`): nueva sección que formaliza la
  matriz V/I/N/A ya existente como lo que es —partición de equivalencia y tabla de decisión— y
  añade **valores límite (BVA)**, **transición de estados** y **pruebas por pares**, con una tabla
  técnica→cuándo→cobertura mínima y una regla práctica. Fija el límite de alcance: la cobertura de
  caja blanca es del runner en `/implement`, no del diseño de la spec. Tres anti-patrones nuevos
  (límites sin probar, combinaciones a fuerza bruta, no nombrar la técnica) y una pregunta de
  autocrítica.
- **Guía nueva `niveles-y-tipos-de-prueba`** (fuente: ISTQB, Jest + Testing Library, Playwright):
  skill auto-activable en ambos adaptadores con la **pirámide de pruebas** (unidad / componente /
  integración / E2E / aceptación → qué verifica, cuándo elegirla y herramienta por defecto en
  Next.js) y un checklist de **tipos no-funcionales a nombrar, no integrar** (rendimiento→JMeter/k6,
  seguridad→OWASP, API→Postman/Newman, accesibilidad, regresión). Cableada en `/plan` (estrategia de
  tests) e `/implement` (elección de nivel/runner en el paso 1 del TDD). Registrada en `sync.mjs` y
  aseverada en `check-behavior.mjs`.
- **Checklist OWASP Top 10 (2021) adaptado a Next.js en la dimensión de seguridad** (fuente: OWASP
  Juice Shop, §6 de `docs/referencias.md`): `revisor-bugs-seguridad` y la dimensión 5 de `/review`
  recorren A01–A10 con casos propios de Next.js (control de acceso en route handlers/server actions,
  IDOR, exposición `NEXT_PUBLIC_`/Server→Client, inyección/XSS/SSRF, mala configuración, dependencias
  vulnerables) en lugar de una lista suelta de ejemplos.

### Cambiado

- **Paso 1 del ciclo TDD de `/implement`: «comportamiento, no implementación»** (fuente: Testing
  Library): el test se escribe contra el comportamiento observable, no contra detalles internos
  (estado, métodos privados, estructura del DOM), citando el principio de Testing Library y
  ligándolo a que el test sobreviva al refactor del paso 4. Bandera roja nueva.
- **`docs/referencias.md`**: nueva §6 «Bibliografía de testing» (ISTQB, ISO 29119, Playwright,
  Selenium, Jest/Testing Library, JMeter, Postman, OWASP Juice Shop, Ministry of Testing, Test
  Automation University) con tabla por fuente y estados; leyenda ampliada con `📖 referencia`;
  registro de lo adoptado y backlog actualizados (queda 🔜 el testing basado en riesgo de 29119-2 en
  la sección «Riesgos» de `/plan`).

## [0.3.0] - 2026-07-24

### Añadido

- **Guías `codigo-limpio` y `patrones-diseno`** (fuente: refactoring.guru, ver §5 de
  `docs/referencias.md`): dos guías nuevas en `core/guides/` (skills auto-activables en ambos
  adaptadores). `codigo-limpio` define los cinco rasgos del código limpio, la deuda técnica, la
  disciplina de refactorización segura (pasos pequeños, tests verdes antes y después, sin mezclar
  con funcionalidad nueva) y un catálogo condensado de los 21 olores de código con la
  refactorización que cura cada uno. `patrones-diseno` es una referencia **crítica-first** de los
  23 patrones GoF: mapa olor→patrón, la crítica al uso de patrones (síndrome del martillo) y
  Singleton documentado como anti-patrón — un patrón se justifica solo cuando su problema ya
  existe, reforzando el anti-objetivo «sobre-ingeniería».
- **Paso de refactor en el ciclo TDD de `/implement`** (red-green-**refactor**): la Fase 3 gana un
  paso 4 «Refactor (con la suite en verde)» que mejora el diseño del código recién escrito sin
  cambiar su comportamiento, guiado por `{{guide:codigo-limpio}}`, antes de registrar el criterio.
  Dos banderas rojas nuevas: «funciona, ya está» (saltarse el refactor) y «meto una abstracción
  por si acaso» (sobre-ingeniería). El modo corrección también incorpora el paso.

### Cambiado

- **Dimensión 4 de `/review` pasa a «Convenciones y deuda técnica»**: además de la coherencia con
  los patrones del repo, `/review` y el subagente `revisor-convenciones` detectan **olores de
  código** que el diff introduzca o empeore (según `{{guide:codigo-limpio}}`) y los reportan como
  deuda técnica, respetando la disciplina de `revision-hallazgos` (umbral ≥ 75, nada preexistente,
  ni nitpicks, ni trabajo del linter).
- **Enfoque técnico de `/plan` referencia `patrones-diseno`**: al proponer una abstracción o
  patrón, se justifica solo ante el problema real (un olor ya presente), no de forma especulativa
  — coherente con «empezar pequeño». Bandera roja nueva en `/plan`.
- **`scripts/check-behavior.mjs`**: la lista de guías con contrato de auto-activación aseverado en
  CI incluye ahora `codigo-limpio` y `patrones-diseno`, y se corrige de paso un olvido de la
  v0.2.0 añadiendo `historias-usuario` (que había quedado fuera del check). El checklist manual
  `docs/eval-comportamiento.md` gana dos casos para las guías nuevas (refactor tras test en verde
  y freno a los patrones especulativos).

## [0.2.0] - 2026-07-20

### Añadido

- **Guía `historias-usuario` cableada en `/plan`**: nueva guía en `core/guides/historias-usuario.md`
  (skill auto-activable en ambos adaptadores) que define cómo redactar cada requisito como Historia
  de Usuario en `spec.md`: historia (rol + valor), contexto de proceso de negocio, comportamientos
  válidos/no válidos, criterios de aceptación en formato Given/When/Then y su diseño de casos de
  prueba derivado, con tabla de trazabilidad Proceso→RF→HU→CA→EC y molde CRUD reutilizable. La Fase 4
  de `/plan` la referencia vía `{{guide:historias-usuario}}`, así los criterios de aceptación nacen
  verificables y con su escenario de prueba (EC). Mantiene una sola fuente de verdad del
  comportamiento y deja los datos de gestión (programador, iteración, tiempos, riesgo) en ClickUp.

- **Recomendación del add-on `frontend-design`** (backlog #7): para tareas de UI en Next.js, el
  README y el workflow `/implement` recomiendan la skill oficial de Anthropic `frontend-design`
  como add-on **opcional**. NO se redistribuye — es software propietario de Anthropic
  (© Anthropic PBC, todos los derechos reservados), así que se compone por **recomendación**: el
  usuario la instala aparte y `/implement` la aprovecha para diseñar UI si está instalada,
  degradando sin problema si no.

### Cambiado

- **`bump-version`/`check-version` cubren también `examples/repo-settings.json`**: el `ref` (tag
  pineado que copian los repos consumidores) se sube y se verifica junto a `plugin.json`,
  `marketplace.json` y el CHANGELOG, para que no quede desfasado tras publicar. README
  actualizado: árbol de arquitectura con `agents/`, los scripts y los CI; el pin del ejemplo
  apunta al último tag publicado.

## [0.1.2] - 2026-06-19

### Añadido

- **Eval de comportamiento híbrido** (backlog #6, patrón de `superpowers` §2): verifica que los
  prompts producen el comportamiento esperado del agente, no solo que los ficheros son
  correctos. Dos mitades: (a) **determinista** — `scripts/check-behavior.mjs` asevera los
  contratos estructurales (read-only de `/review`, `tools`/modelo de cada agente,
  auto-activación de guías, banderas rojas presentes) sobre los artefactos shipped, como test
  INDEPENDIENTE de `sync.mjs`; corre en el nuevo CI `behavior-check.yml`. (b) **manual** —
  `docs/eval-comportamiento.md`, una checklist de prompts → comportamiento esperado
  (auto-activación, routing por estado, respeto de gates, tiering, degradación) para ejecutar
  antes de publicar.

## [0.1.1] - 2026-06-19

### Añadido

- **Hook `SessionStart` de continuidad entre sesiones** (`adapters/claude/hooks/session-context.js`,
  exclusivo de Claude Code): al iniciar/limpiar/compactar una sesión sobre una rama de tarea
  (`<tipo>/<taskId>_<slug>`), inyecta automáticamente el "Estado actual" de `progress.md` y
  los criterios de aceptación pendientes de `spec.md`. Degradación silenciosa total (no es
  repo git, git ausente, rama sin patrón de tarea, ficheros inexistentes) — un hook nunca
  rompe la sesión. Resuelve la rama vía `git symbolic-ref` para soportar ramas sin commits.
- **Bootstrap de auto-conducción en el hook SessionStart**: además del estado, el hook
  inyecta un "Próximo paso" derivado del estado de `spec.md` (placeholders → `/plan`;
  criterios pendientes → `/implement`; todos marcados → `/review`) y un recordatorio de
  gates. Fuera de una rama de tarea, si el repo ya usa el flujo (existe `tasks/`), añade un
  recordatorio mínimo de una línea; sin `tasks/` no inyecta nada (cero ruido). Tono suave:
  sugiere, no impone, coherente con los gates humanos del plugin.
- **Tablas de "Banderas rojas" en los 4 workflows** (`core/workflows/*.md`): catálogo de
  racionalizaciones prohibidas por comando (p. ej. en `/implement`: "es trivial, no hace
  falta test"; en `/review`: "corrijo este bug de paso") para que el agente no se
  autoconvenza de saltarse un gate. Se propagan a ambos adaptadores vía `sync.mjs`.
- **CI de sincronización core↔adaptadores** (`.github/workflows/sync-check.yml`): en cada
  push/PR que toque `core/`, `scripts/sync.mjs` o `adapters/`, regenera con `sync.mjs` y
  falla si los adaptadores divergen (drift por edición manual de un generado o por cambiar
  `core/` sin regenerar). Blinda la regla de mantenimiento "editar solo en `core/`".
- **`.mcp.json` empaquetado en el plugin** (`adapters/claude/.mcp.json`, generado por
  `sync.mjs`): Claude Code auto-registra el MCP de ClickUp al instalar el plugin, leyendo
  `CLICKUP_API_KEY`/`CLICKUP_TEAM_ID` de variables de entorno. Elimina el paso manual de
  copiar un fichero con credenciales por repo consumidor. `MCP_SERVERS` queda como fuente
  única en `sync.mjs`. La plantilla `examples/mcp.json.example` se mantiene como alternativa
  para credenciales por proyecto.
- **`/review` endurecido con técnicas del plugin oficial `code-review`** (referencia §3 de
  `docs/referencias.md`): `allowed-tools` read-only en el frontmatter de Claude (`Bash` acotado
  a git de lectura y consultas de grafo) que pre-autoriza solo herramientas de lectura
  (privilegio mínimo); auto-refutación de cada hallazgo antes de reportarlo; scoring de
  confianza 0-100 con umbral ≥ 75; y lista explícita de "qué NO reportar" (falsos positivos).
  `allowedTools` se declara por comando en `sync.mjs` y solo el adaptador Claude lo emite.
- **Tiering de modelos en `/review` vía 3 agentes de plugin read-only** (referencia §3 de
  `docs/referencias.md`; backlog #2): `/review` despacha en paralelo, en lugar de analizar
  las cinco dimensiones en el agente principal, tres subagentes especializados con el modelo
  adecuado a su coste/complejidad — `revisor-bugs-seguridad` (opus: bugs + seguridad),
  `revisor-spec-tests` (sonnet: cumplimiento de spec + tests) y `revisor-convenciones`
  (haiku: convenciones). Cada agente declara `tools: Read, Grep, Glob`, una **allowlist
  DURA**: es el bloqueo de solo-lectura real (no pueden modificar nada ni despachar más
  agentes). La validación adversarial pasa así a subagentes independientes por dimensión. La
  disciplina de validación (auto-refutación + confianza + no-flag + severidad) se extrae a la
  guía `revision-hallazgos` como fuente única, referenciada por `/review` y por los agentes.
  Los agentes son exclusivos del adaptador Claude (los genera `sync.mjs`); en OpenCode
  `/review` degrada al análisis en línea de las cinco dimensiones.
- **Corrección sobre `allowed-tools`**: se rectifica la afirmación de que `allowed-tools` de
  un slash command "hace cumplir el solo-lectura a nivel de herramienta". En realidad es
  **pre-aprobación de permisos** (no un sandbox): refuerza el contrato junto con la prosa y
  las banderas rojas, pero el bloqueo DURO de solo-lectura lo dan los agentes revisores (su
  campo `tools`). Prosa de `core/workflows/review.md` y de `docs/referencias.md` actualizada.
- **Validación adversarial independiente en `/review`** (`core/agents/verificador-hallazgos.md`,
  opus, read-only): tras sintetizar los hallazgos de los agentes por dimensión, `/review`
  despacha un verificador independiente que intenta REFUTAR cada hallazgo con contexto fresco
  (¿preexistente?, ¿correcto en su contexto?, ¿ya cubierto por un test?, contradicciones
  cruzadas) y devuelve un veredicto por hallazgo; el orquestador solo reporta los `confirmado`.
  Completa el patrón de validación adversarial del plugin oficial `code-review` (Fase 4.2).
  Degrada a una segunda pasada escéptica en línea en OpenCode.
- **Tiering en la exploración de `/plan`** (`core/agents/explorador-repo.md`, sonnet,
  read-only): `/plan` conserva graphify como acelerador (lo ejecuta el orquestador) y delega la
  reconnaissance estructural del repo a un explorador que devuelve un mapa en TOON (estructura
  Next.js, convenciones, ficheros candidatos, riesgos), liberando al planificador para razonar
  el enfoque y dialogarlo con el usuario. Degrada a exploración en línea en OpenCode.
- **Scripts de versión** (`scripts/bump-version.mjs`, `scripts/check-version.mjs`):
  `bump-version <patch|minor|major|X.Y.Z>` sube la versión de forma SINCRONIZADA en los tres
  sitios donde vive (`plugin.json`, la entrada de `marketplace.json` y el CHANGELOG, que mueve
  "[No publicado]" a la versión con fecha y abre uno nuevo vacío). `check-version` es el
  "doctor" que falla si esas tres versiones divergen. Nuevo CI `version-check.yml` ejecuta el
  doctor en cada push/PR que toque la versión.

### Cambiado

- **Guías reescritas con la plantilla de skill** (`core/guides/*.md`, patrón de
  `frontend-design`): cada guía gana un **rol** explícito, **anti-patrones nombrados** (que
  generalizan las banderas rojas), un **proceso** claro y, en las procedurales, una
  **autocrítica** de cierre. Se aplica al nivel que encaja con cada guía sin inflar el texto:
  las tres procedurales (`registro-progreso`, `grafo-conocimiento`, `revision-hallazgos`) con
  la plantilla completa; las dos de referencia (`estados-tareas`, `formato-toon`) con el
  espíritu (rol + anti-patrones), sin forzar una persona sobre una tabla de consulta.
- **Auto-activación de las guías (skills) documentada y afinada**: se aclara que
  `user-invocable: false` solo oculta la skill del menú `/` y **no** bloquea la auto-activación
  del modelo (eso sería `disable-model-invocation: true`, que no usamos). Las guías ya se
  auto-activan por su `description`; se afinaron las descripciones de `grafo-conocimiento` y
  `registro-progreso` (antes "command-scoped") para que disparen de forma ambiental, y se
  documentó la intención en `sync.mjs`. `revision-hallazgos` se mantiene acotada a `/review` a
  propósito (subrutina interna). No se cambió ningún flag: el estado deseado ya existía.
- **Manifiestos completados**: `plugin.json` y `marketplace.json` con autor, email, homepage
  y repositorio reales (`leiniercy/custom-ia-plugin`). La entrada del plugin en
  `marketplace.json` declara ahora `"version": "0.1.0"`, coherente con el pin por tag.
- **Contrato de `/review` ahora 100 % solo-lectura**: se elimina la antigua excepción por la
  que `/review` podía escribir hallazgos en `progress.md`. La persistencia de hallazgos pasa
  a `/implement`: al entrar en modo corrección desde un informe de `/review` presente en la
  conversación, registra los hallazgos en `progress.md` antes de trabajarlos, garantizando la
  recuperación en sesiones limpias futuras.

## [0.1.0] - 2026-06-12

### Añadido

- **Arquitectura core + adaptadores (multi-agente)**:
  - `core/` como **única fuente de verdad**: 4 workflows (`start`, `plan`, `implement`,
    `review`) y 4 guías (`estados-tareas`, `registro-progreso`, `grafo-conocimiento`,
    `formato-toon`) agnósticos de herramienta, con tokens `{{guide:nombre}}` para las
    referencias cruzadas.
  - `scripts/sync.mjs`: generador que produce ambos adaptadores desde `core/`
    (sustituye tokens por la ruta propia de cada herramienta y antepone su frontmatter).
    Los ficheros generados no se editan a mano.
  - **Adaptador Claude Code** (`adapters/claude/`): plugin nativo con manifiesto
    (`plugin.json`), comandos con `description`/`argument-hint`, skills con
    `user-invocable: false`, y hook `Stop` de notificación sonora multiplataforma
    (`hooks/notify.js`, win32/darwin/linux con degradación silenciosa) — el hook es
    exclusivo de este adaptador.
  - **Adaptador OpenCode** (`adapters/opencode/.opencode/`): comandos en
    `.opencode/command/*.md` (frontmatter `description`, hint de uso embebido) y guías
    en `.opencode/guides/*.md`, listo para copiar al repo consumidor. Formato basado en
    conocimiento de enero 2026 — verificar contra https://opencode.ai/docs.
- **Marketplace `biomas`** (`.claude-plugin/marketplace.json`) con el plugin referenciado
  por ruta relativa (`./adapters/claude`) para que herede el tag de descarga.
- **Flujo de 4 comandos** con: fases numeradas, `$ARGUMENTS` con fallback por inferencia
  de rama, pre-flight checks, gates de aprobación humana para acciones visibles o
  irreversibles, detección de modo por contexto y cierre orientativo.
- **Integración graphify** (grafo de conocimiento del repo): detección de la CLI,
  construcción/actualización con gate de aprobación, patrones de consulta
  (`query`/`explain`/`path`), aristas INFERRED/AMBIGUOUS tratadas como hipótesis a
  verificar, fallback a exploración manual.
- **Convención TOON** para salidas con listas largas y uniformes (resultados del grafo,
  esquemas de BD, tablas de hallazgos), con sintaxis canónica y límites de uso.
- **CI agnóstica**: workflow reusable `.github/workflows/review.yml` (revisor
  independiente con lectura de `tasks/<taskId>/spec.md`, severidades y veredicto; solo
  comenta) + caller de ejemplo `examples/pr-review.yml` con `permissions` declarados.
- **Plantillas para repos consumidores** (`examples/`): `repo-settings.json` (pin por tag,
  `autoUpdate: false`), `mcp.json.example` (ClickUp para Claude Code),
  `opencode.json.example` (ClickUp para OpenCode) y `AGENTS.md.example` (contexto del
  flujo para OpenCode y otros agentes compatibles con AGENTS.md).
- README con arquitectura, instalación por herramienta, CI, publicación y troubleshooting.

### Decisiones de diseño

- **Core como fuente única**: los workflows se escriben una sola vez; cada adaptador es
  un artefacto generado. Se descartó mantener copias paralelas por herramienta para
  evitar drift entre Claude Code y OpenCode.
- **Soporte limitado a Claude Code y OpenCode**: el formato de OpenCode se construyó con
  conocimiento local (sin verificación web); otros agentes podrán añadirse como nuevos
  adaptadores en `scripts/sync.mjs`.
- **Hook sonoro solo en Claude Code**: OpenCode usa un sistema de plugins JS distinto;
  se pospone su equivalente hasta verificar la API real.
- **ClickUp como gestor de tareas** vía MCP, con estados estándar (`to do / in progress /
  review / complete`). Todos los comandos degradan a modo manual si el MCP no está
  configurado.
- **Responsabilidad única sobre transiciones**: `/start` mueve a `in progress`,
  `/implement` mueve a `review` al crear la PR, el cierre a `complete` es siempre humano.
  Se descartó que `/review` cerrara tareas para mantener al humano en el gate final.
- **`/review` es solo-lectura** con una única excepción documentada: registrar hallazgos
  en `progress.md` bajo petición explícita, para habilitar el modo corrección de
  `/implement` en sesiones limpias. Coherente con ello, `/review` consulta el grafo de
  graphify solo si ya existe — nunca lo construye ni actualiza.
- **graphify como acelerador, no como requisito**: `/plan` y `/review` lo usan si está
  disponible y degradan a exploración manual si no. El grafo orienta dónde mirar; las
  decisiones de diseño se confirman siempre en el código fuente.
- **TOON solo como formato de presentación**: prohibido en ficheros parseables
  (manifiestos JSON, configs de CI) y no altera el contrato Markdown de
  `spec.md`/`progress.md`.
- **Sin agente "experto en el repo"**: el conocimiento vive en el código y en `docs/` del
  repo consumidor, evitando el drift de un experto desactualizado.
- **Solo 4 comandos**: se descartaron `/debug` y un `/validate-pr` local; la validación de
  PRs vive en CI (workflow reusable), siguiendo la pauta de empezar pequeño.
- **Fuera de alcance en 0.1.0**: worktrees con script de copia de ficheros no versionados
  y soporte de IDs personalizados de ClickUp.
