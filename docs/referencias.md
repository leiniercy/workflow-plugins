# Referencias externas para la evolución de `custom-ia-plugin`

> Catálogo de plugins y frameworks analizados como fuente de patrones para futuras
> mejoras del plugin. Cada entrada resume **qué es**, **qué patrones aporta** y **cómo
> aplican (o no) a nuestro plugin**.
>
> **Estado** de cada patrón:
> `✅ adoptado` · `🔜 pendiente` · `🟡 parcial` · `⛔ descartado (con motivo)` ·
> `📖 referencia (citada, no es un patrón adoptable)`

## Cómo usar este documento

1. Antes de planear una mejora, busca aquí si el patrón ya está catalogado y en qué estado.
2. Al adoptar un patrón, cambia su Estado a `✅` y enlaza el commit/PR en la columna.
3. Filtra **siempre** por la filosofía del plugin (ver abajo): no todo patrón de un proyecto
   más grande encaja en uno guiado por tareas con gates humanos.
4. Cuando analices un repo nuevo, añade una sección `## N. <repo>` con su tabla de patrones.

## Filosofía del plugin (el filtro)

Todo patrón se evalúa contra estos principios; lo que choca, se descarta y se anota por qué:

- **Gates humanos para todo lo visible** (commit, push, PR, cambios de estado en ClickUp).
- **Degradación elegante**: ClickUp y graphify son opcionales; nada bloquea.
- **`core/` como fuente única**: los adaptadores se generan con `sync.mjs`, no se editan a mano.
- **Empezar pequeño**: 4 comandos, sin features especulativas.
- **Continuidad entre sesiones** vía `tasks/<id>/{spec,progress}.md` (sin BD externa).

### Qué NO copiar (anti-objetivos recurrentes)

- **Sobre-ingeniería**: worker services, SQLite/Chroma, viewers web, motores de memoria,
  harnesses de eval. Son el producto de otros; aquí serían lastre.
- **Tono coercitivo** (`<EXTREMELY_IMPORTANT>`, "no tienes elección"): incompatible con la
  aprobación humana. Preferimos sugerir, no imponer.
- **Telemetría**.

---

## 1. claude-mem — `thedotmack/claude-mem`

**Qué es:** sistema de memoria persistente entre sesiones (captura uso de herramientas, lo
comprime con IA y reinyecta contexto). Muy maduro (v13.x, Apache-2.0). Multi-harness, worker
HTTP en :37777, SQLite + Chroma, servidor MCP propio, viewer web.

**Relación con nosotros:** resuelve el mismo problema de continuidad que nuestro `progress.md`,
pero con un motor pesado. Tomamos los patrones, no la maquinaria.

| Patrón | Qué es | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| `.mcp.json` empaquetado en el plugin | El plugin trae su `.mcp.json`; el harness lo auto-registra al instalar | ClickUp se auto-registra leyendo env vars; sin copiar fichero por repo | ✅ `7ebd0ae` |
| Inyección de contexto en `SessionStart` | Reinyecta contexto relevante al iniciar sesión | Hook que inyecta `Estado actual` + criterios pendientes | ✅ `7ebd0ae` |
| Versión en `plugin.json` **y** en el marketplace | Misma versión en ambos manifiestos, sincronizada | Añadida `version` al entry del marketplace | ✅ `7ebd0ae` |
| Progressive disclosure (índice barato → detalle solo de IDs filtrados) | Búsqueda en 3 capas (search→timeline→get) para ahorrar tokens ~10x | Aplicable al listado de tareas de ClickUp y a resultados del grafo; encaja con TOON | 🟡 (TOON ya cubre la presentación; falta el patrón índice→detalle) |
| `doctor` / `version-check` | Comando que diagnostica coherencia de la instalación | `scripts/check-version.mjs` verifica que `plugin.json`↔`marketplace.json`↔`CHANGELOG` coinciden; corre en CI (`version-check.yml`) y antes de publicar | ✅ `fd69db1` |
| Tags `<private>` para excluir contenido sensible | Marca contenido que no debe persistirse | Marginal: nuestro estado vive en el repo, no en BD | ⛔ (sin BD que filtrar) |
| Worker service / SQLite / Chroma / viewer | Motor de memoria | — | ⛔ (sobre-ingeniería para nuestro alcance) |

