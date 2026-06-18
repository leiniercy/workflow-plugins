# Referencias externas para la evolución de `custom-ia-plugin`

> Catálogo de plugins y frameworks analizados como fuente de patrones para futuras
> mejoras del plugin. Cada entrada resume **qué es**, **qué patrones aporta** y **cómo
> aplican (o no) a nuestro plugin**.
>
> **Estado** de cada patrón:
> `✅ adoptado` · `🔜 pendiente` · `🟡 parcial` · `⛔ descartado (con motivo)`

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
| `doctor` / `version-check` | Comando que diagnostica coherencia de la instalación | Un check de coherencia `plugin.json`↔`marketplace.json`↔`CHANGELOG` antes de publicar | 🔜 |
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
| Skills auto-activables vía `description` | El campo `description` es el disparador ("Use when…") | Nuestras guías son `user-invocable:false` y solo se cargan desde comandos; podrían auto-dispararse (p.ej. `estados-tareas`) | 🔜 |
| `check-*` scripts en CI (disciplina anti-drift) | CI que falla si se violan invariantes del repo | Check que regenera con `sync.mjs` y falla si `adapters/` diverge de `core/` | ✅ `bac5610` |
| Hook *polyglot* `run-hook.cmd` (cmd→bash) + nombres sin extensión | Sortea que Claude Code en Windows antepone `bash` a comandos con `.sh` | No nos hace falta: nuestros hooks son `node` (cross-platform); evitamos el problema de raíz | ⛔ (innecesario; ventaja nuestra) |
| Manejo multi-campo de salida del hook (`additional_context` vs `hookSpecificOutput.additionalContext`) | Emite el campo que cada harness consume | Solo targeteamos Claude Code → `hookSpecificOutput.additionalContext` (ya correcto) | ✅ (validado) |
| Prosa neutral de plataforma + mapa de tools por harness | Una sola carpeta de skills, sin generar copias | Alternativa a nuestro `sync.mjs` (genera N copias). Nuestra vía evita prosa abstracta; el drift se neutraliza con el CI check | ⛔ (decisión consciente: preferimos generar) |
| Rama `dev` para PRs + `scripts/bump-version.sh` + `.version-bump.json` | Contribuciones contra `dev`; bump de versión sincronizado en todos los manifiestos | Script de bump al publicar 0.1.1 (toca `plugin.json` y `marketplace.json`) | 🔜 |
| Tests de comportamiento de skills (¿de verdad se activan?) | Prompts que verifican que una skill se dispara y se sigue | Eval ligero: prompts que verifican que el agente elige el comando correcto | 🔜 |
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
| **Tiering de modelos** | haiku para descartes baratos (¿el PR necesita review?), sonnet para resúmenes/CLAUDE.md, opus para bugs | `/review` podría despachar subagentes con el modelo adecuado por dimensión (haiku: convenciones/nits; opus: bugs/seguridad) | 🔜 (alto valor) |
| **Scoring de confianza 0-100 + umbral 80** | Cada hallazgo se puntúa; se descartan los < 80 | Añadir confianza por hallazgo en el informe de `/review` y filtrar ruido | 🔜 (alto valor) |
| **Pase de validación adversarial** | Subagentes que intentan *refutar* cada hallazgo antes de reportarlo | Validar cada hallazgo Crítico/Alto antes de incluirlo; reduce falsos positivos | 🔜 (alto valor) |
| `allowed-tools` en el frontmatter del comando | Restringe las tools que el comando puede usar (privilegio mínimo) | **Hace cumplir técnicamente** el "solo-lectura" de `/review` (sin Edit/Write), no solo por prosa | 🔜 (alto valor; refuerza las banderas rojas de review) |
| Lista explícita de falsos positivos | Enumera qué NO flaggear (preexistente, nitpicks, lo que pilla el linter…) | Encaja con nuestras banderas rojas; añadir a `/review` la lista de "qué no reportar" | 🟡 (banderas rojas ya, falta la lista de no-flag) |
| Agentes independientes en paralelo | Varias perspectivas simultáneas sobre el diff | Nuestras 5 dimensiones podrían correr en paralelo como subagentes | 🔜 |
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
| Skill auto-activable vía `description` fuerte | "Guidance for … Use when …" dispara la skill sin invocación explícita | Refuerza el patrón de superpowers; aplicar a nuestras guías | 🔜 |
| Plantilla de skill: **persona + anti-patrones nombrados + proceso + autocrítica** | Da rol, nombra los defaults a evitar, define proceso e itera con auto-revisión | Modelo para reescribir nuestras guías; "nombra los defaults a evitar" generaliza nuestras banderas rojas | 🟡 (banderas rojas aplican la idea; falta la persona/proceso) |
| Bucle plan → autocrítica contra el brief → build | Propone un plan, lo critica contra el brief, y solo entonces implementa | Ya vive en `/plan` (gate de aprobación) e `/implement`; podríamos añadir auto-crítica explícita del enfoque antes de codificar | 🟡 |
| Campo `license` en el frontmatter de la skill | Declara licencia a nivel de skill | Trivial de añadir a nuestras skills | 🔜 (menor) |
| **Skill `frontend-design` como add-on** | La propia skill de diseño UI | Empaquetarla/recomendarla junto a nuestro plugin para tareas de UI en Next.js (atribuir, MIT/ver licencia) | 🔜 (sinergia fuerte; evaluar) |

---

## Backlog consolidado de mejoras (priorizado)

Orden sugerido para próximas iteraciones, por relación valor/coste y encaje con la filosofía:

1. **Endurecer `/review` con técnicas de `code-review`** (alto valor): `allowed-tools` para
   forzar solo-lectura + scoring de confianza + lista de no-flag + (opcional) validación
   adversarial de hallazgos Críticos/Altos. → patrones de §3.
2. **Tiering de modelos en subagentes** de `/review` (y `/plan`): haiku/sonnet/opus por
   dimensión/tarea. → §3.
3. **Skills auto-activables**: dejar de marcar todas las guías como `user-invocable:false`
   donde tenga sentido (p.ej. `estados-tareas`). → §2, §4.
4. **Reescribir guías con la plantilla de skill** (persona + anti-patrones + proceso). → §4.
5. **Script de bump de versión** que sincronice `plugin.json` + `marketplace.json` + `CHANGELOG`
   (+ check de coherencia tipo `doctor`). → §1, §2.
6. **Tests de comportamiento de skills/comandos** (eval ligero de activación). → §2.
7. **Add-on `frontend-design`** para tareas de UI en Next.js (evaluar empaquetado y licencia). → §4.

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

---

_Última actualización: 2026-06-18. Mantén este documento al día cuando adoptes un patrón o
analices un repo nuevo._