---

## 2. superpowers — `obra/superpowers`

**Qué es:** metodología de desarrollo completa para agentes, sobre skills componibles que se
**auto-activan** (v6.x, MIT). ~10 harnesses. Flujo `brainstorming → worktrees → writing-plans
→ subagent-driven-development → TDD → code-review → finishing`, casi idéntico a nuestro
`/start → /plan → /implement → /review`.

**Relación con nosotros:** es la versión madura de lo que construimos. Diferencia filosófica
clave: superpowers es **ambiental** (las skills se disparan solas), nosotros somos **explícitos**
(slash commands). Nuestra oportunidad: "ambiental con gates humanos".

| Patrón | Qué es | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| Bootstrap en `SessionStart` que auto-conduce el flujo | Inyecta instrucciones que hacen al agente comprobar skills antes de actuar | Bootstrap **suave**: el hook sugiere el próximo comando según el estado de la spec + recuerda gates | ✅ `8c198fb` |
| Tablas de "Banderas rojas" | Catálogo de racionalizaciones prohibidas que endurece los gates | Añadidas a los 4 workflows de `core/` | ✅ `8c198fb` |
| Skills auto-activables vía `description` | El campo `description` es el disparador ("Use when…") | **Aclaración:** `user-invocable:false` NO bloquea la auto-activación (solo oculta del menú `/`). Sin `disable-model-invocation`, nuestras guías YA se auto-activan por su `description`; afinadas las descripciones command-scoped para disparo ambiental | ✅ `ea0e156` |
| `check-*` scripts en CI (disciplina anti-drift) | CI que falla si se violan invariantes del repo | Check que regenera con `sync.mjs` y falla si `adapters/` diverge de `core/` | ✅ `bac5610` |
| Hook *polyglot* `run-hook.cmd` (cmd→bash) + nombres sin extensión | Sortea que Claude Code en Windows antepone `bash` a comandos con `.sh` | No nos hace falta: nuestros hooks son `node` (cross-platform); evitamos el problema de raíz | ⛔ (innecesario; ventaja nuestra) |
| Manejo multi-campo de salida del hook (`additional_context` vs `hookSpecificOutput.additionalContext`) | Emite el campo que cada harness consume | Solo targeteamos Claude Code → `hookSpecificOutput.additionalContext` (ya correcto) | ✅ (validado) |
| Prosa neutral de plataforma + mapa de tools por harness | Una sola carpeta de skills, sin generar copias | Alternativa a nuestro `sync.mjs` (genera N copias). Nuestra vía evita prosa abstracta; el drift se neutraliza con el CI check | ⛔ (decisión consciente: preferimos generar) |
| Rama `dev` para PRs + `scripts/bump-version.sh` + `.version-bump.json` | Contribuciones contra `dev`; bump de versión sincronizado en todos los manifiestos | `scripts/bump-version.mjs` sincroniza `plugin.json` + `marketplace.json` + `CHANGELOG` (la rama `dev` y el `.version-bump.json` no se adoptan: trabajamos por ramas `feat/*` y la versión vive en `plugin.json`) | 🟡 `fd69db1` (bump sí; rama `dev` no) |
| Tests de comportamiento de skills (¿de verdad se activan?) | Prompts que verifican que una skill se dispara y se sigue | Eval híbrido: `check-behavior.mjs` (determinista, en CI) asevera los contratos de los prompts + checklist manual `docs/eval-comportamiento.md` para lo no determinista | ✅ `858c065` |
| Subagent-driven development (subagente por tarea, revisión en 2 etapas) | Despacha un subagente fresco por tarea con revisión spec→calidad | Posible para planes grandes en `/implement`; hoy trabajamos en el agente principal | 🔜 (evaluar; puede chocar con "empezar pequeño") |

---

## 3. code-review — `anthropics/claude-code/plugins/code-review`

**Qué es:** plugin oficial de Anthropic (v1.0.0). Un comando `/code-review [--comment]` que
lanza **agentes en paralelo** para auditar un PR desde varias perspectivas, con **scoring de
confianza** y **validación adversarial** para filtrar falsos positivos.

**Relación con nosotros:** es el espejo de nuestro `/review` (5 dimensiones, solo informa).
Aporta técnicas concretas para subir la señal y bajar los falsos positivos de ese comando.

| Patrón | Qué es | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Tiering de modelos** | haiku para descartes baratos (¿el PR necesita review?), sonnet para resúmenes/CLAUDE.md, opus para bugs | `/review` despacha 3 agentes read-only por dimensión (opus: bugs+seguridad, sonnet: spec+tests, haiku: convenciones) + un verificador adversarial (opus); `/plan` delega la reconnaissance a `explorador-repo` (sonnet). Degrada a análisis en línea en OpenCode | ✅ `b3e576b`+`d7e41fb` |
| **Scoring de confianza 0-100 + umbral** | Cada hallazgo se puntúa; se descartan los de baja confianza | Confianza por hallazgo con umbral ≥ 75, ahora en la guía `revision-hallazgos` (fuente única) | ✅ `b98d04d`+`b3e576b` |
| **Pase de validación adversarial** | Subagentes que intentan *refutar* cada hallazgo antes de reportarlo | Tras la síntesis, un agente independiente `verificador-hallazgos` (opus, contexto fresco) intenta refutar CADA hallazgo (refutación cruzada, no auto-refutación); el orquestador solo reporta los `confirmado` | ✅ `b98d04d`+`b3e576b`+`d7e41fb` |
| `allowed-tools` en el frontmatter del comando | Restringe las tools que el comando puede usar (privilegio mínimo) | **Corrección:** `allowed-tools` es PRE-APROBACIÓN de permisos, no un sandbox duro — pre-autoriza solo lectura en `/review` (privilegio mínimo), pero el solo-lectura DURO lo dan los **agentes** revisores (su campo `tools` SÍ es allowlist hard) | ✅ `b98d04d` (afirmación corregida en `b3e576b`) |
| Lista explícita de falsos positivos | Enumera qué NO flaggear (preexistente, nitpicks, lo que pilla el linter…) | Lista "qué NO reportar" en la guía `revision-hallazgos` (Fase 4.1 de `/review` la referencia) | ✅ `b98d04d`+`b3e576b` |
| Agentes independientes en paralelo | Varias perspectivas simultáneas sobre el diff | Las 5 dimensiones corren como 3 subagentes en paralelo, agrupadas por tier de modelo | ✅ `b3e576b` |
| Preámbulo "Agent assumptions" | "Las tools funcionan; no las pruebes; llama solo con propósito" | Directiva de eficiencia para nuestros comandos que despachan subagentes | 🔜 |
| Skip/guard automático | Salta PRs cerrados/draft/triviales/ya-revisados | Ya tenemos detección de trabajo previo en `/start`; extensible a `/review` | 🟡 |
| Enlaces con SHA completo + rango de líneas | `…/blob/<sha>/file#L67-L72` para enlaces estables | Útil si `/review` enlaza al código; combinable con el formato TOON de hallazgos | 🔜 (menor) |

---

## 4. frontend-design — `anthropics/claude-code/plugins/frontend-design`

**Qué es:** plugin oficial de Anthropic (v1.1.0). Una **skill auto-activable** que genera
frontend distintivo evitando la "estética genérica de IA". El `SKILL.md` es una clase magistral
de prompt para tarea creativa.

**Relación con nosotros:** doble interés. (a) Su **estructura de skill** es plantilla para
escribir las nuestras. (b) **Sinergia directa**: nuestro plugin es para proyectos Next.js, y
esta skill mejora justo el trabajo de UI que hace `/implement`.

| Patrón | Qué es | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| Skill auto-activable vía `description` fuerte | "Guidance for … Use when …" dispara la skill sin invocación explícita | Ya aplica: las guías se auto-activan por `description` (lo gobierna ese campo, no el flag `user-invocable`); redactadas como "Úsala cuando…" | ✅ `ea0e156` |
| Plantilla de skill: **persona + anti-patrones nombrados + proceso + autocrítica** | Da rol, nombra los defaults a evitar, define proceso e itera con auto-revisión | Aplicada a las guías: las 3 procedurales (`registro-progreso`, `grafo-conocimiento`, `revision-hallazgos`) con plantilla completa; las 2 de referencia (`estados-tareas`, `formato-toon`) con el espíritu (rol + anti-patrones), sin forzar persona en una tabla de consulta | ✅ `73679a3` |
| Bucle plan → autocrítica contra el brief → build | Propone un plan, lo critica contra el brief, y solo entonces implementa | Ya vive en `/plan` (gate de aprobación) e `/implement`; podríamos añadir auto-crítica explícita del enfoque antes de codificar | 🟡 |
| Campo `license` en el frontmatter de la skill | Declara licencia a nivel de skill | Trivial de añadir a nuestras skills | 🔜 (menor) |
| **Skill `frontend-design` como add-on** | La propia skill de diseño UI | **Recomendada, no empaquetada:** es propietaria de Anthropic (© Anthropic PBC, verificado en su LICENSE), así que NO se redistribuye. El README y `/implement` la sugieren como add-on opcional para UI en Next.js; el usuario la instala aparte | ✅ `e759f23` |

---

## 5. refactoring.guru — patrones de diseño y refactorización (código limpio)

**Qué es:** no es un repo ni un plugin, sino una **fuente de conocimiento** (refactoring.guru,
basada en Fowler y el GoF): catálogo de **23 patrones de diseño** en 3 familias (creacionales,
estructurales, de comportamiento), **21 olores de código** (code smells) en 5 familias, **66
técnicas de refactorización** en 6 familias, y la disciplina de **código limpio** (qué es,
deuda técnica, cuándo y cómo refactorizar de forma segura). Incluye una página de **crítica a
los patrones** especialmente valiosa para nosotros.

**Relación con nosotros:** encaja de lleno con el ADN del plugin (TDD + revisión + calidad).
Aterriza en tres puntos concretos: el **paso de refactor** que le faltaba al ciclo TDD de
`/implement` (red-green-**refactor**), la dimensión de **deuda técnica** de `/review` (olores
nombrados en vez de «convención rota» difusa) y el criterio de **cuándo introducir una
abstracción** en el enfoque de `/plan`. Ojo con el filtro: los patrones son el clásico imán de
sobre-ingeniería, así que la guía de patrones se redactó **crítica-first** (aplicar un patrón
solo ante el problema real), reforzando el anti-objetivo «sobre-ingeniería» en vez de
contradecirlo.

| Patrón | Qué es | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| Paso **refactor** en el ciclo TDD | red-green-**refactor**: con la suite en verde, limpiar antes de cerrar el criterio | Nuevo paso 4 en la Fase 3 de `/implement`, guiado por `codigo-limpio` (pasos pequeños, verde antes/después, sin features nuevas) | ✅ rama `feat/guias-codigo-limpio-patrones` |
| Guía **código limpio + olores + refactor seguro** | 5 rasgos del código limpio, catálogo condensado de los 21 olores con su cura, disciplina de refactor | Nueva guía `core/guides/codigo-limpio.md` (skill auto-activable en ambos adaptadores); referenciada por `/implement` y `/review` | ✅ rama `feat/guias-codigo-limpio-patrones` |
| Guía **patrones de diseño (crítica-first)** | Mapa olor→patrón + las 3 familias + la crítica (síndrome del martillo) | Nueva guía `core/guides/patrones-diseno.md`; referenciada por `/plan` (enfoque) y `/implement` (refactor). Introducir patrón solo ante el problema real | ✅ rama `feat/guias-codigo-limpio-patrones` |
| Dimensión **deuda técnica** en la revisión | Olores de código como hallazgos accionables | Dimensión 4 de `/review` pasa a «Convenciones y deuda técnica»; `revisor-convenciones` detecta olores que el diff introduce, con la disciplina de `revision-hallazgos` (umbral, no-flag, no preexistentes) | ✅ rama `feat/guias-codigo-limpio-patrones` |
| **Singleton como anti-patrón** | El propio sitio lo marca: viola SRP, acopla, dificulta tests | Documentado en `patrones-diseno` con la alternativa (inyección de dependencias) | ✅ rama `feat/guias-codigo-limpio-patrones` |
| **Crítica a los patrones** + olor _Generalidad especulativa_ | «Aplicar patrones en todas partes es sobre-ingeniería» | Refuerza el anti-objetivo «sobre-ingeniería» del filtro; banderas rojas nuevas en `/plan` e `/implement` | ✅ rama `feat/guias-codigo-limpio-patrones` |
| Catálogo **navegable** completo (23 patrones × 66 técnicas, un doc por cada uno) | Referencia enciclopédica al estilo del sitio | Descartado: inflaría el plugin. Las guías **condensan** lo accionable (mapa olor→técnica/patrón) y enlazan el vocabulario; el detalle exhaustivo vive en la web | ⛔ (sobre-ingeniería documental para nuestro alcance) |

---

## 6. Bibliografía de testing — ISTQB · ISO 29119 · Playwright · Selenium · Jest/Testing Library · JMeter · Postman · OWASP Juice Shop · Ministry of Testing · Test Automation University

**Qué es:** no es un repo ni un plugin, sino un **currículo de testing**: normativa y fundamentos
(ISTQB Foundation Level + glosario; ISO/IEC/IEEE 29119 partes 1–5), herramientas de automatización
(Playwright, Selenium, Jest + Testing Library), tipos especializados (JMeter para rendimiento,
Postman para API, OWASP Juice Shop para seguridad) y comunidad/formación (Ministry of Testing,
Test Automation University).

**Relación con nosotros:** el plugin no es un framework de test sino un **workflow de desarrollo**;
su "fase de pruebas" vive en tres artefactos —el diseño de casos de `/plan` (guía
`historias-usuario`), el ciclo TDD de `/implement` y las dimensiones de tests/seguridad de
`/review`—. Por eso esta bibliografía aporta **vocabulario, técnicas y checklists que se hornean en
las guías y agentes, nunca maquinaria nueva ni comandos nuevos**. Filtro clave: los tipos
no-funcionales (rendimiento, API, seguridad activa) se **nombran** en la estrategia; su ejecución
es del repo objetivo, no del plugin.

| Fuente | Qué aporta | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **[1] ISTQB** (Foundation + glosario) | Técnicas de caja negra (partición de equivalencia, valores límite, tabla de decisión, transición de estados), vocabulario (defecto/error/fallo, oráculo), 7 principios, cobertura | Nueva sección "Técnicas de diseño de casos de prueba" en `historias-usuario`: formaliza la matriz V/I/N/A que ya existía | ✅ rama `feat/bibliografia-testing` |
| **[2] ISO/IEC/IEEE 29119** (partes 1–5) | Parte 4: técnicas + medida de cobertura; Parte 2: testing basado en riesgo; Parte 3: plantillas documentales | Parte 4 refuerza a ISTQB en `historias-usuario`; testing basado en riesgo → sección "Riesgos" de `/plan`; plantillas descartadas (spec.md esbelto, gestión en ClickUp) | 🟡 (técnicas ✅ · riesgo 🔜 · plantillas ⛔) |
| **[3] Playwright** | E2E cross-browser, auto-wait, locators por rol/accesibilidad | E2E por defecto en Next.js en la nueva guía `niveles-y-tipos-de-prueba` | ✅ rama `feat/bibliografia-testing` |
| **[4] Selenium** | WebDriver (estándar W3C), Grid distribuido | Fallback: solo si el repo objetivo ya lo usa (respetar el runner existente) | 📖 referencia |
| **[5] Jest + Testing Library** | "Probar comportamiento, no implementación"; niveles unidad/componente | Respaldo canónico a la bandera roja del paso 1 del TDD de `/implement`; niveles en `niveles-y-tipos-de-prueba` | ✅ rama `feat/bibliografia-testing` |
| **[6] Apache JMeter** | Rendimiento/carga (throughput, tiempos, percentiles) | Tipo no-funcional a **nombrar** en la estrategia (`niveles-y-tipos-de-prueba`); su ejecución es del repo objetivo | 🟡 (nombrado, no integrado) |
| **[7] Postman** | Testing de API, Newman (CI), contract testing | Nivel/tipo API a **nombrar** en `niveles-y-tipos-de-prueba`; su ejecución es del repo objetivo | 🟡 (nombrado, no integrado) |
| **[8] OWASP Juice Shop** | Taxonomía OWASP Top 10 de vulnerabilidades web | Checklist OWASP Top 10 adaptado a Next.js en `revisor-bugs-seguridad` y en la dim. 5 de `/review` | ✅ rama `feat/bibliografia-testing` |
| **[9] Ministry of Testing** | Whole-team quality, corriente context-driven (contrapeso a la formalidad de 29119) | Encuadre cultural; citada como fuente al redactar/mantener las guías de pruebas | 📖 referencia |
| **[10] Test Automation University** | Cursos gratuitos por tema (web, API, rendimiento, programación) | Material para profundizar cada técnica al mantener las guías | 📖 referencia |

**Adoptado en esta iteración:** técnicas de caja negra en `historias-usuario` · guía nueva
`niveles-y-tipos-de-prueba` (pirámide + tipos no-funcionales a nombrar) · checklist OWASP Top 10
en `/review` · "comportamiento, no implementación" en el TDD de `/implement`.
**Descartado por el filtro:** plantillas documentales de 29119-3 (spec.md esbelto; gestión en
ClickUp) e integrar maquinaria no-funcional (JMeter/Newman/Selenium-Grid) o empaquetar Juice Shop
—son del repo objetivo, no del plugin—.
**Pendiente (🔜):** testing basado en riesgo (29119-2) en la sección "Riesgos" de `/plan`.

---

## Backlog consolidado de mejoras (priorizado)

Orden sugerido para próximas iteraciones, por relación valor/coste y encaje con la filosofía:

1. ✅ **Endurecer `/review` con técnicas de `code-review`** — hecho en `b98d04d`:
   `allowed-tools` read-only + scoring de confianza + lista de no-flag + auto-refutación.
2. ✅ **Tiering de modelos en subagentes** de `/review` y `/plan` — `b3e576b`+`d7e41fb`:
   `/review` despacha 3 agentes read-only por dimensión (opus/sonnet/haiku) + un verificador
   adversarial independiente (`verificador-hallazgos`, opus) que refuta los hallazgos antes del
   informe; `/plan` delega la reconnaissance estructural a `explorador-repo` (sonnet). Todos
   read-only duros (`tools: Read, Grep, Glob`); degradan a análisis/exploración en línea en
   OpenCode. → §3.
3. ✅ **Skills auto-activables** — `ea0e156`: hallazgo de que `user-invocable:false` solo
   oculta del menú `/` y NO bloquea la auto-activación (volcar el flag, como sugería la versión
   inicial de este punto, habría expuesto guías internas como comandos). Las guías ya se
   auto-activan por `description`; se afinaron las descripciones command-scoped
   (`grafo-conocimiento`, `registro-progreso`) para disparo ambiental y se documentó la
   intención en `sync.mjs`. → §2, §4.
4. ✅ **Reescribir guías con la plantilla de skill** — `73679a3`: persona + anti-patrones
   nombrados + proceso + autocrítica en las 3 guías procedurales; rol + anti-patrones (sin
   persona forzada) en las 2 de referencia. → §4.
5. ✅ **Script de bump de versión** — `fd69db1`: `bump-version.mjs` sincroniza `plugin.json` +
   `marketplace.json` + `CHANGELOG`, y `check-version.mjs` (doctor, en CI) falla si divergen.
   → §1, §2.
6. ✅ **Tests de comportamiento de skills/comandos** — `858c065`: eval híbrido — mitad
   determinista (`check-behavior.mjs`, en CI) que asevera los contratos + mitad manual
   (`docs/eval-comportamiento.md`) para lo no determinista. → §2.
7. ✅ **Add-on `frontend-design`** — `e759f23`: la evaluación concluyó que es propietario de
   Anthropic (no se puede empaquetar); integrado por **recomendación** (README + nota en
   `/implement`), el usuario lo instala aparte. → §4.

**Backlog consumido (#1–#7).** Nuevas mejoras salen de analizar repos nuevos (añade una sección
`## N. <repo>` con su tabla) o de los patrones aún en 🔜/🟡 de las tablas de arriba (p. ej.
`license` en skills §4, auto-crítica explícita en `/plan` §4, progressive disclosure §1,
testing basado en riesgo §6/[2]).

## Registro de lo ya adoptado

| Mejora | Origen | Commit |
|---|---|---|
| `.mcp.json` empaquetado (ClickUp por env vars) | claude-mem | `7ebd0ae` |
| Hook `SessionStart` de continuidad (estado de la tarea) | claude-mem | `7ebd0ae` |
| Manifiestos completos + `version` en marketplace | claude-mem | `7ebd0ae` |
| Bootstrap suave de auto-conducción en `SessionStart` | superpowers | `8c198fb` |
| Tablas de "Banderas rojas" en los 4 workflows | superpowers / frontend-design | `8c198fb` |
| CI anti-drift (`sync.mjs` + `git diff`) | superpowers (disciplina `check-*`) | `bac5610` |
| `.gitattributes` con `eol=lf` (EOL determinista) | endurecimiento propio | `3b02f60` |
| `/review` read-only (allowed-tools) + confianza + no-flag + auto-refutación | code-review | `b98d04d` |
| Tiering de modelos en `/review` vía 3 agentes read-only + corrección de la afirmación sobre `allowed-tools` | code-review | `b3e576b` |
| Refutación cruzada (`verificador-hallazgos`, opus) en `/review` + explorador read-only en `/plan` (`explorador-repo`, sonnet) | code-review / superpowers | `d7e41fb` |
| Auto-activación de guías documentada + descripciones afinadas (corrige la premisa sobre `user-invocable`) | superpowers / frontend-design | `ea0e156` |
| Guías reescritas con la plantilla de skill (persona + anti-patrones + proceso + autocrítica) | frontend-design | `73679a3` |
| Scripts de bump y doctor de versión + CI de coherencia (`plugin.json`/`marketplace.json`/`CHANGELOG`) | claude-mem / superpowers | `fd69db1` |
| Eval de comportamiento híbrido (check determinista en CI + checklist manual) | superpowers | `858c065` |
| Recomendación del add-on `frontend-design` (composición, no redistribución: es propietario) | frontend-design | `e759f23` |
| Paso `refactor` en el ciclo TDD de `/implement` (red-green-refactor) | refactoring.guru | rama `feat/guias-codigo-limpio-patrones` |
| Guía `codigo-limpio` (código limpio + 21 olores + refactor seguro) | refactoring.guru | rama `feat/guias-codigo-limpio-patrones` |
| Guía `patrones-diseno` (crítica-first: patrón solo ante el problema real) | refactoring.guru | rama `feat/guias-codigo-limpio-patrones` |
| Dimensión «Convenciones y deuda técnica» en `/review` + `revisor-convenciones` | refactoring.guru | rama `feat/guias-codigo-limpio-patrones` |
| Técnicas de diseño de casos de caja negra (partición, valores límite, tabla de decisión, estados) en `historias-usuario` | ISTQB / ISO 29119-4 | rama `feat/bibliografia-testing` |
| Guía `niveles-y-tipos-de-prueba` (pirámide + tipos no-funcionales a nombrar, no integrar) | ISTQB / Jest+Testing Library / Playwright | rama `feat/bibliografia-testing` |
| Checklist OWASP Top 10 adaptado a Next.js en `revisor-bugs-seguridad` y dim. 5 de `/review` | OWASP Juice Shop | rama `feat/bibliografia-testing` |
| «Comportamiento, no implementación» en el paso 1 del ciclo TDD de `/implement` | Jest + Testing Library | rama `feat/bibliografia-testing` |

---

_Última actualización: 2026-07-24. Mantén este documento al día cuando adoptes un patrón o
analices un repo nuevo._
