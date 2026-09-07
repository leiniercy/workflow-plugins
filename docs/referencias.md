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

> **Re-analizado a fondo en v6.2.0** (2026-07-31). La primera pasada (tabla «primera pasada»
> abajo) cubrió la infraestructura; esta segunda leyó las 16 skills, las 8 plantillas de prompt
> y los scripts. La mitad del valor estaba en material no leído entonces —sobre todo
> `writing-skills` y el `subagent-driven-development` ya maduro—, así que las secciones §2.A–§2.D
> son nuevas.

**Qué es:** metodología de desarrollo completa para agentes, sobre skills componibles que se
**auto-activan** (v6.2.0, MIT, Jesse Vincent / Prime Radiant). 11 harnesses; distribuido
también por el **marketplace oficial de Anthropic**. Flujo `brainstorming → worktrees →
writing-plans → subagent-driven-development → TDD → code-review → finishing`, casi idéntico a
nuestro `/start → /plan → /implement → /review`.

**Relación con nosotros:** es la versión madura de lo que construimos. Diferencia filosófica
clave: superpowers es **ambiental** (las skills se disparan solas), nosotros somos **explícitos**
(slash commands). Nuestra oportunidad: "ambiental con gates humanos".

**Corrección a la primera pasada:** la fila «tono coercitivo → ⛔ incompatible» era correcta como
decisión pero incompleta como diagnóstico. `writing-skills` documenta con evidencia **cuándo el
tono duro funciona y cuándo es contraproducente** (§2.A, A3): la regla no es «nunca prohibir»,
es «prohibición para fallos de disciplina, receta positiva para fallos de forma».

### 2.0 — Primera pasada (infraestructura)

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
| Subagent-driven development (subagente por tarea, revisión en 2 etapas) | Despacha un subagente fresco por tarea con revisión spec→calidad | La **maquinaria** (worktree + subagente por tarea) sigue chocando con «empezar pequeño», pero su **disciplina** sí se adopta: ver §2.B | 🟡 (disciplina sí, maquinaria no) |

### 2.A — `writing-skills`: la meta-skill

Es el material más directamente aplicable a nosotros: cómo se escribe y se valida una skill.
Su tesis: **escribir skills ES TDD aplicado a documentación de proceso** — el escenario de
presión es el test, la skill es el código, y sin ver fallar al agente *sin* la skill no sabes
si la skill enseña lo correcto.

| Patrón | Qué dice | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **`description` = cuándo usar, NUNCA qué hace** | Si la descripción resume el flujo de la skill, **el agente sigue la descripción y no abre la skill**. Evidencia suya: una descripción que decía «code review between tasks» hizo que el agente hiciera **una** revisión aunque el diagrama pedía **dos**. Objetivo: ≤ 500 chars, solo condiciones de disparo y síntomas buscables | **Nos aplicaba de lleno** (medido: descripciones de hasta 925 chars que enumeraban el contenido entero). Las 14 reescritas como disparadores puros («Úsala cuando…» + síntomas); `check-behavior.mjs` asevera ahora ≤ 500 chars, presencia de «Úsala» y el techo de 1024 del frontmatter | ✅ rama `feat/superpowers-v6-2` |
| **Match the Form to the Failure** | Tabla fallo→forma: **disciplina** (sabe la regla y la salta) → prohibición + tabla de racionalizaciones + banderas rojas · **forma equivocada de la salida** → **receta positiva** («la salida ES X, Y, Z en este orden») · **omite un elemento** → **slot REQUIRED estructural** · comportamiento condicional → condicional sobre un predicado observable | Reencuadra nuestras «banderas rojas» (`8c198fb`), que aplicamos por igual a los 4 workflows. Criterio adoptado al redactar lo nuevo de esta iteración: las banderas rojas nuevas atacan disciplina; lo que da forma a una salida (informe de `/review`, secciones de `spec.md`) se redactó como receta | ✅ rama `feat/superpowers-v6-2` (criterio) · 🔜 (auditar las banderas rojas existentes) |
| **Las prohibiciones se vuelven en contra en fallos de forma** | En pruebas A/B de wording, el brazo con prohibición produjo **más** contenido no deseado que el control **sin guía ninguna**. «Una receta no deja nada que negociar» | El dato más contraintuitivo del repo: explica por qué «no hagas X» falla bajo un incentivo competidor. Es el fundamento de la fila anterior | 📖 (fundamento) |
| **Nada de cláusulas de matiz** | «No hagas X salvo que importe» reabre la negociación: añadir **una** cláusula degradó una receta ganadora de consistente a ruidosa. Y **las exenciones no acotan**: «esto no aplica a bloques de código» igual suprime los bloques de código | Auditable en nuestras guías, densas en «salvo que» / «si procede» | 🔜 |
| **Micro-test de wording antes del escenario completo** | 1 muestra fresca por llamada · **siempre un control sin guía** (si el control no falla, no escribas la guía) · **5+ reps** · leer a mano cada match (los ecos de plantilla se cuelan) · **la varianza es una métrica**: 5 lecturas distintas = el wording no ata | Capa barata que le falta a `docs/eval-comportamiento.md`, entre el check determinista y la checklist manual. Adoptado en `check-activation.mjs`: el control sin guía es `--baseline` («si el control no falla, no escribas la guía» = ⚠ SIN DELTA) y `--runs N` añade la varianza como métrica — un caso solo pasa si es estable en las N, porque si unas activan y otras no, el que no ata es el wording | ✅ rama `feat/cierre-de-backlog` |
| Ley de hierro: ninguna skill sin test que falle primero | RED = correr el escenario **sin** la skill y anotar las racionalizaciones **verbatim**; GREEN = skill mínima que ataca justo esas; REFACTOR = cerrar los huecos nuevos. Aplica también a las **ediciones** | Invierte nuestro orden (escribimos y evaluamos después). Adoptable de forma parcial y barata: al menos anotar el fallo base antes de redactar | 🔜 |
| Cada tipo de skill se testea distinto | Disciplina → presión combinada · Técnica → aplicación + huecos · Patrón → reconocimiento + contraejemplos · Referencia → recuperación + cobertura | Formaliza nuestra división «procedurales vs. referencia» (`73679a3`) | 🟡 |
| Presupuesto de tokens (<150 bootstrap / <200 muy cargadas / <500 resto) verificado con `wc -w` | Toda skill frecuente compite por contexto | Nuestras guías son de 2-10 KB; algunas son referencia densa a propósito. Aplicado al **frontmatter** (que sí se carga siempre), no al cuerpo | 🟡 (deliberado) |
| Sin enlaces `@` en skills | `@ruta` fuerza la carga inmediata y quema contexto antes de necesitarlo | ✅ **Verificado:** nuestro `{{guide:x}}` expande a referencia textual, no fuerza carga. Cumplíamos sin saberlo | ✅ (validado) |
| Nombres verbo-primero, en gerundio | `condition-based-waiting` > `async-test-helpers` | ⛔ **Decisión consciente:** nuestras guías son sustantivas (`codigo-limpio`, `arquitectura`) porque la mayoría son catálogos de referencia, no procedimientos | ⛔ |
| Diagramas solo para decisiones no obvias | Nunca para referencia (→ tablas), código (→ bloques) ni pasos lineales (→ listas) | Cumplido por omisión: apenas usamos diagramas | ✅ (validado) |
| `persuasion-principles.md` | Base investigadora (Cialdini 2021; Meincke et al. 2025) de por qué autoridad/compromiso/escasez funcionan en un prompt | Fuente al mantener las guías de disciplina | 📖 referencia |

### 2.B — `subagent-driven-development`: la disciplina, no la maquinaria

28 KB de skill. Lo valioso no es el flujo (parecido al nuestro) sino la **ingeniería de coste y
de recuperación** que han destilado de sesiones reales, con las cifras del fallo que la motivó.

| Patrón | Qué dice | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Ledger anti-compactación** | «La memoria de conversación no sobrevive a la compactación. Controladores que perdieron el sitio han **re-despachado secuencias enteras de tareas ya completas — el fallo más caro observado**». Tras compactar, **fía del fichero y de `git log`, no de tu recuerdo** | **Convergencia**: nuestro `progress.md` resuelve el mismo problema y ya es la fuente de continuidad. Confirma el diseño | ✅ (validado, `7ebd0ae`) |
| **Los artefactos van por fichero, nunca por el contexto** | «Todo lo que pegas en un prompt y todo lo que un subagente imprime **queda residente en tu contexto el resto de la sesión y se relee en cada turno**». 3 scripts: dir de trabajo por plan, extracción de la tarea a fichero, y **paquete de revisión** (commits + stat + `git diff -U10`) a fichero: al revisor se le pasa **la ruta**, no el diff. Dato real: un dispatch llegó a 42k chars, 99% historial pegado | Adoptado en la Fase 2 de `/review`: `git diff -U10 > /tmp/review-<taskId>.diff` y a los **cinco** agentes se les pasa la RUTA. `--stat` y los commits sí se quedan en contexto, que es lo que hace falta para repartir dimensiones. **De los dos obstáculos anotados, uno no existía**: el `tools` de los agentes no cambia, porque `Read` ya les basta para abrir el paquete — solo cambia su contrato de entrada. El otro se resolvió solo: en OpenCode no hay subagentes, así que no hay cuatro copias que ahorrar y la degradación es leer el diff como siempre. El fichero va fuera del repo a propósito, para que «solo informa» siga siendo literal | ✅ rama `feat/paquete-de-revision` |
| **Tope de rondas + disyuntor + adjudicación escrita** | Máx. 5 rondas de corrección por tarea; al tope se **adjudica** cada hallazgo abierto: aparcar con veredicto escrito, o **PARAR** si es portante. «Adjudicar antes del tope es pre-juzgar con otro nombre». **Los descartes silenciosos están prohibidos** | Adoptado en la guía nueva `recepcion-de-revision` y en el modo CORRECCIÓN de `/implement`, con **tope de 3** (no 5): sin escalado de modelo en el agente principal, 3 es el mismo umbral que la regla de los tres arreglos de la depuración sistemática, y por la misma razón | ✅ rama `feat/superpowers-v6-2` |
| **Re-verificación acotada** | Tras el fix se revisa **solo el diff del fix**, veredictando cada hallazgo `corregido`/`no corregido`. Lo nuevo fuera de alcance se anota; **nunca alarga la ronda**. Los Minor no entran al bucle: se difieren y se triagean antes del merge | En `recepcion-de-revision` y en el modo CORRECCIÓN | ✅ rama `feat/superpowers-v6-2` |
| **No pre-juzgues por el revisor** | Lint sobre tu propio prompt de despacho: si contiene «no marques X», «no lo trates como defecto», «como mucho Minor», «el plan lo eligió» → **para: estás ahorrándote una ronda a costa de la señal** | Adoptado en la Fase 3 de `/review` y en `revision-hallazgos`, **con el matiz que lo hace compatible** con nuestra lista «qué NO reportar»: lo prohibido es el pre-juicio *ad-hoc del orquestador sobre este caso*; una **rúbrica general** que el revisor aplica a todo es legítima | ✅ rama `feat/superpowers-v6-2` |
| **«No te fíes del report»** | Lo que el implementador cuenta son **afirmaciones sin verificar**. Y las justificaciones de diseño («lo dejé por YAGNI», «lo mantuve simple a propósito») son **el autor calificando su propio trabajo**: una justificación **nunca baja por sí sola la severidad** | Adoptado en `revision-hallazgos` (regla 1 de independencia), en `revisor-spec-tests` y en `verificador-hallazgos`, aplicado a lo que afirma `progress.md` | ✅ rama `feat/superpowers-v6-2` |
| **Hallazgo `plan-mandated`** | Si el plan **exige** algo que la rúbrica considera defecto, **sigue siendo un hallazgo**: se reporta etiquetado, y **decide el humano**. «La autoría del plan no califica su propio trabajo» | Adoptado como **`exigido-por-spec`**: apartado propio en el informe de `/review`, con el texto de spec que lo obliga; ni se corrige ni se silencia. Cierra un hueco real — hasta ahora un criterio mal planteado no tenía ruta de escape | ✅ rama `feat/superpowers-v6-2` |
| **Veredicto ⚠️ «no verificable desde el diff»** | Tercera categoría junto a ✅/❌ para requisitos que viven en código no tocado o cruzan tareas. El revisor **no amplía su búsqueda**: lo declara, y lo resuelve quien orquesta, que sí tiene el contexto | Adoptado en la dimensión 1 de `/review`, en `revisor-spec-tests` y en `revision-hallazgos`, con la obligación de resolverlos **todos** en la Fase 4.1 | ✅ rama `feat/superpowers-v6-2` |
| **Tiering, refinado** | (a) «Especifica SIEMPRE el modelo: omitirlo hereda el de la sesión —normalmente el más caro— y anula esta sección en silencio». (b) **«El número de turnos pesa más que el precio por token»**: los modelos baratos gastan 2-3× turnos en trabajo multi-paso y salen más caros → **mid-tier como suelo** para revisores; el tier más barato solo para transcripción | Ambas adoptadas: regla explícita de indicar modelo en la Fase 3 de `/review`, y **`revisor-convenciones` sube de haiku a sonnet** (deducir el patrón vigente exige leer ficheros vecinos: es multi-turno, no transcripción) | ✅ rama `feat/superpowers-v6-2` |
| Disciplina de alcance del revisor | Leer el fichero de diff una vez; «las líneas de contexto del diff SON los ficheros cambiados»; no rastrear el repo; salir del diff solo por un **riesgo concreto que puedas nombrar**, un check por riesgo | ⛔ **Filosofía opuesta, decisión consciente:** nuestro `/review` lee los ficheros afectados completos porque optimiza exhaustividad sobre coste, y porque nuestros revisores no tienen Bash. El ⚠️ de arriba nos da lo mejor de su regla (no rastrear el repo entero) sin renunciar a leer el fichero tocado | ⛔ (consciente) |
| Contrato de forma del informe | «Tu mensaje final ES el informe: empieza por el veredicto. Cada línea es un veredicto, un hallazgo con fichero:línea, o un check que ejecutaste — sin preámbulo, sin narrar el proceso, sin resumen de cierre» | Ejemplo canónico de «receta positiva» (§2.A/A3). Nuestros agentes ya tienen «Formato de salida», menos tajante | 🔜 (menor) |
| Escaneo previo de conflictos, en lote | Antes de empezar, buscar tareas que se contradigan o exijan lo que la rúbrica llama defecto → **una sola pregunta agrupada**, no una interrupción por hallazgo | Encaja con la auto-revisión de spec adoptada en `/plan` (§2.C), que lo hace en el momento de redactar en vez de al empezar a implementar | 🟡 |
| Una sola oleada de fixes | Ante N hallazgos, un solo agente con la lista completa: «cada fixer reconstruye contexto y re-ejecuta suites; la oleada final de una sesión real costó más que todas sus tareas juntas» | No nos aplica hoy (corregimos en el agente principal), pero es la razón por la que no conviene despachar un subagente por hallazgo si algún día lo hacemos | 📖 |
| Ejecución continua sin checkpoints | «No pares a consultar entre tareas; 'should I continue?' malgasta su tiempo» | ⛔ **Choca de frente con «gates humanos para todo lo visible»**. Sus gates están en diseño y en cierre; los nuestros, además, en cada acción visible. Diferencia filosófica real, no un descuido suyo ni nuestro | ⛔ |

### 2.C — Skills que no teníamos

| Skill suya | Contenido clave | Qué hicimos | Estado |
|---|---|---|---|
| **`systematic-debugging`** | 4 fases; ley de hierro «ningún arreglo sin causa raíz»; **regla de los 3 arreglos fallidos → cuestiona la arquitectura** (no es una hipótesis fallida, es un diseño equivocado); instrumentar **cada frontera** de componente antes de proponer nada; y una tabla única de **señales del usuario de que lo estás haciendo mal** («¿eso no está pasando?» = asumiste sin verificar; «deja de adivinar»; «¿estamos atascados?») | **Guía nueva `depuracion-sistematica`**, cableada en el paso 2 del ciclo TDD de `/implement` (fallo inesperado) y en el modo CORRECCIÓN; añade sobre la fuente la **petición de datos al usuario como paso de investigación** (fase 1.6). Era nuestro mayor hueco: el modo corrección saltaba directo a «test que reproduce → arregla» sin exigir entender la causa | ✅ rama `feat/guia-depuracion-sistematica` |
| **`receiving-code-review`** | Cómo **recibir** feedback: prohibido el acuerdo performativo («tienes toda la razón», cualquier agradecimiento); verificar contra el código antes de implementar; **filtro YAGNI sobre la sugerencia del revisor** (grep: ¿se usa siquiera?); **aclarar TODOS los ítems dudosos antes de implementar NINGUNO**; cuándo y cómo rebatir | **Guía nueva `recepcion-de-revision`** (rama `feat/guia-recepcion-de-revision`), que además absorbe el tope/disyuntor de §2.B. Teníamos el lado emisor (`/review`) y nada del receptor —que es exactamente el modo CORRECCIÓN de `/implement`— | ✅ rama `feat/superpowers-v6-2` |
| **`verification-before-completion`** | Ley: «sin evidencia fresca no hay afirmación de completitud». Gate: identificar el comando → ejecutarlo entero → leer salida y código de salida → verificar → **solo entonces** afirmar. Tabla claim/requiere/no-basta, con la fila clave: **«el agente completó» requiere el diff de VCS, no su informe de éxito** | Absorbido como **disciplina**, no como guía nueva (evitar inflar el catálogo): paso 3 de la Fase 3 y **paso 0 de la Fase 4** de `/implement` (ejecutar la suite AHORA, no vale una ejecución anterior de la sesión), más banderas rojas. Es un fallo de **disciplina**, así que la forma correcta es prohibición + banderas (§2.A/A3) | ✅ rama `feat/superpowers-v6-2` |
| **`writing-good-tests`** | «Cada test nombra la rotura que atrapa» + «cada test ejercita lo real». **Comprobación de mutación**; aserciones espejo; **detectores de cambios**; «prueba tu frontera, no el framework»; **los mocks parciales fallan en silencio**; «las clases de producción solo llevan métodos de producción» | Absorbido como sección **«Tests honestos»** de `niveles-y-tipos-de-prueba` (que cubría *dónde* probar y no *si el test puede fallar*), + anti-patrones nuevos, + cableado en la dimensión de tests de `revisor-spec-tests` | ✅ rama `feat/superpowers-v6-2` |
| **`brainstorming`** | Hard gate antes de implementar; una pregunta por mensaje; **2-3 enfoques con trade-offs, empezando por el recomendado**; diseño por secciones con aprobación tras cada una; check de descomposición si son varios subsistemas; **auto-revisión de la spec** (marcadores, contradicciones, alcance, **ambigüedad**: ¿se lee de dos formas? elige una) | Adoptado lo que le faltaba a `/plan`: **2-3 enfoques con recomendación** (Fase 4) y **auto-revisión de la spec** (Fase 5, paso 0), con consistencia de nombres incluida. La aprobación sección a sección no: nuestro gate único sobre la spec completa ya cumple la función sin multiplicar interrupciones | 🟡 (enfoques y auto-revisión ✅; secciones ⛔) |
| **`writing-plans`** | Audiencia: «un junior entusiasta con mal gusto, sin juicio, sin contexto y con aversión a testear». **Bloque `Global Constraints`** con valores exactos que **vinculan implícitamente a toda tarea**. `Interfaces: Consumes/Produces` por tarea. «No Placeholders» como **fallos de plan**. Auto-revisión con **consistencia de tipos entre tareas** | Adoptado el bloque como **«Restricciones globales»** en `spec.md` (`/plan` Fase 4): es exactamente el hueco que teníamos, porque `/implement` trabaja criterio a criterio y una restricción escondida en la prosa de un criterio no alcanza a los demás. `Consumes/Produces` no aplica (no troceamos en tareas para subagentes) | 🟡 |
| **`finishing-a-development-branch`** | Menú de 3 opciones **literal**; **descartar solo si el usuario escribe la palabra `discard`**; limpieza **por procedencia** (solo worktrees bajo `.worktrees/`); confirmar la rama base; «corre la suite sobre el árbol que vas a integrar» | Nuestra Fase 4 de `/implement` es solo push+PR. Adoptado en el paso 7 de la Fase 4 de `/implement`: las tres opciones literales, con **dejarlo como está** por defecto, confirmación de la rama base y suite sobre el árbol que se va a integrar (no sobre el que quedó verde), y `discard` como palabra exacta — es el único punto del flujo donde una respuesta ambigua destruye trabajo | ✅ rama `feat/cierre-de-backlog` |
| `dispatching-parallel-agents` | Mayormente nuestro. Añade: «varias llamadas en una respuesta = paralelo; una por respuesta = secuencial», y verificar después («los agentes cometen errores sistemáticos») | Nuestro `/review` ya despacha en paralelo | 🟡 |

### 2.D — Infraestructura

| Patrón | Detalle | Aplicación | Estado |
|---|---|---|---|
| `<SUBAGENT-STOP>` en el bootstrap | Primera línea de la skill que inyecta el hook: «si te despacharon como subagente para una tarea concreta, ignora esta skill» | Protege a un subagente de heredar instrucciones de sesión que le harían abandonar su tarea. **Nuestro riesgo es menor por diseño**: nuestro hook inyecta *estado de la tarea*, no doctrina de flujo, y el `matcher` de `SessionStart` es `startup\|clear\|compact` —eventos de sesión, no de despacho—. Aun así **no está comprobado empíricamente** que el hook no alcance a nuestros revisores: **Comprobado, y no hace falta guarda**: el `matcher` del hook en `adapters/claude/hooks/hooks.json` es `startup|clear|compact`, y el despacho de un subagente no es ninguno de esos eventos, así que `SessionStart` no le alcanza. Se cierra por configuración, sin añadir una línea que no protegía de nada | ⛔ (riesgo inexistente, verificado) |
| Hook multi-harness por variable de entorno | Emite `additional_context` (Cursor) / `hookSpecificOutput.additionalContext` (Claude) / `additionalContext` (Copilot) detectando por env var, porque **«Claude Code lee AMBOS sin deduplicar»** → hay que emitir solo uno | Confirma nuestra fila ✅ de la primera pasada y aporta el porqué; relevante si algún día enviamos hooks a OpenCode | ✅ (validado) |
| El bootstrap inyecta la skill **entera** | No un puntero: el texto completo de su skill de entrada | ⛔ Nuestro hook inyecta **estado de la tarea**, no doctrina; la doctrina vive en los comandos. Coherente con «explícito, no ambiental» | ⛔ (consciente) |
| Prioridad de skills explícita | Skills de **proceso** primero (fijan el enfoque), luego las de implementación. Y: instrucciones de usuario > skills > comportamiento por defecto | Barato de añadir si algún día hay colisión entre guías | 🔜 (menor) |
| `.version-bump.json` declarativo | Lista fichero + campo a sincronizar (incluido el path JSON `plugins.0.version`) + `audit.exclude` | Nuestro `bump-version.mjs` lo hace imperativo y ya cubre los 3 manifiestos; la config declarativa sería más limpia, no más correcta | 🔜 (menor) |
| **Corpus de prompts adversariales** | `tests/explicit-skill-requests/prompts/`: `skip-formalities`, `i-know-what-sdd-means`, `claude-suggested-it`, `after-planning-flow`… + variantes en modelo pequeño y multi-turno | Espejo barato para `docs/eval-comportamiento.md`: convertir nuestra checklist manual en prompts guardados y reutilizables. **Maquinaria hecha**: `adapters/claude/evals/<caso>/prompt.md` es exactamente ese corpus, versionado y ejecutable. Lo que queda es poblarlo — un caso por fila de la checklist — y eso se hace calibrando, no diseñando | ✅ (maquinaria) rama `feat/eval-de-activacion` |
| `printf` en vez de heredoc en hooks bash | Cuelgue de heredoc en bash 5.3+ (su issue #571) | 📖 mina de portabilidad; nuestros hooks son `node` y no la pisan | 📖 |
| Telemetría (logo remoto con la versión) | Opt-out por env var; honra `DISABLE_TELEMETRY` | ⛔ Anti-objetivo nuestro, aunque la suya sea transparente y mínima | ⛔ |
| Visual companion (servidor HTTP zero-dep, WebSocket, endurecimiento de auth) | ~90 KB de skill + servidor + tests para mostrar mockups en el navegador durante el brainstorming | ⛔ Sobre-ingeniería: nuestro anti-objetivo literal | ⛔ |
| Infra de porting a 11 harnesses | `docs/porting-to-a-new-harness.md` (50 KB) + `sync-to-codex-plugin.sh` (15 KB) + manifiestos por harness | ⛔ Targeteamos 2 adaptadores; nuestro `sync.mjs` los cubre | ⛔ |

**Adoptado en esta iteración (rama `feat/superpowers-v6-2`):** las 14 `description` reescritas
como disparadores puros + su aseveración en CI · guía nueva `depuracion-sistematica` · guía
nueva `recepcion-de-revision` (con tope de 3 rondas, disyuntor y adjudicación escrita) ·
sección «Tests honestos» en `niveles-y-tipos-de-prueba` · tres reglas de independencia del
revisor en `revision-hallazgos` (afirmaciones ≠ hechos · `exigido-por-spec` · ⚠️ no verificable)
· gate de verificación con evidencia en `/implement` · 2-3 enfoques, «Restricciones globales» y
auto-revisión de spec en `/plan` · `revisor-convenciones` de haiku a sonnet.

**Consumido (✅):** el paquete de revisión por fichero de §2.B, que era el pendiente prioritario
y el mayor ahorro de contexto disponible. El diff dejó de viajar dentro de los prompts.

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
| Campo `license` en el frontmatter de la skill | Declara licencia a nivel de skill | Añadido `license: MIT` al frontmatter que genera `sync.mjs`: sin él, una skill extraída del plugin viaja sin licencia. Verificado con `claude plugin validate --strict` | ✅ rama `feat/cierre-de-backlog` |
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
| **[2] ISO/IEC/IEEE 29119** (partes 1–5) | Parte 4: técnicas + medida de cobertura; Parte 2: testing basado en riesgo; Parte 3: plantillas documentales | Parte 4 refuerza a ISTQB en `historias-usuario`; testing basado en riesgo → sección "Riesgos" de `/plan`; plantillas descartadas (spec.md esbelto, gestión en ClickUp). Riesgo adoptado en la Fase 4 de `/plan`: los EC se ordenan por probabilidad × impacto y se dice dónde va el esfuerzo, porque sin esa ordenación se reparte plano y acaba donde es cómodo de probar | ✅ (técnicas ✅ · riesgo ✅ · plantillas ⛔) |
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

## 7. Bibliografía de arquitectura — Fowler · Richards & Ford · microservices.io · MS Azure Architecture Center · DDD (Khononov) · eShop · domain-driven-hexagon · nodebestpractices · system-design-primer

**Qué es:** un cuerpo de conocimiento de **arquitectura de software** a nivel de módulo/sistema —un
piso por encima de los patrones GoF de §5—: catálogos de estilos y patrones (Martin Fowler; MS Azure
Architecture Center; microservices.io de Chris Richardson), criterios de decisión y análisis de
trade-offs (Richards & Ford: *Fundamentals of Software Architecture* y *The Hard Parts*), DDD
digerible (Khononov, *Learning DDD*) e implementaciones/repos de referencia (dotnet eShop;
Sairyss/domain-driven-hexagon en TS/NestJS; goldbergyoni/nodebestpractices; donnemartin/
system-design-primer).

**Relación con nosotros:** son **dos usos distintos que conviene separar** para no caer en
sobre-ingeniería (imán mayor que el de los patrones GoF). (a) **Conocimiento a la altitud del
plugin** → una futura guía `arquitectura` crítica-first, por encima de `patrones-diseno`, para las
dos únicas preguntas que el plugin hace sobre repos que **ya existen**: en `/plan`, «¿dónde debe
vivir este código y está justificada la abstracción?»; en `/review`, «¿el cambio respeta la
arquitectura / el bounded context existente?». (b) **El habilitador de la visión larga** → un
refactor de **perfiles de stack** que desacople los 6 defaults de Next.js hoy presentes en `core/`
(medidos: `explorador-repo`, `plan`, `review`, `revisor-bugs-seguridad`, `niveles-y-tipos-de-prueba`,
`implement`) para servir también a backends NestJS/DDD. El espinazo del workflow (spec → plan → TDD →
review → gates → continuidad) **no tiene dependencia estructural de Next.js**, así que ampliar es
*parametrizar*, no reescribir. El diseño greenfield («diséñame un sistema») queda **fuera**: subiría
de altitud y rompería «empezar pequeño».

| Fuente | Qué aporta | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **martinfowler.com** | Monolito modular, «microservices premium / you must be this tall», StranglerFig, PoEAA, cuándo NO distribuir | Fuente canónica y **aliada crítica-first** de la futura guía `arquitectura` | 🔜 fuente primaria |
| **Richards & Ford** (*Fundamentals* + *The Hard Parts*) | Catálogo de estilos (layered, microkernel, event-driven, service-based, microservicios) + **criterios de decisión y análisis de trade-offs** | El esqueleto «cómo elegir» de la guía; encaja con el ADN anti-especulativo del plugin | 🔜 fuente primaria |
| **microservices.io** (Chris Richardson) | Saga, API Gateway, Database per Service, CQRS, Event Sourcing con problema/solución/trade-offs | Solo los **criterios** y el framing «distribuye si debes»; el catálogo de patrones distribuidos es imán de sobre-ingeniería | 🟡 (criterios sí; patrones bajo demanda) |
| **MS Azure Architecture Center** | Catálogo extenso de patrones agnósticos con diagramas y ejemplos | Cherry-pick de descripciones agnósticas; **NADA de especificidades Azure**; demasiado vasto para adoptar entero | 📖 referencia |
| **Learning DDD** (Vlad Khononov) | DDD digerible: bounded contexts, agregados, estratégico vs táctico | Sub-parte DDD de la guía; enriquece `historias-usuario` y `/plan` cuando el target es DDD por capas | 🔜 |
| **Sairyss/domain-driven-hexagon** | DDD + hexagonal + clean architecture en **TS/NestJS**, línea por línea | El **mejor modelo concreto** para el futuro perfil de stack NestJS; hoy, referencia | 📖 (clave para el perfil NestJS) |
| **dotnet-architecture/eShop** | Implementación de referencia de microservicios + DDD + CQRS | Estudiar, no incrustar (como Juice Shop en §6) | 📖 referencia |
| **goldbergyoni/nodebestpractices** | Prácticas Node + sección de arquitectura | Fuente de *defaults* Node/NestJS para el futuro perfil de stack; algo puede rozar `codigo-limpio` | 🟡 / 📖 |
| **donnemartin/system-design-primer** | Diseño de sistemas a gran escala (casos tipo entrevista: Twitter, acortador de URLs) | Fuera de la altitud del plugin (greenfield/escala, no a nivel de tarea sobre repo existente) | ⛔ fuera de alcance / 📖 |

**Encaje inmediato (✅ rama `feat/bibliografia-testing`):** guía `arquitectura` **crítica-first**
—monolito modular primero; layered / hexagonal / DDD / event-driven / microservicios con «cuándo sí /
cuándo no» y criterios de decisión, en dos modos (recomendar / elegir) y dos situaciones (conformar el
repo existente / elegir el arranque de uno nuevo)— cableada en el «Enfoque técnico» de `/plan` y en la
dimensión 4 de `/review`, un piso por encima de `patrones-diseno` y con su misma disciplina (una
frontera o estilo se justifica ante un problema real, no «por si escala»). Fuentes: Fowler +
Richards&Ford + microservices.io (solo criterios) + Khononov. Sirve incluso a los usuarios Next.js de
hoy (una app Next también decide dónde vive el dominio y sus fronteras de módulo).
**Visión larga (🔜, iniciativa aparte):** refactor de **perfiles de stack** (parametrizar los 6
defaults de Next.js; añadir un perfil NestJS/DDD modelado con Sairyss + nodebestpractices + eShop como
referencia). Emprender **cuando exista un target NestJS real** (p. ej. el marketplace), no de forma
especulativa.
**Referencia (📖):** MS Azure Center (sin especificidades Azure), eShop, domain-driven-hexagon,
nodebestpractices — citadas como fuente, no incrustadas.
**Descartado / fuera de alcance (⛔):** generadores de scaffolding, «modo microservicios», codegen de
Saga/Event-Sourcing y convertir el plugin en asesor de diseño de sistemas (subir de altitud);
system-design-primer por altitud (greenfield/escala, no a nivel de tarea).

---

## 8. ISO/IEC 25010 (calidad de producto) + listas de chequeo de laboratorio (seguridad y usabilidad)

**Qué es:** el **modelo de calidad de producto** de la familia SQuaRE (ISO 25000): 9
características en la edición 2023 (adecuación funcional, eficiencia de desempeño,
compatibilidad, capacidad de interacción, fiabilidad, seguridad, mantenibilidad, flexibilidad,
protección frente a riesgos) con subcaracterísticas — el vocabulario estándar para especificar
y evaluar calidad. Más dos **listas de chequeo de laboratorio de pruebas (UCI)**: una de
seguridad (23 checks binarios de confidencialidad/integridad/autenticidad, muy centrada en
sesión y autenticación) y una de usabilidad (heurísticas de Nielsen aplicadas a portal web).

**Relación con nosotros:** la norma da lo que el plugin no tenía — una **taxonomía compartida**
que revela huecos de cobertura (faltaban capacidad de interacción y eficiencia de desempeño) y
etiqueta hallazgos y NFRs con lenguaje estándar, al lado de ISTQB/29119 (§6) y OWASP. Las
listas NO se adoptan tal cual (formato binario Sí/No incompatible con la disciplina de
confianza 0-100; ítems visuales no verificables desde un diff; puntos desactualizados como
contraseñas de 6 caracteres): se **destilan** — la de seguridad a casos concretos de
sesión/auth en A01/A05/A07, la de usabilidad al subconjunto verificable en código de la nueva
guía.

**Encaje (✅):** guía `calidad-producto` (taxonomía + mapeo dimensión↔característica + NFRs con
criterio verificable en `/plan`, anti-inventario); guía `usabilidad-accesibilidad` (Nielsen +
WCAG 2.2 destiladas a lo revisable en código) + dimensión 6 de `/review` con
`revisor-usabilidad-accesibilidad` (sonnet, solo si el diff toca UI); checks de sesión/auth
destilados y modernizados en `revisor-bugs-seguridad` (logout sin invalidar en servidor,
mensajes de login reveladores, admin que borra su propia cuenta, política de contraseñas).
**Descartado por el filtro:** adoptar las listas como checklist literal; evaluar estética/
contraste desde el diff (se nombra como evaluación manual/E2E); ISO 25040 (proceso de
evaluación formal — burocracia de laboratorio, no de plugin); "protección frente a riesgos"
(safety) salvo dominio que lo exija.

---

## 9. mattpocock/skills — la familia `grill` y la arquitectura de una librería de skills

**Qué es:** la librería de skills personal de Matt Pocock («Skills for Real Engineers.
Straight from my .agents directory», MIT), publicada como plugin en el marketplace oficial de
Claude Code y también instalable con `npx skills add`. 22 skills promocionadas, organizadas en
*buckets* con un ciclo de vida explícito. La entrada que motivó el análisis, `grill-me`, vive en
`skills/productivity/grill-me` (la URL `/tree/main/grill-me` da 404: no está en la raíz).

**Relación con nosotros:** es el contraste más útil de todo este documento, por dos motivos.

1. **Es una crítica directa a nuestra categoría.** Su README lo dice sin rodeos: *«GSD, BMAD y
   Spec-Kit intentan ayudar apropiándose del proceso. Al hacerlo, te quitan el control y hacen
   que los bugs del proceso sean difíciles de resolver. Estas skills son pequeñas, fáciles de
   adaptar y componibles»*. Nosotros **sí** nos apropiamos del proceso (4 comandos, un ciclo
   fijo). No es un patrón a copiar sino un espejo: nuestra respuesta a esa crítica es que el
   proceso está *anclado a ClickUp y a `spec.md`*, que es justo lo que un equipo necesita
   compartir; pero conviene tenerla escrita, porque el coste que él señala (bugs del proceso
   difíciles de resolver) es real y lo pagamos cada vez que un comando se comporta mal.
2. **Es una librería de skills, como nosotros.** Superpowers (§2) es una metodología; esto es
   una *biblioteca* con convenciones de mantenimiento. Ahí es donde más nos aporta.

### 9.A — La familia `grill`: la técnica de entrevista

Cuatro artefactos para una sola técnica, y la separación entre ellos es el patrón.

| Patrón | Qué dice | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Una pregunta cada vez, y esperar** | *«Hacer varias preguntas a la vez es desconcertante»*. La entrevista converge porque cada respuesta reordena las siguientes | Nuestro `/plan` dice «itera con el usuario hasta que apruebe», sin decir **cómo**. Adoptado como disciplina de diálogo en la Fase 4 | ✅ rama `feat/superpowers-v6-2` |
| **Cada pregunta lleva la respuesta que TÚ recomiendas** | *«reaccionas a una propuesta, no te quedas mirando un prompt en blanco»* | Adoptado. Encaja con los «2-3 enfoques con recomendación» que ya añadimos: mismo principio, aplicado pregunta a pregunta | ✅ rama `feat/superpowers-v6-2` |
| **Hechos vs decisiones** | *«Si un HECHO se puede encontrar explorando el entorno, búscalo en vez de preguntármelo. Las DECISIONES, en cambio, son mías»*. Regla nítida y muy barata de aplicar | La adopción más valiosa de este repo. Nos faltaba: `/plan` explora y luego propone, pero nada impedía preguntar al usuario algo que estaba en el `package.json` | ✅ rama `feat/superpowers-v6-2` |
| **Árbol de decisiones en orden de dependencia** | Una decisión padre se resuelve antes que las que cuelgan de ella; el objetivo no es acordar rápido sino **hacer explícita toda decisión implícita** | Adoptado en la Fase 4 de `/plan` | ✅ rama `feat/superpowers-v6-2` |
| **No actuar hasta que el usuario confirme el entendimiento compartido** | Gate explícito al final de la entrevista | Ya lo teníamos (gate de aprobación antes de escribir `spec.md`). Convergencia | ✅ (validado) |
| **Primitiva + envoltorios** | `grilling` es la **primitiva** model-invoked que contiene la técnica (fuente única). `grill-me` y `grill-with-docs` son envoltorios user-invoked cuyo cuerpo ENTERO es una línea: «Run a `/grilling` session». Cero duplicación | **Convergencia con nuestra arquitectura**: nuestras guías son las primitivas y los workflows las invocan vía `{{guide:x}}`. Valida el diseño de `core/` | ✅ (validado) |
| **Hermanos stateless / stateful** | La misma entrevista en dos versiones: `grill-me` no escribe nada; `grill-with-docs` deja ADRs y glosario. La diferencia entre skills es **dónde van las respuestas**, no la técnica | Interesante como eje de diseño. En nuestro flujo el equivalente ya existe (`/plan` escribe `spec.md`) | 📖 |
| **`batch-grill-me`: el algoritmo de la frontera** (in-progress) | La **frontera** es el conjunto de decisiones cuyos prerequisitos ya están resueltos: se pregunta la frontera entera en una ronda numerada y se recalcula. Y: *«encontrar hechos es tu trabajo, nunca el del usuario: despacha un subagente. No te bloquees — una exploración en marcha es un prerequisito sin resolver, así que solo esperan las preguntas que dependen de ella»* | Elegante, y en tensión directa con «una pregunta cada vez». Él mantiene ambas y la segunda está en `in-progress/` — o sea, sin resolver | 📖 (tensión no resuelta ni por él) |
| **ADRs con moderación** | Se ofrecen *solo* si la decisión es difícil de revertir, sorprendente sin contexto, y fruto de un trade-off real. *«La mayoría de sesiones producen un glosario más afilado y pocos o ningún ADR, y esa es la forma buscada»* | Misma disciplina anti-inventario que nuestro «sin fuerza real, no se marca» de `calidad-producto`. Convergencia | ✅ (validado) |
| **Glosario `CONTEXT.md`** | Vocabulario puro (sin implementación, sin spec), escrito **en el momento en que cada término se resuelve**, no al final. Con lista `_Avoid_:` de sinónimos rechazados y sección de «ambigüedades señaladas» con su resolución | Lenguaje ubicuo de DDD hecho operativo. Roza nuestra `historias-usuario` pero no lo cubre. Candidato real, no trivial | 🔜 |

### 9.B — Arquitectura de la librería

| Patrón | Qué dice | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **`claude plugin validate . --strict`** | Validación oficial de manifiestos **y frontmatter** con la CLI de Claude Code, en CI | 🔴 **Nos destapó un fallo grave y silencioso** — ver 9.C. Adoptado como workflow `manifest-check.yml` | ✅ rama `feat/superpowers-v6-2` |
| **El eje user-invoked vs model-invoked, documentado** | User-invoked: `disable-model-invocation: true` + `policy.allow_implicit_invocation: false`, y la `description` es **para humanos** (fuera las frases-disparador). Model-invoked: `description` **para el modelo**, con disparadores ricos. Test: *«¿podría el modelo alcanzar esto por su cuenta con provecho?»* — y *«la reutilización es la razón para extraer una skill, no el test»* | **Valida y afina lo que hicimos en §2.A**: nuestras 14 guías son model-invoked, así que su `description` debe ser disparador (correcto); nuestros 4 comandos son user-invoked, así que la suya debe ser resumen humano (también correcto). Los dos registros distintos ahora tienen nombre y motivo | ✅ (validado) |
| **`SKILL.md` es el prompt; `docs/<skill>.md` es la documentación** | Separación dura: el `SKILL.md` de `grill-me` son **147 bytes**; su página de docs, 3 KB de prosa para humanos, publicada en aihero.dev. *«La página no es la skill ni una copia del SKILL.md»* | ⛔ **No aplicable tal cual**: sus páginas son superficie de producto (web pública) y las nuestras no existirían. Pero el principio —*no metas en el prompt prosa que solo sirve para que un humano decida*— sí es auditable en nuestras guías más largas | 🔜 (auditar) |
| **Buckets con ciclo de vida** | `engineering/` y `productivity/` = **promocionados** (obligatorio: entrada en README y en `plugin.json`); `misc/`, `personal/`, `in-progress/`, `deprecated/` = no se publican. Un borrador vive en `in-progress/` (ahí está `batch-grill-me`) y lo retirado en `deprecated/` | No tenemos dónde poner un borrador ni una guía retirada: las 14 se publican todas. Con 14 el coste de la maquinaria de buckets no compensa, pero **`in-progress/` sí** tendría valor | 🔜 (solo `in-progress/`) |
| **Dependencias por invocación en prosa, no por ruta** | *«Run the `/grilling` skill»*, nunca `../otra-skill/FICHERO.md`. El material compartido vive dentro de la skill que lo posee | Nuestro `{{guide:x}}` genera exactamente eso (nombre + ruta como referencia textual, sin forzar carga). Convergencia con §2.A/A7 | ✅ (validado) |
| **Invariante del router** | `ask-matt` mapea todas las skills alcanzables, con la regla escrita: *«una skill nueva que nunca menciona, o una obsoleta a la que sigue enrutando, es un router que miente»* | Con 4 comandos no necesitamos router; el hook `SessionStart` ya sugiere el próximo paso. Nos quedamos con **la forma de la regla**: atar el mantenimiento de un artefacto a un invariante enunciado | 📖 |
| **`AGENTS.md` == `CLAUDE.md`, byte a byte** | Mismo contenido, dos nombres, para dos harnesses | Nosotros generamos por adaptador con `sync.mjs`; su solución es más barata pero solo funciona si el contenido es idéntico | ⛔ (nuestro caso difiere por adaptador) |
| **`agents/openai.yaml` como sidecar** | Metadatos por harness junto a la skill, como **datos** (nombre para el selector, política de invocación), no como copia generada de la skill | Alternativa ligera a generar N copias. Nuestro `sync.mjs` genera copias porque el **cuerpo** cambia (rutas de referencia), no solo los metadatos | ⛔ (consciente) |
| **Dos filosofías de instalación, enunciadas** | Plugin = paquete gestionado de solo lectura al que te *suscribes*; `npx skills add` = copia ficheros editables que pasan a ser tuyos. *«Elige una — instalar ambas te deja cada skill por duplicado»* | Nosotros solo ofrecemos la primera en Claude y solo la segunda en OpenCode (copiar `.opencode/`). Nombrar el trade-off en el README aclararía la diferencia | 🔜 (menor) |
| **Changesets** (`.changeset/*.md`: bump semver + motivo legible) | El *por qué* del cambio se escribe en el momento de hacerlo, no al publicar | Nuestro `bump-version.mjs` + CHANGELOG cubren la función. Su ventaja es el motivo escrito en caliente | ⛔ (cubierto) |
| **`scripts/link-skills.sh`** | Symlinks de cada skill a `~/.claude/skills` y `~/.agents/skills` para desarrollar: un `git pull` actualiza lo instalado | Cómodo para iterar sin reinstalar el plugin. Aplicable a nuestro desarrollo local | 🔜 (menor) |

### 9.C — El fallo que destapó `claude plugin validate --strict`

Adoptar su convención de validación tuvo un retorno inmediato: **el frontmatter de nuestras
skills no parseaba como YAML**, y el error es del tipo peor —silencioso—.

La causa: `sync.mjs` emitía `description: <texto>` como **escalar YAML plano**, y un escalar
plano no puede contener «: ». Nuestras descripciones lo llevan de forma natural («GoF: catálogo
de estilos…», y tras la reescritura de §2.A, «Síntomas: …»). El validador lo explica sin
ambigüedad: *«At runtime this skill loads with empty metadata (all frontmatter fields silently
dropped)»* — se pierden `name`, `description` y `user-invocable`, de modo que **la guía deja de
auto-activarse y nada lo indica**.

Alcance real, medido: **10 ficheros rotos en la v0.6.0 ya publicada** (verificado extrayendo el
HEAD commiteado y validándolo aparte) y 15 en la rama de trabajo. Es decir: **es un fallo
preexistente, no introducido por la iteración de §2** — aunque esa iteración lo empeoró al
añadir «Síntomas: » a descripciones que antes se libraban. La ironía es que el trabajo de §2.A
consistió precisamente en afinar unas descripciones que el harness estaba descartando enteras.

**Arreglo:** helper `yamlString()` en `sync.mjs` que entrecomilla y escapa todo escalar de
`description` y `argument-hint` (7 puntos de emisión + el agente primario de OpenCode). Blindado
por partida doble: `check-behavior.mjs` asevera que la `description` va entrecomillada, y el
workflow nuevo `manifest-check.yml` ejecuta `claude plugin validate --strict` sobre el plugin y
sobre el marketplace en cada push y PR.

**Lección de método:** teníamos tres capas de CI (drift, versión, comportamiento) y ninguna
comprobaba que el artefacto fuese **cargable**. Cuando existe un validador oficial del formato
que publicas, ejecutarlo en CI no es opcional.

**Adoptado en esta iteración:** `claude plugin validate --strict` en CI (`manifest-check.yml`) ·
arreglo del frontmatter no parseable + aserción que lo blinda · disciplina de entrevista en la
Fase 4 de `/plan` (una pregunta cada vez, con respuesta recomendada, en orden de dependencia) ·
**regla hechos-vs-decisiones** · `description` del marketplace.
**Pendiente (🔜):** glosario `CONTEXT.md` de lenguaje ubicuo · bucket `in-progress/` · auditar
prosa de guía que solo sirve a humanos · `link-skills` para desarrollo local.
**Descartado (⛔):** buckets completos y router (no compensan con 4 comandos + 14 guías) ·
`AGENTS.md` idéntico y sidecar `openai.yaml` (nuestros adaptadores difieren en el cuerpo, no
solo en metadatos) · changesets (cubierto por `bump-version.mjs` + CHANGELOG).

---

## 10. obra/superpowers-skills — skills de *pensamiento* (la familia `problem-solving`)

**Qué es:** el repo hermano de superpowers (§2), con las skills que **no** entran en el plugin:
`problem-solving/` (simplification-cascades, collision-zone-thinking, inversion-exercise,
meta-pattern-recognition, scale-game, when-stuck), `architecture/preserving-productive-tensions`
y `research/tracing-knowledge-lineages`. Llegamos aquí siguiendo `simplification-cascades`: el
enlace de partida (mcpmarket) devolvía 429 de forma persistente, así que fuimos a la fuente
canónica en vez de citar un agregador.

**Relación con nosotros:** es una **categoría que no tenemos**. Nuestras 14 guías son de proceso
(cómo trabajar) o de referencia (qué es qué); estas son **técnicas de pensamiento** — qué hacer
con la cabeza cuando estás atascado. Y vienen con un despachador por síntoma (`when-stuck`), que
es la pieza estructuralmente interesante.

| Patrón | Qué dice | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Cascada de simplificación** | «A veces una idea elimina 10 cosas». Busca el principio unificador que hace innecesarios varios componentes: *«todas las entradas son flujos, solo cambia el origen»* → 4 implementaciones eliminadas. Se mide en **cuántas cosas puedes borrar** | Adoptada como sección de `codigo-limpio`: nuestro refactor va olor a olor y se le escapa el refactor de 10x. **Con su límite explícito**, que es lo que la hace compatible con nuestro filtro: una cascada es legítima porque la duplicación **ya existe** y la abstracción la **elimina**; si no borra código, es _Generalidad especulativa_ y manda `patrones-diseno` | ✅ rama `feat/superpowers-v6-2` |
| **Preservar tensiones productivas** | Algunas disyuntivas no son problemas a resolver sino **información a conservar**: cuando ambas opciones optimizan prioridades legítimas distintas y la mejor depende del contexto de despliegue, forzar una elección destruye flexibilidad. Se fuerza solo si es puerta de un solo sentido o si mantener ambas cuesta más | Adoptada en «Decisiones tomadas» de `/plan`: hasta ahora esa sección solo admitía decisiones cerradas y alternativas descartadas, lo que empuja a inventar un ganador para dejarla limpia | ✅ rama `feat/superpowers-v6-2` |
| **`when-stuck`: despachador por síntoma** | Un índice que mapea *tipo de atasco* → técnica («complejidad en espiral» → cascadas; «forzado por supuestos» → inversión; «código roto» → depuración sistemática) | Patrón de routing atractivo, pero sin las 5 técnicas a las que despachar no tiene a dónde enrutar. Nuestras `description` ya llevan «Síntomas:», que cumple la misma función de forma distribuida | 📖 (revisable si algún día crecen las guías de técnica) |
| **Juego de escalas** | Probar a 1000× más y 1000× menos para exponer lo que a escala normal está oculto (volumen, velocidad, usuarios, duración, tasa de fallo) | Adoptado en la guía `rendimiento` (§14) como la forma de **derivar** el volumen de un criterio en vez de inventarlo: el salto de escala expone el listado sin paginar y la consulta sin índice. Sigue siendo aplicable a los valores límite de `historias-usuario` | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **Inversión, colisión de dominios, meta-patrones** | Invertir supuestos («¿y si lo contrario fuera cierto?»), forzar metáforas entre dominios lejanos, y buscar el patrón que aparece en 3+ dominios | Técnicas de creatividad genéricas, no atadas a nuestro flujo. Añadirlas serían 3 guías nuevas de ideación: choca con «empezar pequeño» y con el ADN anti-especulativo del plugin | ⛔ (fuera de alcance) |
| **Divergencia de convenciones en el mismo autor** | Este repo usa `name: Simplification Cascades` (mayúsculas y espacios), un campo no estándar `when_to_use:` y `version:`; el plugin `superpowers` usa `name: writing-skills` + `description: Use when…`. Dos convenciones distintas del mismo autor | **Verificado, y corrige una hipótesis nuestra:** montamos un plugin de prueba con esa skill tal cual y `claude plugin validate --strict` **la acepta** — el validador NO exige la convención de `name` que la propia guía `writing-skills` dicta (solo letras, números y guiones), ni rechaza campos extra. Conclusión operativa: el validador cubre validez YAML y metadatos del manifiesto; **las convenciones las tiene que aseverar nuestro `check-behavior.mjs`**, no él | ✅ (validado) |

**Nota metodológica:** el control negativo de esa comprobación reprodujo, sobre un fichero de
terceros, exactamente el fallo de §9.C — al meterle un «: » sin comillas en la `description`,
el validador devuelve el mismo *«loads with empty metadata»*. Confirma el diagnóstico de forma
independiente de nuestro código.

---

## 11. skillsmp.com y mcpmarket.com — el ecosistema de agregadores

**Qué son:** directorios que **indexan ficheros `SKILL.md` de GitHub** y los presentan como un
marketplace navegable. skillsmp.com dice agregar «2.000.000+ skills open source» para Claude
Code, Codex CLI y ChatGPT, con API REST gratuita (50 peticiones/día anónimas), servidor MCP y
OpenAPI. mcpmarket.com hace lo propio con una ficha por skill.

**Relación con nosotros:** no aportan patrones de prompt — aportan una respuesta a *«¿se nos
encontraría ahí?»*. Los sondeamos con su propia API en vez de fiarnos del marketing.

| Hallazgo (medido con su API) | Qué implica |
|---|---|
| **No estamos indexados.** `q=custom-ia-plugin` → 0 resultados, `totalIsExact: true` | Publicar en el marketplace de Claude Code no implica aparecer en estos agregadores; indexan repos de GitHub por su cuenta |
| **El filtro de idioma no funciona.** `contentLanguage=es` devuelve skills con `lang: en` y `lang: ja` | Nuestro plugin está **íntegramente en español**. Aunque estuviéramos indexados, el eje por el que se nos podría encontrar está roto |
| **Ordena por estrellas del REPO, no por relevancia de la skill.** `q=clickup` devuelve arriba `handsontable/pr-creation` (que solo menciona ClickUp de pasada, ★22k) por encima de `civitai/clickup` (★7k), que es la skill de ClickUp | Una skill específica en un repo pequeño queda enterrada bajo cualquier skill de un mega-repo. Como canal de descubrimiento para un plugin de nicho, es malo |
| **Coincidencia difusa muy laxa y resultados duplicados.** `q=biomas` → «clinical-decision-support», «metabolomics»; `q=leiniercy` → una skill alemana sobre *leniency*; `civitai/clickup` aparece dos veces en la misma página | La precisión es baja; el `total` viene con `totalIsExact: false` y devuelve 5 para casi cualquier consulta, así que el «2M+» no es verificable por la API |
| **mcpmarket.com: 429 persistente** | No se pudo leer la ficha. Para estudiar una skill, ir **a la fuente** (el repo) y no al agregador: es más fiable y más completo |

**Conclusión (⛔ sin cambios de código):** los agregadores son un canal de **distribución**, no
una fuente de patrones, y hoy es un canal pobre para nosotros. La decisión de fondo —el plugin
está en español, lo que es coherente con su equipo y con ClickUp en español, pero lo hace
invisible en un ecosistema que indexa y ordena en inglés— es una decisión de producto, no
técnica: queda **anotada, no resuelta**. Si algún día se buscara alcance, la palanca no es
traducir las guías (romperíamos el registro que ya funciona) sino publicar un README y unos
metadatos en inglés apuntando al repo.

---

## 12. Espacios de trabajo aislados (worktrees) — `obra/superpowers` · `Significant-Gravitas/AutoGPT`

**Qué es:** dos tratamientos del mismo problema, encontrados buscando «git worktree» en el
agregador de §11 y leídos en su fuente. `obra/superpowers`
(`using-git-worktrees`) es la versión **defensiva**: detección, precedencias y trampas.
`Significant-Gravitas/AutoGPT` (`.claude/skills/worktree` y `setup-repo`) es la versión
**operativa** de un repo grande real: aprovisionar el espacio para que el proyecto arranque.

**Relación con nosotros:** hueco real. Nuestro `/start` crea una rama y nada más, así que
empezar una tarea obliga al usuario a abandonar lo que tenga abierto. El plugin hermano de RSD
ya tiene un `worktree-create`, señal de que la necesidad existe en el equipo.

| Patrón | Qué dice | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Detectar el aislamiento previo, con guarda de submódulo** | `GIT_DIR != GIT_COMMON` significa «worktree enlazado»… **o submódulo**: la comprobación no los distingue, y hay que descartar el segundo con `git rev-parse --show-superproject-working-tree`. Si ya estás aislado, **no crees otro** | Adoptado como paso 0 de la guía nueva. Es la trampa de corrección del patrón: sin la guarda, cualquier lógica de worktree se equivoca dentro de un submódulo | ✅ rama `feat/superpowers-v6-2` |
| **La herramienta nativa del entorno gana a `git worktree add`** | «Es el error nº 1: crea estado fantasma que el harness no ve ni sabe gestionar». Claude Code tiene la suya | Adoptado, con la degradación explícita al fallback de git | ✅ rama `feat/superpowers-v6-2` |
| **Verificar que el directorio está ignorado ANTES de crear** | `git check-ignore`; si no lo está, se añade al `.gitignore` y se commitea. Un directorio de worktrees sin ignorar mete el árbol entero del segundo checkout en el repo | Adoptado como verificación obligatoria | ✅ rama `feat/superpowers-v6-2` |
| **Aprovisionar el espacio** (AutoGPT) | Un worktree trae solo lo versionado: hay que copiar `.env` y variantes (con `.env.default` de respaldo), instalar dependencias y ejecutar el paso de generación. Y **liberar/cambiar puertos**, porque chocan con el checkout principal | Adoptado, generalizado por manifiesto en vez de fijado a su stack. Nuestro caso añade `.mcp.json` | ✅ rama `feat/superpowers-v6-2` |
| **Idempotencia explícita** (AutoGPT) | Cada paso comprueba si la rama o el directorio ya existen y **se lo salta informando**, en vez de fallar | Adoptado: encaja con nuestra Fase 3 de `/start` («detección de trabajo previo, no recrear») | ✅ rama `feat/superpowers-v6-2` |
| **Línea base en verde antes de tocar nada** | Ejecutar la suite al crear el espacio: si arranca en rojo, cualquier fallo posterior es ambiguo | Adoptado, con el gate humano («repórtalo y pregunta si continuar») | ✅ rama `feat/superpowers-v6-2` |
| **Limpieza por procedencia** | Retirar solo lo creado por uno mismo y bajo `.worktrees/`; el resto es del entorno del usuario | Adoptado. Cierra parte del 🔜 de `finishing-a-development-branch` (§2.C) | ✅ rama `feat/superpowers-v6-2` |
| **Piscina pre-aprovisionada** (AutoGPT `setup-repo`) | Crear de golpe N ramas numeradas `branch1..branchN` **más un worktree `reviews` dedicado** a revisar PRs sin abandonar lo que implementas | ⛔ Su modelo asume trabajo paralelo masivo con flota de agentes. El nuestro es una tarea de ClickUp cada vez. **El worktree `reviews`** sí es una idea que encaja con nuestro `/review` de solo lectura | ⛔ (piscina) · 🔜 (worktree de revisión) |

### 13. QA exploratoria — `NousResearch/hermes-agent` (`dogfood`) · `openclaw` (`auto-qa`)

**Qué es:** `dogfood` es una skill de **QA exploratoria de aplicaciones web**: recorrer el
producto real con automatización de navegador, capturar evidencia y emitir un informe
clasificado. `auto-qa` es una campaña de QA autónoma a gran escala (diez «carriles» de subsistema
en paralelo, objetivo de 100 arreglos de causa raíz verificados y fusionados) — enorme y muy
atada a su repo, pero con principios transferibles.

**Relación con nosotros:** el hueco más claro de nuestras guías de prueba. `historias-usuario`
diseña casos a partir del criterio y `niveles-y-tipos-de-prueba` decide dónde automatizarlos:
ambas cubren **lo que se anticipó**. No teníamos nada para **lo que solo aparece ejecutando el
producto** — y, en concreto, `/review` declaraba «evaluación manual» lo estético/visual **sin
decir cómo se hace**, que es una forma elegante de no hacerlo nunca.

| Patrón | Qué dice | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Las cinco fases** (`dogfood`) | planificar el recorrido → explorar → recoger evidencia → clasificar y deduplicar → informar | Esqueleto de la guía nueva `qa-exploratoria` | ✅ rama `feat/superpowers-v6-2` |
| **La consola es la mina de oro** | Revisarla tras **cada** navegación y **cada** interacción significativa: «los errores silenciosos de JavaScript están entre los hallazgos de más valor» | Adoptado literalmente: es lo que no se ve mirando la pantalla | ✅ rama `feat/superpowers-v6-2` |
| **Evidencia en el momento** | Por hallazgo: URL, pasos de reproducción, esperado vs real, errores de consola y captura | Adoptado, con la regla que lo cierra: **un hallazgo sin pasos de reproducción no es un hallazgo, es una impresión** | ✅ rama `feat/superpowers-v6-2` |
| **Taxonomía de severidad** | Crítico/Alto/Medio/Bajo con ejemplos concretos de web (pantalla en blanco, botón que no hace nada, imágenes rotas, erratas) | Adoptada **mapeada a la escala que ya teníamos** en `revision-hallazgos` y etiquetada con ISO 25010, en vez de introducir una escala paralela | ✅ rama `feat/superpowers-v6-2` |
| **Deduplicar por invariante roto, no por síntoma** (`auto-qa`) | «Cuenta invariantes rotos, no PRs, síntomas ni parches»: un defecto que aflora en cuatro sitios es **uno** | Adoptado en `qa-exploratoria` **y elevado a `revision-hallazgos`** (paso 4), donde deduplicábamos por `fichero:línea`. Contar síntomas hace que se parchee cada aparición y la causa siga viva | ✅ rama `feat/superpowers-v6-2` |
| **Declarar lo NO probado** | El informe incluye qué se probó, qué no y qué quedó bloqueado | Adoptado: «un informe que calla su alcance se lee como completo». Es el mismo principio que el «sin descartes silenciosos» de §2.B | ✅ rama `feat/superpowers-v6-2` |
| **Estados que nadie mira** | Vacío, error, 404, sin permisos; y entradas hostiles: textos larguísimos, caracteres especiales, doble clic rápido, recargar a mitad de flujo | Adoptado; complementa las técnicas de caja negra de `historias-usuario`, que cubren el dominio del dato pero no el estado de la pantalla | ✅ rama `feat/superpowers-v6-2` |
| **«Un test que pasa es evidencia solo para su head exacto»** (`auto-qa`) | La prueba vale para el commit en que se ejecutó, no para la rama | Refuerza el gate de verificación de §2.C («ejecuta la suite AHORA»). El matiz del commit queda anotado | 🟡 |
| **No revelar el diagnóstico propuesto al verificador independiente** (`auto-qa`) | Quien verifica no debe recibir la hipótesis de quien encontró el fallo | Nuestro `verificador-hallazgos` necesita el hallazgo para poder refutarlo, así que no aplica igual; el matiz útil —pasarle la **observación**, no el razonamiento sobre la causa— es menor | 📖 |
| **Campaña autónoma de 10 carriles y 100 arreglos** (`auto-qa`) | Flota de trabajadores, ledger numerado, fusión autónoma condicionada | ⛔ Otra liga y otro modelo: fusión autónoma choca de frente con nuestros gates humanos, y la maquinaria de flota con «empezar pequeño» | ⛔ |

**Adoptado en esta iteración:** guía `espacio-de-trabajo-aislado` (rama
`feat/guia-espacio-de-trabajo-aislado`: opción de worktree en `/start`, degradando a rama normal)
· guía `qa-exploratoria` (rama `feat/guia-qa-exploratoria`: cableada en `/implement` antes de la
PR y en la dimensión 6 de `/review` como destino de lo que no se juzga desde el diff) ·
deduplicación por causa en `revision-hallazgos` (esta rama transversal).
**Consumido (✅):** worktree dedicado a revisión (§12) — cableado en la Fase 1 de `/review`: si hay que revisar otra rama y el árbol del usuario tiene cambios sin commitear, se ofrece worktree en vez de cambiarle la rama bajo los pies.
**Descartado (⛔):** piscina de N worktrees pre-aprovisionados y campaña autónoma con fusión sin
gate humano.

---

## 14. Frontera pública y cambios irreversibles — schema.org · Google Search Central · Fowler (ParallelChange, TolerantReader) · Sadalage & Ambler · OWASP A09

**Qué es:** no es un repo, sino el cuerpo de práctica que cubre **lo que una tarea rompe sin
que ningún criterio de aceptación lo mencione**. Son cuatro frentes con la misma firma —nadie
los pide, todos se descubren tarde— y una fuente canónica cada uno: indexación y datos
estructurados (schema.org, directrices públicas de los buscadores), evolución de contratos
publicados (Fowler: *ParallelChange* / expandir-contraer, *TolerantReader*), refactorización de
bases de datos con datos vivos (Sadalage & Ambler, *Refactoring Databases: Evolutionary Database
Design*) y registro sin filtraciones (OWASP A09, ya citado en §6).

**Relación con nosotros:** cierra el hueco autodeclarado de §8 —«eficiencia de desempeño» era
la única característica de ISO 25010 que la tabla de `calidad-producto` nombraba sin guía
detrás— y añade el que faltaba en el otro extremo: **el flujo no tenía nada sobre migraciones**,
que son el único cambio que un `git revert` no deshace. El filtro es el de siempre: se adopta
el criterio, nunca la maquinaria (no generamos configuración de observabilidad, ni planes de
recuperación, ni estimaciones de coste de infraestructura — son artefactos de otro oficio, y
producirlos sin datos reales da un documento plausible y falso).

| Patrón | Qué aporta | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Rendimiento con dos filos** | «Medir antes de optimizar» **y** «hay defectos que se ven en el código y no necesitan medición»: el N+1 no es lento, es incorrecto por diseño | Guía nueva `rendimiento`, con la frontera explícita entre ambos: lista cerrada de lo reportable desde el diff, y todo lo demás exige medición. Cableada en la dim. 4 de `/review` y en `revisor-convenciones` | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **Criterio de rendimiento con cuatro piezas** | qué se mide · con qué volumen · en qué entorno · cuál es el límite. Sin las cuatro no se puede verificar ni fallar | En `/plan`, cuando se activa la característica de eficiencia. **Cierra el 🔜 del juego de escalas (§10)**: el «1000× más / 1000× menos» es justo cómo se deriva el volumen en vez de inventarlo | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **Expandir y contraer** (ParallelChange) | Durante el despliegue conviven el código viejo y el esquema nuevo: primero se añade sin romper, retirar lo viejo es un cambio posterior | Regla 6 de la guía nueva `migraciones-de-datos`. Es el fallo que produce una caída **durante** el propio despliegue, invisible en local | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **Refactorización de BD con datos vivos** | Reverso obligatorio, columna obligatoria en tres pasos, renombrar ≠ borrar+crear, probar sobre datos con forma y volumen realistas | Las diez reglas duras de `migraciones-de-datos`, cableadas como gate propio en `/implement` y como check de severidad **Alta** en la dim. 2 de `/review` (el impacto no es un fallo: es pérdida de datos) | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **SEO técnico como código** | Metadatos por ruta, canónica, datos estructurados, indexabilidad, redirección al mover una URL publicada — todo verificable leyendo el diff en cualquier framework con metadatos declarativos | **Corrige un descarte nuestro:** lo habíamos agrupado con la operación («es del repo objetivo»), como JMeter en §6. No lo es: es código, y se revisa igual que la accesibilidad. Absorbido como sección de `usabilidad-accesibilidad` —no guía nueva— para no inflar el catálogo ni añadir un agente | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **i18n verificable** | Un literal en duro en un repo traducido es un hallazgo objetivo, no una preferencia | Sección de `usabilidad-accesibilidad`, con el gate «solo si el repo YA la tiene» (proponer internacionalizar de paso es cambiar el alcance) | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **Contrato de API como frontera publicada** | Validación por esquema en el borde, códigos de estado que distingan, forma del error consistente, paginación, y cambios aditivos vs rotura | Sección de `arquitectura` —es una frontera arquitectónica más—, con la regla que evita el doble reporte: autorización y exposición de datos siguen siendo de la dim. 5 | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **El log es otro almacén** (OWASP A09, leído del revés) | No solo «faltan logs de seguridad»: **registrar lo que no se debe** es hallazgo por sí solo, y un log suele tener menos control de acceso y más retención que la BD | Convertido de advertencia a check accionable en `revisor-bugs-seguridad` | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **Gate determinista para lo irreversible** | Los gates humanos viven en la prosa: gobiernan al agente cuando razona, no cuando se salta el paso | Hook nuevo `PreToolUse` (`destructive-guard.js`): `ask` por defecto —devolver la decisión al usuario ES el gate—, `deny` solo donde no hay uso legítimo iniciado por un agente. Documentado como **red para accidentes, no sandbox** | ✅ rama `feat/frontera-publica-e-irreversibles` |
| **Contexto permanente del repo consumidor** | Stack, comandos exactos, convenciones, reglas de negocio y ficheros intocables, cargados en cada sesión | `examples/CLAUDE.md.example`: teníamos `AGENTS.md.example` (que describe **el flujo**) y nada que describiera **el repo**. Alimenta las «convenciones detectadas» de `/plan` y la lista de rutas protegidas del hook | ✅ rama `feat/frontera-publica-e-irreversibles` |
| Observabilidad, recuperación ante desastres, coste de infraestructura, pipelines de datos, respuesta a incidencias | Prácticas legítimas, con sus propios artefactos | ⛔ **Fuera de la altitud del plugin**, por el mismo criterio que §6 aplicó a JMeter/Newman: nombrarlas es barato, generarlas sin datos reales produce documentos plausibles y falsos. Su sitio es una tarea propia, no una de ClickUp sobre una funcionalidad | ⛔ |

**Adoptado en esta iteración:** guía `rendimiento` · guía `migraciones-de-datos` · SEO técnico e
i18n en `usabilidad-accesibilidad` (dim. 6 pasa a «usabilidad, accesibilidad y SEO», sin agente
ni dimensión nuevos) · contrato de API en `arquitectura` (dim. 4) · A09 leído del revés en
`revisor-bugs-seguridad` · hook `PreToolUse` de acciones irreversibles ·
`examples/CLAUDE.md.example` · deltas de `/implement` (división de commits y aviso de rotura;
build, variables de entorno y migraciones en el gate de verificación).
**Descartado por el filtro (⛔):** generar configuración de observabilidad, planes de
recuperación, estimaciones de coste o código de pipelines.

**Nota de método (segunda lección del documento).** §2 enseñó que una fuente ya catalogada
merece a veces una segunda pasada. Esta añade la inversa: **un descarte también.** «SEO es del
repo objetivo» era correcto para el análisis de posicionamiento y falso para los metadatos de
ruta, que son código como cualquier otro. Al descartar por categoría conviene comprobar si la
categoría es homogénea — aquí no lo era, y el error sobrevivió hasta que alguien lo puso en
duda.

---

## 15. ByteByteGo — *Big Archive: System Design 2025* (archivo del boletín)

**Qué es:** una recopilación de ~200 posts del boletín de ByteByteGo, 442 páginas en PDF. Cubre
system design, redes, bases de datos, diseño de API, seguridad, agentes de IA, código limpio y
pruebas. Es material **divulgativo**: cada entrada es un diagrama con un pie de media página.

**Relación con nosotros:** es la primera fuente del catálogo que no es ni un repo ni un cuerpo
de práctica revisado. Eso cambia cómo se usa: sirve de **mapa de temas** para detectar huecos en
nuestras guías, no de cita. Todo lo importado se contrastó antes con la fuente primaria del tema
(RFC, documentación del motor, OWASP) — y ese contraste encontró cuatro errores en el propio
archivo, que van anotados abajo para que nadie los reimporte.

**Cómo se filtró:** fuera ~90 % por dominio ajeno al plugin (cloud, Kubernetes, redes, internals
de LLM, hojas de ruta de aprendizaje) o por chocar con la regla de «nombrar, no integrar» de
`niveles-y-tipos-de-prueba` (catálogos de herramientas). Lo que queda son huecos reales en tres
ficheros de `core/`.

| Patrón | Qué aporta | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Modos de fallo de una caché** (estampida, penetración, caída) | Los fallos de una caché no son «lento»: son errores de diseño con nombre propio, visibles leyendo el código | `rendimiento` decía que la caché no es la primera respuesta, pero **nada sobre qué revisar cuando el diff sí mete una**. Sección nueva «Cuando el cambio SÍ mete una caché», con la nomenclatura reconocible (*cache stampede / thundering herd / dogpile*), no la del PDF | ✅ |
| **El tipo de índice debe corresponder a la consulta** | Un índice hash solo resuelve igualdad; el árbol equilibrado cubre rango y orden | La viñeta de `rendimiento` decía «índice ausente»; pasa a «ausente o de un tipo que no sirve». Verificado en la documentación de PostgreSQL: *«can only handle simple equality comparisons»* | ✅ |
| **Paginación por desplazamiento vs cursor** | `OFFSET` profundo recorre y descarta todo lo anterior: el coste crece con la profundidad de la página, no con su tamaño | Doble destino: en `rendimiento` como defecto visible en código; en `arquitectura` como **decisión de contrato**, porque cambiarla después rompe a todos los consumidores a la vez | ✅ |
| **Latencia ≠ throughput; los ata la concurrencia** | Un criterio de tiempo sin concurrencia no acota nada | Sección en «Cómo se escribe un criterio de rendimiento», con la ley de Little **corregida** (ver errores) | ✅ |
| **Orden para perseguir una ruta lenta** | red → código → datos → terceros → entorno, midiendo antes de bajar de escalón | Sección nueva en `rendimiento`, enganchada a `depuracion-sistematica`. Ataca el error de empezar a tocar por donde uno sospecha | ✅ |
| **Idempotencia por método HTTP** | Cuáles lo son por definición y qué hacer con los que no | La viñeta de `arquitectura` era una línea. Ampliada con la lista del RFC 9110 y la clave de idempotencia para `POST`/`PATCH` | ✅ |
| **Taxonomía de XSS: reflejado, almacenado y basado en DOM** | El basado en DOM puede no llegar nunca al servidor | `revisor-bugs-seguridad` (A03) solo nombraba los sumideros de HTML. Añadido el recorrido origen→sumidero en cliente y su razón: lo que va tras `#` no se envía al servidor (OWASP) | ✅ |
| **Dónde se cachean los datos** (navegador, CDN, proxy, servicio, BD) | Una respuesta autenticada puede quedarse en una caché compartida y servirse a otro | Añadido a A02 del revisor con la directiva correcta (`private` / `no-store`, RFC 9111) y con la regla que evita el falso positivo inverso | ✅ |
| Pirámide de pruebas · principios de código limpio · SOLID · patrones GoF · monolito modular · DDD | — | Ya cubiertos, y con más profundidad, en §5, §6 y §7 | ⛔ (redundante) |
| CQRS y Event Sourcing | Separar lectura de escritura; el registro de eventos como fuente de verdad | Adoptados en `arquitectura` **redactados por su coste**, en sección aparte del catálogo (no son estilos, igual que DDD). Aquí se ve para qué sirve y para qué no una fuente divulgativa: el PDF los describe en neutro, y todo el freno vino de contrastar con Fowler —que es la fuente que la guía ya citaba—: *«be very cautious about using CQRS»*, *«only … a BoundedContext … not the system as a whole»*, *«don't go down this path unless you really need to»*. Añadido además lo que el PDF **no** dice: que no se implican, y que el disparador más frecuente de event sourcing (querer auditoría) es justo su «cuándo NO» | ✅ |
| Estrategias de despliegue (blue-green, canary, A/B) · CI/CD · Docker · Kubernetes · AWS | — | Fuera de alcance: el plugin no despliega | ⛔ |
| Catálogos de herramientas (30 APIs gratuitas, 12 servidores MCP, 30 apps de IA, stacks de RAG) | — | Contenido perecedero y ajeno a la decisión que toma el plugin | ⛔ |

### Errores detectados en la fuente (no importar)

Se dejan por escrito porque el archivo circula mucho y la tentación de citarlo es real:

| Afirmación del PDF | Lo correcto | Contrastado con |
|---|---|---|
| `QPS = Concurrency × Average Response Time` | **Invertida.** Ley de Little: `concurrencia = throughput × tiempo de respuesta`, luego `QPS = concurrencia / RT`. Tal como está, afirma que responder más lento produce más throughput | Ley de Little (formulación estándar `L = λW`) |
| «MySQL: TCP Port 3360» | 3306 | Registro de nombres de servicio y puertos de IANA |
| «IMAP: Uses TCP Port 139» | 143. El 139 es NetBIOS, que además ya figura en la línea anterior de la misma lista | Registro de nombres de servicio y puertos de IANA |
| «Supervised Learning: learns useful representations without labeled data» | Es la definición del aprendizaje **no** supervisado; el supervisado se entrena con datos etiquetados | Documentación de Google Cloud e IBM sobre supervisado vs. no supervisado |

**La lección de proceso, más allá del contenido:** una fuente divulgativa vale como **detector de
huecos** y no vale como cita. El filtro que funcionó fue mecánico —ninguna afirmación entra en
una guía sin contrastarse antes con su fuente primaria— y conviene aplicarlo por defecto a
cualquier material de este tipo que se analice en el futuro. Nótese además dónde estaban los
huecos: los tres los teníamos en el **segundo movimiento** de una regla que ya existía. Sabíamos
decir «no metas una caché a la ligera» pero no «qué revisar cuando alguien la mete»; «toda
colección se pagina» pero no «con qué estrategia»; «que haya índice» pero no «del tipo que
sirve». Es un sitio donde merece la pena mirar al auditar el resto de guías.

---

## 16. Aprende Programación Competitiva (OIE) — 54 manuales de algoritmia

**Qué es:** el material de estudio de la Olimpiada Informática Española
(`aprende.olimpiada-informatica.org`): 54 manuales agrupados en fundamentales (eficiencia,
costes, recursividad, voraces, análisis amortizado), algoritmos con números, búsqueda completa y
programación dinámica, estructuras de datos (de la STL y propias), grafos, geometría
computacional y listas de problemas. Está escrito para preparar concurso, con demostraciones
trabajadas, mediciones y código en C++.

**Relación con nosotros:** es la primera fuente del catálogo cuyo **dominio no es el nuestro**.
A diferencia de §15 el problema no es la fiabilidad —tiene demostraciones y mediciones, no
diagramas con pie de media página— sino la **transferencia**: la mayor parte de su contenido
resuelve un problema que un repo de producto no tiene, porque el motor de datos ya lo resuelve.
Lo que aquí es un árbol de segmentos, allí es un índice. El filtro, por tanto, no fue contrastar
con la fuente primaria sino preguntar por cada pieza *¿esto aparece alguna vez en una tarea de
producto?*

**Cómo se filtró:** fuera la mayor parte del temario por dominio —grafos, geometría, teoría de
números, optimizaciones de programación dinámica, detalles de C++— no por ser incorrecto, sino
porque su condición de uso (datos en memoria, muchas consultas sobre el mismo conjunto, sin
motor de datos detrás) casi nunca se cumple en el trabajo del plugin. Lo que queda son cuatro
huecos reales y tres transferencias de **método**, que son las que más valen.

| Patrón | Qué aporta | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Del volumen a la clase de coste admisible** | La restricción es la pista principal: de `n` sale la complejidad objetivo, y eso descarta soluciones antes de escribirlas | Sección 1 de `coste-y-estructuras`. Da contenido a la pieza «con qué volumen» que `rendimiento` ya exigía en un criterio pero no sabía derivar | ✅ |
| **Reglas para leer la clase de coste de un código** | Bucles que multiplican, el `j = i+1` que no cambia la clase, recursión por niveles, peor caso, coste amortizado | Sección 2 de `coste-y-estructuras`. Lo que convierte «esto parece lento» en una afirmación comprobable | ✅ |
| **Elegir el contenedor por las operaciones que necesita** | Mapa *hash* por defecto; ordenado solo si el orden se usa; montículo si solo hace falta el siguiente | Sección 3. Es la decisión que aparece en casi toda tarea y la que `rendimiento` mandaba —con razón— no tocar **sin medir**, dejando sin cubrir el caso de elegirla la primera vez | ✅ |
| **Bucle anidado sobre colecciones sin techo** | Búsqueda lineal repetida donde cabía un índice por clave | Firma nueva para la dim. 4 de `/review`, con el mismo perfil que el N+1: correcto hoy, roto con volumen, evitable mientras escribes | ✅ |
| **La búsqueda exhaustiva como oráculo** | Escribir *a propósito* la versión lenta y obviamente correcta para validar la rápida sobre casos pequeños | `niveles-y-tipos-de-prueba`: resuelve el caso que la guía dejaba abierto —qué hacer cuando el esperado no se puede derivar a mano— y es la puerta a las pruebas basadas en propiedades | ✅ |
| **Lo voraz hay que demostrarlo** | Una heurística funciona en tus ejemplos tanto si es correcta como si no; el contraejemplo canónico son las monedas de 1, 3 y 4 para sumar 6 | `evidencia-y-preguntas`: sube un escalón el principio del plugin —no basta con no tener contraejemplo, hay que **haberlo buscado**—. Con su bandera roja | ✅ |
| **Online contra offline** | Poder acumular y reordenar el trabajo desbloquea soluciones que en modo síncrono no existen | `arquitectura`: sección «¿Síncrono o por lotes?» + anti-patrón «síncrono por inercia». Va ahí y no en rendimiento porque la respuesta **se ve en la interfaz** | ✅ |
| **Las tres monedas** (tiempo por consulta, precálculo, memoria) | Casi ninguna estructura es «más rápida»: cambian una moneda por otra | Sección 4 de `coste-y-estructuras`, con el aviso del precálculo que no se amortiza | ✅ |
| Repertorio de estructuras (sumas acumuladas, tabla dispersa, árbol de segmentos, bloques √, union-find, trie, treap) | Consultas sobre rangos, conjuntos disjuntos, prefijos | Adoptado **como catálogo de reconocimiento, no de uso**: cada fila lleva su condición y la tabla entera lleva el aviso de cuándo NO escribirlas. Solo las sumas acumuladas aparecen a menudo en producto | ✅ |
| Grafos (Dijkstra, Bellman-Ford, Floyd-Warshall, MST, SCC/2-SAT, LCA, HLD, centroid decomposition, emparejamiento bipartito) | — | Fuera de alcance: cuando un repo de producto necesita un camino mínimo, lo necesita una vez y con una librería | ⛔ |
| Geometría computacional (envolvente convexa, orientación, teorema de Pick) | — | Dominio ajeno al plugin | ⛔ |
| Teoría de números (criba, exponenciación rápida, Fermat, Euclides) | — | Ídem | ⛔ |
| Optimizaciones de programación dinámica (Knuth, divide y vencerás, SOS DP, Li Chao) | — | Condición de uso inexistente en producto | ⛔ |
| Detalles de C++ y de la STL (`reserve` en potencia de 2, `pop()` no retorna, reservar `4n` en el árbol de segmentos) | — | El core es agnóstico de stack (§7): una guía no se ata a un lenguaje | ⛔ |

### Lo que no se importa tal cual

| Afirmación | Cómo queda en la guía |
|---|---|
| «~10⁸ operaciones por segundo» como presupuesto | **No es un dato de la fuente.** Es una regla de pulgar del ambiente competitivo, calibrada contra la única medición que la fuente sí da (manual II: ~10⁹ pasos triviales por segundo) y bajada un orden de magnitud porque las operaciones reales cuestan más. Va escrita **como regla de pulgar**, no como medición |
| La tabla de `n` contra complejidad | Se importa como **filtro**, no como cálculo: sirve para descartar antes de escribir, no para predecir tiempos |

**La lección de proceso:** en §15 los huecos estaban en el **segundo movimiento** de reglas que
ya existían. Aquí ha sido justo al revés: `rendimiento` tenía el segundo movimiento («no
sustituyas una estructura sin medir») y le faltaba el primero («cuál eliges cuando todavía no hay
código y no hay nada que medir»). Merece la pena auditar el resto de guías por los dos lados: una
regla puede estar coja por delante o por detrás. Y el hallazgo secundario: las piezas más
valiosas de una fuente de otro dominio no fueron sus algoritmos, sino sus **métodos** —el
oráculo, el contraejemplo, la pregunta online/offline—, que viajan entre dominios mucho mejor
que las técnicas.

---

## 17. Fuentes sobre SQL y bases de datos — UNAM/CUAED · OVHcloud · TuxCare

**Qué son:** tres materiales sobre lenguaje SQL. La *Unidad de Apoyo para el Aprendizaje
«Lenguaje SQL Avanzado»* de la CUAED-UNAM (material docente: DDL/DML/DCL, transacciones, tipos
de join, subconsultas, operadores, `GROUP BY` y funciones de agregación, con tres
autoevaluaciones interactivas), y dos artículos de **marketing de contenidos** —OVHcloud
«¿Qué es SQL?» y TuxCare «Comprender su base de datos SQL»— que cubren fundamentos (historia,
filas y columnas, claves primaria y foránea, tipos de datos, comparativa de motores) y terminan
en un anuncio de producto: bases de datos administradas en el primer caso, soporte de ciclo de
vida ampliado en el segundo.

**Relación con nosotros:** el problema aquí no fue el dominio (§16) ni la fiabilidad (§15), sino
el **nivel**. Es material introductorio, y las guías del plugin no son tutoriales: son
decisiones. «`SELECT` recupera datos» en una guía de `core/` sería exactamente el inventario que
las propias guías prohíben. Además, la mayor parte del temario ya estaba cubierta —índices en
`rendimiento`, DDL y cambios de esquema en `migraciones-de-datos`, inyección en la dimensión de
seguridad de `/review`, coste de consultas en `rendimiento` y `coste-y-estructuras`, y dónde vive
la lógica en `arquitectura`—.

**Lo que sí faltaba, y es lo único que se adoptó:** ninguna guía cubría la **corrección** de una
consulta. Los defectos de esa clase no son lentos ni inseguros: son válidos, pasan los tests con
datos de ejemplo y devuelven otro número. Nadie los ve al desplegar; se ven cuando alguien cuadra
un informe a mano. De ahí sale `consultas-correctas`.

**Cómo se filtró:** ninguna afirmación de semántica entró en la guía desde estas tres fuentes.
Todas se contrastaron antes con la documentación de PostgreSQL y de MySQL, que es lo que la guía
cita. Las fuentes sirvieron de **mapa de temas** —qué cubre un temario de SQL— y no de
autoridad.

| Patrón | Qué aporta | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Lógica de tres valores y `NULL`** | `WHERE` conserva solo lo verdadero, así que descarta por igual lo falso y lo desconocido | Sección 1 de `consultas-correctas`. Es la raíz del resto de la guía. Contrastado con la documentación de PostgreSQL: `NOT IN` contra una subconsulta con un solo nulo devuelve nulo —no verdadero— y por tanto **cero filas**, sin fallar. La regla operativa (`NOT EXISTS`, que nunca devuelve nulo) no está en ninguna de las tres fuentes | ✅ |
| **Tipos de join** (cross, inner, left/right outer, full outer) | Qué filas sobreviven a cada combinación | Adoptado **por su modo de fallo**, no como catálogo: el `LEFT JOIN` con la condición de la tabla derecha en el `WHERE` se comporta como `INNER`, y el mecanismo es la sección 1. Con la excepción deliberada del *anti-join* (`IS NULL`), para que no se reporte como falso positivo | ✅ |
| **Funciones de agregación** (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) | Qué calcula cada una | Adoptado por sus trampas, verificadas en la documentación: `COUNT(*)` ≠ `COUNT(columna)`; *«sum of no rows returns null, not zero as one might expect»*; las agregaciones ignoran los nulos, así que `AVG` no es el promedio tratándolos como cero. Más la multiplicación de filas de un join uno-a-muchos, que ninguna fuente menciona y es el defecto que más veces produce un total plausible y equivocado | ✅ |
| **`GROUP BY`** | Agrupar filas en subconjuntos | Adoptado solo el borde peligroso: seleccionar una columna suelta que no está en el `GROUP BY`. MySQL 8 lo rechaza por defecto, pero con `ONLY_FULL_GROUP_BY` desactivado se acepta y el motor elige un valor cualquiera — *«the values chosen are nondeterministic»* (manual de MySQL). Un resultado no determinista es peor que un error | ✅ |
| **Transacciones, `COMMIT` y `ROLLBACK`** | Nada se confirma hasta el `COMMIT`; `ROLLBACK` cancela | Adoptado y **reencuadrado como decisión de frontera**: la transacción envuelve la operación de negocio, no cada escritura; nada irreversible dentro (un correo no se revierte con `ROLLBACK`); leer-decidir-escribir no es atómico. Añadido lo que las fuentes no dicen: **el nivel de aislamiento por defecto no es el mismo en todos los motores** (PostgreSQL `READ COMMITTED`, MySQL/InnoDB `REPEATABLE READ`), así que un comportamiento asumido por costumbre puede no cumplirse | ✅ |
| **Vistas** | `CREATE VIEW` crea una tabla virtual y no almacena datos físicamente | Adoptado en la sección 5 con su consecuencia: no abarata lo que era caro, y anidar vistas esconde el coste de la consulta que acaba ejecutándose. La vista materializada se remite a `rendimiento` porque su problema es de caché | ✅ |
| **Triggers** | `CREATE TRIGGER` con nombre, momento, acción y tabla | Adoptado **como freno**: un trigger es lógica de negocio invisible que no aparece en el diff de la funcionalidad que lo dispara. Listón alto, y los usos que lo justifican son los que la aplicación no puede garantizar. Encuadrado con `arquitectura` | ✅ |
| **DCL: `GRANT` y `REVOKE`** | Controlar el acceso y los privilegios | Adoptado en una línea: el usuario con el que se conecta la aplicación no necesita poder borrar tablas, y el privilegio mínimo reduce el daño de una inyección con éxito | ✅ |
| **Índices asociados a `PRIMARY KEY` y `UNIQUE`** | Se crean por regla general | Fue el hilo que llevó al hallazgo que **contradice lo que la fuente da a entender**: `PRIMARY KEY` y `UNIQUE` crean índice solos, pero `FOREIGN KEY` **no** — *«the declaration of a foreign key constraint does not automatically create an index on the referencing columns»* (PostgreSQL). Añadido como viñeta nueva en `rendimiento`, que ya vigilaba la presencia y el tipo del índice pero no este caso | ✅ |
| Sintaxis de `SELECT`/`INSERT`/`UPDATE`/`DELETE`, `CREATE`/`ALTER`/`DROP`, estructura `select-from-where` | — | Material de consulta. Un agente que escribe SQL ya lo sabe; escribirlo en una guía es inventario | ⛔ |
| Tipos de datos, filas y columnas, clave primaria y foránea como conceptos | — | Ídem: fundamentos, no decisiones | ⛔ |
| Historia de SQL (SEQUEL, System R, ANSI 1986 / ISO 1987, SQL:2011/2016/2019) | — | Contexto sin efecto en ninguna decisión del flujo | ⛔ |
| Comparativa de motores (MySQL, MariaDB, PostgreSQL, SQL Server) y casos de uso por sector | — | El core es agnóstico de stack (§7): detecta el motor del repo en vez de recomendar uno | ⛔ |
| Subconsultas con `IN`, `ALL`, `ANY`, `SOME`, `EXISTS` como catálogo | — | Solo entró lo que cambia una decisión: `NOT EXISTS` frente a `NOT IN` por los nulos. El resto es sintaxis | ⛔ |
| Ventajas de SQL (portabilidad, facilidad de uso, seguridad integrada, «sin necesidad de demasiado código») | — | Es la sección de venta del artículo de OVHcloud, no conocimiento accionable | ⛔ |
| Bases de datos administradas de OVHcloud · soporte de ciclo de vida ampliado de TuxCare | — | Anuncios de producto, que es donde termina cada uno de los dos artículos | ⛔ |

### Errores detectados en las fuentes (no importar)

| Afirmación de la fuente | Lo correcto | Contrastado con |
|---|---|---|
| UNAM: el epígrafe **«Data Manipulation Language (DML)» aparece dos veces**; el segundo describe DCL | El segundo es **DCL**, como dice su propio cuerpo de texto: «lenguaje de control de datos… `COMMIT`, `ROLLBACK`, `GRANT` y `REVOKE`» | Coherencia interna del propio documento |
| UNAM: titula **«Subconsultas (self join)»** | Son dos cosas distintas. Un *self join* une una tabla consigo misma; una subconsulta es una consulta anidada en el predicado. La sección describe subconsultas, no self joins | Definiciones estándar; el propio contenido de la sección |
| UNAM, autoevaluación 2: las **respuestas están cruzadas** — el enunciado que describe el producto cartesiano responde «Inner join» y el que describe el inner join responde «Cross join»; «no será confirmada hasta que usemos la sentencia @» responde «DDL» y «`CREATE`, `ALTER` y `DROP` son las tres sentencias básicas del sublenguaje @» responde «COMMIT» | Cross join ↔ inner join y COMMIT ↔ DDL, intercambiados en los cuatro casos | El propio texto de la unidad, que los define bien |
| UNAM, autoevaluación 2: la **retroalimentación no corresponde al ejercicio** — habla de `COUNT`, `AVG`, `MIN` y `MAX` en un ejercicio sobre joins y transacciones | Copia-pega del ejercicio de funciones de agregación | Comparación entre los dos ficheros de reactivos |
| UNAM, autoevaluación 2: «combinaciones cruzadas entre tablas, **autocombinaciones y combinaciones naturales**» | El cuerpo de la unidad enumera cruzadas, **internas y externas**. Autocombinación y combinación natural son otra cosa | Incoherencia con el texto principal |
| TuxCare: «**CREAR**: Crea nuevas tablas» | `CREATE`. Es traducción automática del comando | Sintaxis SQL |
| TuxCare: «en 1986, cuando ANSI **y la ISO** adoptaron formalmente SQL» | ANSI en 1986; **ISO en 1987**. La propia fuente hermana (OVHcloud) lo dice bien | OVHcloud, mismo dato; historia de la normalización |
| OVHcloud: el epígrafe «**Múltiples vistas de los datos**» lleva debajo texto sobre escalado | Los contenidos de dos apartados están cruzados | Coherencia interna del artículo |

**La lección de proceso:** el filtro que hizo falta aquí no fue el de §15 (contrastar una fuente
divulgativa) ni el de §16 (transferir desde otro dominio), sino uno nuevo: **descartar por
nivel**. Una fuente puede ser correcta, pertinente y del dominio exacto y aun así no dar
material de guía, porque explica *qué es* algo en vez de *cuándo decidir* algo. La pregunta que
ordenó el trabajo fue: «de todo este temario, ¿qué parte cambia una decisión que el flujo toma?»
— y la respuesta fueron los **modos de fallo**, no los conceptos. Conviene aplicarla por defecto
a cualquier material docente introductorio que se analice en el futuro. Nótese también que dos
de las tres fuentes eran marketing de contenidos que termina en un anuncio: no las invalida como
mapa de temas, pero explica por qué ninguna afirmación de semántica se importó de ellas.

---

## 18. addyosmani/agent-skills — el ciclo de vida completo como paquete de skills

**Qué es:** 25 skills + 9 comandos de ciclo de vida (`/spec` `/plan` `/build` `/test`
`/constraints` `/review` `/webperf` `/code-simplify` `/ship`), 4 personas, 7 checklists
compartidos en `references/`, hooks, y un **eval de tres niveles**. MIT, v0.6.9. Filosofía
declarada: «process, not prose», anti-racionalización, verificación con evidencia y progressive
disclosure.

**Relación con nosotros:** es el vecino más cercano en intención —encapsular disciplina de
ingeniería para agentes— y el más lejano en unidad de trabajo. Su ciclo se organiza por **fases
que solo existen en su documentación**, y por eso su propio catálogo de orquestación declara que
*el usuario es el orquestador*: el humano recuerda en qué fase está. El nuestro se organiza por
el **estado de la tarea en ClickUp**, que se consulta. Esa diferencia decide todo lo demás: su
material entra, su envoltorio no.

### 18.A — Por qué los 9 comandos no entran

`estados-tareas` es una función `estado → comando` con un propietario único por transición.
Cinco de sus nueve comandos (`/spec`, `/test`, `/constraints`, `/webperf`, `/code-simplify`)
caen **todos** dentro de `in progress`: la tabla dejaría de ser una función y `/start` no podría
responder «¿qué toca ahora?». Además, lo que hacen ya vive dentro de nuestros cuatro —`/webperf`
en `rendimiento` + dim. 4, `/code-simplify` en el paso de refactor del ciclo TDD, `/test` en el
ciclo TDD entero, `/spec` en la Fase 4 de `/plan`—, así que serían segundas puertas al mismo
material, condenadas a separarse con el tiempo.

Su **anti-patrón C** (orquestador secuencial que parafrasea entre pasos) es, además, el argumento
escrito contra añadir nunca un `/auto`: pierde los checkpoints humanos y dobla el coste. Va a los
anti-objetivos de la filosofía.

### 18.B — Mapa de las 25 skills

| Skill | Qué aporta que no tengamos | Dónde entra | Estado |
|---|---|---|---|
| `using-agent-skills` | Enrutado por árbol de decisión | Lo cubre `estados-tareas` + hook `SessionStart` | ⛔ ya cubierto |
| `idea-refine` | Divergente/convergente, «lo que no vamos a hacer, y por qué» | `/plan`: 2-3 enfoques + tensiones abiertas + Fuera de alcance | ⛔ ya cubierto |
| `planning-and-task-breakdown` | Descomposición en tareas ordenadas | Nuestra unidad es la tarea de ClickUp + sus criterios | ⛔ ya cubierto |
| `incremental-implementation` | Rebanadas verticales finas | Ciclo TDD criterio a criterio | ⛔ ya cubierto |
| `context-engineering` | Jerarquía de contexto y presupuesto | `CLAUDE.md.example` + `grafo-conocimiento` + `formato-toon` | ⛔ ya cubierto |
| `frontend-ui-engineering` | Arquitectura de componentes, WCAG 2.1 | `usabilidad-accesibilidad` + add-on `frontend-design` | ⛔ ya cubierto |
| **`security-and-hardening`** | **OWASP LLM Top 10; triaje de auditoría por alcanzabilidad; higiene de cadena de suministro**; sistema de tres niveles (siempre/preguntar/nunca) | `revisor-bugs-seguridad` (A06 + bloque LLM) y dim. 5 de `/review` | ✅ rama `feat/agent-skills-seguridad-datos-no-fiables` |
| **`browser-testing-with-devtools`** | **Contenido del navegador como dato no fiable; perfil aislado; freno a ejecutar JS**; consola limpia como listón | `qa-exploratoria` | ✅ rama `feat/agent-skills-seguridad-datos-no-fiables` |
| **`debugging-and-error-recovery`** | **Salida de error como dato no fiable**; `git bisect` como técnica de localización; parar la línea | `depuracion-sistematica` | ✅ dato no fiable · 🔜 bisect y parar la línea |
| **`test-driven-development`** | Regla de Beyoncé; DAMP sobre DRY; implementaciones reales antes que dobles; **tamaños por recurso** (pequeño = sin red ni disco); patrón «demuéstralo» para bugs | `niveles-y-tipos-de-prueba` | 🔜 |
| **`constraint-driven-development`** | **Guardia del suelo** (5 movimientos que aflojan el listón, sobre el diff); **trinquete**; ranking de circularidad (externo/proyecto/suite); códigos de salida 0/1/2 | Fase 2 de `/review` | 🔜 |
| **`doubt-driven-development`** | CLAIM→EXTRACT→DOUBT→RECONCILE→STOP en vuelo; **no pasarle el CLAIM al revisor**; precedencia al reconciliar; **«teatro de la duda» como señal comprobable** | Ciclo TDD de `/implement`, solo decisiones no triviales | 🔜 |
| **`source-driven-development`** | Detectar versión instalada → doc oficial de esa versión → citar la URL | `evidencia-y-preguntas` + Fase 3 de `/plan` | 🔜 |
| `code-simplification` | **Valla de Chesterton** | `codigo-limpio` (que hoy dice «código muerto → eliminarlo», el consejo opuesto sin el freno) | 🔜 |
| `code-review-and-quality` | **Revisar los tests primero**; **verificar la verificación**; norma de tamaño del cambio | `/review` | 🔜 |
| `performance-optimization` | **Conservar o revertir**: si la optimización no movió el número, se revierte | `rendimiento` | 🔜 |
| `api-and-interface-design` | Ley de Hyrum; regla de una versión | `arquitectura` (idempotencia y forma del error ya están) | 🔜 |
| `deprecation-and-migration` | Deprecación obligatoria vs. avisada; patrón estrangulador | `migraciones-de-datos` (expandir/contraer ya está) | 🔜 |
| `git-workflow-and-versioning` | **Ficheros generados** en revisión y commits (nos aplica: generamos `adapters/` entero); patrón punto de guardado | `codigo-limpio` / `/implement` | 🔜 |
| `documentation-and-adrs` | Ciclo de vida de la decisión: se supera, no se borra | «Decisiones tomadas» de la spec / `registro-progreso` | 🔜 |
| `interview-me` | Número de confianza; **parada al 95 %**; «sí explícito, no lo-que-tú-veas» | `/plan` — nuestra entrevista tiene orden pero ningún criterio de terminación | 🔜 |
| `spec-driven-development` | Fase 0: ¿esto necesita spec siquiera? | `/plan` | 🟡 menor |
| `observability-and-instrumentation` | «Define qué es funcionar antes de instrumentar»; RED; alertas por síntoma | Un criterio en `/plan`, no guía nueva | 🟡 candidato |
| `ci-cd-and-automation` | Pipeline de puertas, rollouts escalonados | El flujo termina en la PR; `examples/pr-review.yml` cubre lo del repo consumidor | ⛔ fuera de alcance |
| `shipping-and-launch` | Checklist de lanzamiento, presupuesto de error, rollback | `review → complete` es humano y post-PR | ⛔ fuera de alcance |

### 18.C — Infraestructura (lo que no es una skill)

| Patrón | Qué es | Aplicación a nuestro plugin | Estado |
|---|---|---|---|
| **Eval Tier 2: enrutado y colisión** | TF-IDF sobre las `description`: tasa de rank-1 con suelo en CI (`--min-rank1 80`, línea base suya 86 %) y colisión por pares (aviso ≥ 50 %, error ≥ 75 %). Coste cero, determinista | La capa que nos faltaba entre `check-behavior` (forma del disparador) y `check-activation` (modelo real, caro, manual). Implementado con dos cambios de diseño: el suelo se pone sobre **top-3**, no sobre rank-1, y un positivo suelto **no tumba el check** —si lo hiciera, la salida cómoda sería retocar el prompt hasta que pase, que es falsear el eval—. Medido sobre 21 guías y 63 prompts: colisión máxima **16,7 %** (limpia; vale de freno de deriva), rank-1 **52,4 %**, top-3 **77,8 %**, suelo calibrado en **70 %**. Ese rank-1 mide el proxy léxico, no el plugin: donde falla, el mejor candidato suele puntuar ~0 %. Aun así destapó **siete huecos reales de vocabulario** y arreglarlos subió el top-3 de 68,3 % a 77,8 % | ✅ `scripts/check-routing.mjs`, rama `feat/agent-skills-seguridad-datos-no-fiables` |
| **Disparadores negativos con `owner`** | Un negativo declara de qué skill ES el prompt; el runner asevera que el dueño **supera** a esta | Adoptado como **pares confundibles**: 8 pares declarados (`dueno` / `no_debe_ganar`) sobre las fronteras que de verdad se rozan, en vez de dos negativos por guía. Falla si la guía equivocada supera a la dueña | ✅ misma rama |
| **Casos de presión en los evals** | Presión de tiempo, coste hundido y autoridad: «el tech lead dice que es un one-liner y la ventana de hotfix cierra en diez minutos». Verifica que la disciplina aguanta cuando el prompt argumenta para saltársela | Nuestros dos casos miden conocimiento y delta; ninguno mide que **los gates aguanten**, que es nuestra propuesta de valor. Tres casos añadidos (`presion-dato-sin-verificar`, `presion-autoridad-borrado`, `presion-coste-hundido`), con `calibrado: false` hasta correr `--baseline` (6 sesiones, ~2,40 USD equivalentes) | 🔄 escritos, pendientes de calibrar |
| **Ledger de cambios rechazados** (`evals/skill-impact.md`) | Tabla append-only de ediciones de `description` rechazadas, con rank-1 antes→después y el PR | Este documento registra patrones descartados, no ediciones de wording con puntuación. Evita re-litigar un cambio que ya bajó el número una vez | 🔜 |
| **Catálogo de orquestación** (`references/orchestration-patterns.md`) | 5 patrones aprobados y 4 anti-patrones; «el usuario es el orquestador, las personas no invocan personas», profundidad ≤ 1 | Valida nuestra arquitectura punto por punto. Lo aprovechable es escribir su anti-patrón C en los anti-objetivos de la filosofía | 🔜 ver 18.A |
| Campos de frontmatter de agentes de plugin | Afirman que `hooks`, `mcpServers` y `permissionMode` se ignoran en silencio, y que sí funcionan `model`, `tools`, `maxTurns`, `memory`, `effort`, `isolation` | Si es cierto, `effort` y `maxTurns` son palancas que nuestros 6 agentes no usan. **Afirmación suya, no verificada por nosotros** | 🟡 verificar antes de usar |
| Regla por ruta (`.claude/rules/*.md` con `paths:`) | Dispara al tocar `skills/**` y apunta al CONTRIBUTING | Mismo problema nuestro: «edita `core/`, no `adapters/`» vive en prosa del README y solo se lee si alguien la busca. **El mecanismo no nos consta en la versión actual de Claude Code**; la alternativa con mecanismo verificado es un `PreToolUse` sobre edición con comprobación de ruta, con la forma de `destructive-guard.js` | 🟡 verificar mecanismo |
| Plantilla de issue `skill-gap.yml` | Formulario para «la guía se equivocó en mi repo»: skill afectada, extracto, contexto del proyecto, qué hiciste en su lugar | Canal de realimentación estructurado desde los repos consumidores | 🔜 bajo |
| Listón de < 500 líneas por `SKILL.md` | Eficiencia de contexto: la skill se carga entera cuando dispara | **Cumplimos con margen**: máximo 249 líneas (`consultas-correctas`). Vale como aserción de regresión | 🔜 una aserción |
| Hook `sdd-cache` (caché HTTP con ETag) | Revalida con el origen en cada reúso; solo sirve del disco con un `304` | `jq` + `curl` + caché propia para ahorrarse un `WebFetch` | ⛔ sobre-ingeniería |
| Hook `simplify-ignore` | Sustituye bloques marcados por placeholders **en disco** y los restaura al parar la sesión | Sus propias limitaciones incluyen dejar ficheros con placeholders si la sesión casca | ⛔ invasivo |
| Agent Teams para hipótesis competidoras | Compañeros que se mensajean y se refutan hasta converger | Experimental y caro; nuestro fan-out de 5 revisores read-only ya cubre el caso «veredicto sobre un artefacto conocido» | ⛔ |
| Escalado cross-model (Gemini/Codex CLI) | Segunda opinión de otra arquitectura, en sandbox de solo lectura | Dependencia externa dura, y `verificador-hallazgos` ya da refutación independiente. Sus reglas de seguridad sí valen anotadas: sandbox de solo lectura, **nunca interpolar el artefacto en un argumento de shell** (usar stdin), autorización por invocación | 🟡 opcional, no ahora |
| Política de no aceptar traducciones | «Las copias traducidas se desincronizan y nadie las mantiene» | Inverso al nuestro: estamos en español a propósito y hay una sola copia, así que no aplica | 📖 |

### Nota de método

Su `evals/README.md` nombra de dónde sacaron cada mitad: el esquema `evals.json` del
skill-creator de Anthropic para la capa de comportamiento, y el patrón `claude -p` + fixtures de
superpowers para el runner. Lo propio es el Tier 2, porque **ninguno de los dos evalúa un
catálogo**: si dos descripciones se acercan, ningún eval por skill lo ve. Es exactamente nuestro
hueco con 21 guías cuyos dominios se rozan.

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

8. ✅ **Re-análisis a fondo de superpowers v6.2.0** — rama `feat/superpowers-v6-2`: la primera
   pasada solo había cubierto la infraestructura. Esta segunda añade §2.A–§2.D y adopta la
   forma de las `description` (disparador, no resumen — con el hallazgo medido de que un
   resumen hace que el agente NO abra la guía), dos guías nuevas (`depuracion-sistematica`,
   `recepcion-de-revision`), la sección «Tests honestos», las tres reglas de independencia del
   revisor y el gate de verificación con evidencia. → §2.

9. ✅ **`claude plugin validate --strict` en CI + arreglo del frontmatter no parseable** — rama
   `feat/superpowers-v6-2`: la convención de validación de mattpocock/skills destapó que el
   frontmatter de nuestras skills **no parseaba como YAML** desde antes de la v0.6.0 publicada
   (descripciones sin entrecomillar con «: » dentro), de modo que el harness las cargaba **sin
   metadatos** y dejaban de auto-activarse en silencio. → §9.C.
10. ✅ **Disciplina de entrevista en `/plan`** — rama `feat/superpowers-v6-2`: una pregunta cada
    vez con respuesta recomendada, en orden de dependencia, y la regla **hechos-vs-decisiones**
    (los hechos los busca el agente; las decisiones son del usuario). → §9.A.

11. ✅ **Skills de pensamiento y ecosistema de agregadores** — rama `feat/superpowers-v6-2`:
    cascadas de simplificación en `codigo-limpio` y tensiones abiertas en `/plan` (§10); y la
    constatación medida de que los agregadores (§11) son canal de distribución, no fuente de
    patrones — sin cambios de código.

12. ✅ **Worktrees y QA exploratoria** — rama `feat/superpowers-v6-2`: dos guías nuevas que
    cierran los dos huecos que quedaban en los extremos del flujo (aislar el espacio al empezar,
    y probar el producto real antes de la PR). → §12, §13.

13. ✅ **Frontera pública y cambios irreversibles** — rama `feat/frontera-publica-e-irreversibles`:
    dos guías nuevas (`rendimiento`, `migraciones-de-datos`), SEO técnico e i18n absorbidos en
    `usabilidad-accesibilidad`, contrato de API en `arquitectura`, el primer hook `PreToolUse`
    del plugin y la plantilla `CLAUDE.md.example` para el repo consumidor. → §14.

14. 🔄 **Análisis de `addyosmani/agent-skills`** — rama
    `feat/agent-skills-seguridad-datos-no-fiables`: cerrado el **racimo de dato no fiable**
    (superficie LLM y triaje de cadena de suministro en `revisor-bugs-seguridad` + dim. 5;
    salida de error en `depuracion-sistematica`; contenido del navegador y perfil aislado en
    `qa-exploratoria`), que era un punto ciego verificado con `grep` — cero ocurrencias de
    «prompt injection», «untrusted», «no fiable» o «LLM» en todo `core/`. **Quedan tres tandas
    abiertas** en §18.B y §18.C. → §18.

**Backlog consumido (#1–#13) y reabierto por §18.** Nuevas mejoras salen de analizar repos nuevos
(añade una sección `## N. <repo>` con su tabla) o de los patrones aún en 🔜/🟡 de las tablas de
arriba. Consumidos en la tanda #1–#13: paquete de revisión por fichero (§2.B), progressive disclosure (§1), bucket
`in-progress/` (§9.B), micro-test de wording (§2.A), corpus adversarial (§2.D, maquinaria), menú
de cierre de rama (§2.C), worktree de revisión (§12), `license` en skills (§4) y testing basado
en riesgo (§6/[2]). El riesgo de `<SUBAGENT-STOP>` se cerró comprobando que no existía.

Quedan **dos, y por decisión, no por olvido**:

- **Perfiles de stack (§7)** — el propio §7 lo marca como *iniciativa aparte*: es un refactor
  transversal de `core/` para desacoplar los defaults de Next.js, no una mejora incremental.
  Entra cuando sea su tarea, con su spec.
- **Glosario `CONTEXT.md` (§9.A)** — «candidato real, no trivial», y roza `historias-usuario`
  sin que esa lo cubra. Merece decidir primero si es guía nueva o sección, que es justo la clase
  de decisión que no se toma de pasada al final de una tanda.

Lo único pendiente de ejecución, no de diseño: **calibrar los casos de `evals/`**, que gasta
cuota fuera de la sesión de trabajo. (La primera calibración real se hizo en la v0.18.1 y dejó
dos casos de siete; los nuevos que entren por §18 necesitan la suya.)

### Backlog abierto por §18 (addyosmani/agent-skills)

Orden por relación valor/coste, con el racimo de seguridad ya cerrado:

1. ✅ **Racimo de dato no fiable** — LLM Top 10, triaje de dependencias y cadena de suministro,
   salida de error y contenido del navegador como dato. → §18.B
2. 🔄 **Eval Tier 2 en CI + casos de presión** — `check-routing.mjs` en CI (colisión, pares
   confundibles y top-3 con suelo calibrado en 70 %); tres casos de presión escritos y
   **pendientes de calibrar con `--baseline`**, que gasta cuota. → §18.C
3. 🔜 **Guardia del suelo en `/review` + duda en vuelo en `/implement`** — los dos mecanismos de
   más valor de producto: detectar sobre el diff que el listón se aflojó, y refutar decisiones
   no triviales mientras corregir aún es barato. → §18.B
4. 🔜 **Goteo de una idea por guía** — valla de Chesterton, `git bisect`, regla de Beyoncé,
   conservar-o-revertir, Ley de Hyrum, parada al 95 %, ficheros generados, ciclo de vida de la
   decisión, deprecación obligatoria vs. avisada, hechos del framework con versión y cita.
   Cabe en una sola tanda de ediciones pequeñas. → §18.B

### Nota de método

Una lección de §2 aplica a este documento: **una fuente ya catalogada puede merecer una segunda
pasada**. La primera lectura de un repo grande tiende a quedarse en la infraestructura (lo que se
ve desde fuera: manifiestos, hooks, scripts) y a dejar sin leer lo que más valor tiene para
nosotros, que son sus **prompts**. Al re-analizar, conserva la tabla original con sus commits y
añade subsecciones nuevas: el registro de qué se sabía y cuándo es parte del valor.

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
| Guía `arquitectura` crítica-first (estilos + DDD transversal + default modular; modos recomendar/elegir) en `/plan` y `/review` | Fowler / Richards & Ford / Khononov | rama `feat/bibliografia-testing` |
| Guía `calidad-producto` (taxonomía ISO 25010: NFRs en `/plan`, etiquetado de hallazgos en `/review`) | ISO/IEC 25010 (§8) | rama `feat/iso25010-usabilidad` |
| Guía `usabilidad-accesibilidad` + dimensión 6 de `/review` (`revisor-usabilidad-accesibilidad`, sonnet, gate «solo si toca UI») | Nielsen / WCAG 2.2 / checklist UCI (§8) | rama `feat/iso25010-usabilidad` |
| Checks de sesión/auth destilados y modernizados en `revisor-bugs-seguridad` (A01/A05/A07) | Checklist de seguridad UCI (§8) / OWASP | rama `feat/iso25010-usabilidad` |
| Core agnóstico de stack: detección de stack + ejemplos ilustrativos (primer paso de «perfiles de stack» §7) | Visión larga §7 | rama `feat/iso25010-usabilidad` |
| Las 14 `description` de guía reescritas como disparador puro (≤ 500 chars, «Úsala cuando…» + síntomas) + aseveradas en CI | superpowers `writing-skills` (§2.A) | rama `feat/superpowers-v6-2` |
| Guía `depuracion-sistematica` (4 fases + regla de los tres arreglos fallidos + señales del usuario + petición de datos al usuario como evidencia, fase 1.6) en `/implement` | superpowers `systematic-debugging` (§2.C) | rama `feat/guia-depuracion-sistematica` |
| Guía `recepcion-de-revision` (verificar antes de aplicar, tope de 3 rondas, adjudicación escrita) en el modo CORRECCIÓN | superpowers `receiving-code-review` + SDD (§2.B, §2.C) | rama `feat/guia-recepcion-de-revision` |
| Sección «Tests honestos» en `niveles-y-tipos-de-prueba` (nombra la rotura, esperado a mano, comprobación de mutación) | superpowers `writing-good-tests` (§2.C) | rama `feat/superpowers-v6-2` |
| Tres reglas de independencia del revisor en `revision-hallazgos`: afirmaciones ≠ hechos · `exigido-por-spec` · ⚠️ no verificable desde el diff | superpowers SDD (§2.B) | rama `feat/superpowers-v6-2` |
| Gate de verificación con evidencia («si no lo has ejecutado, no puedes decir que pasa») en `/implement` | superpowers `verification-before-completion` (§2.C) | rama `feat/superpowers-v6-2` |
| 2-3 enfoques con recomendación, «Restricciones globales» y auto-revisión de spec en `/plan` | superpowers `brainstorming` + `writing-plans` (§2.C) | rama `feat/superpowers-v6-2` |
| `revisor-convenciones` de haiku a sonnet + regla de indicar siempre el modelo al despachar | superpowers SDD, «los turnos pesan más que el precio por token» (§2.B) | rama `feat/superpowers-v6-2` |
| **Arreglo del frontmatter no parseable** (`yamlString()` en `sync.mjs`) + aserción de `description` entrecomillada — corregía un fallo silencioso presente ya en la v0.6.0 publicada | mattpocock/skills, vía `claude plugin validate --strict` (§9.C) | rama `feat/superpowers-v6-2` |
| CI nuevo `manifest-check.yml` (`claude plugin validate --strict` sobre plugin y marketplace) + `description` del marketplace | mattpocock/skills (§9.B) | rama `feat/superpowers-v6-2` |
| Disciplina de entrevista en `/plan`: una pregunta cada vez con respuesta recomendada, en orden de dependencia, y **hechos-vs-decisiones** | mattpocock/skills, familia `grill` (§9.A) | rama `feat/superpowers-v6-2` |
| Sección «Cascadas de simplificación» en `codigo-limpio` (el refactor de 10x, con el límite de que debe **borrar** código) | obra/superpowers-skills (§10) | rama `feat/superpowers-v6-2` |
| **Tensiones abiertas** en «Decisiones tomadas» de `/plan`: no forzar un ganador cuando ambas opciones son válidas según contexto | obra/superpowers-skills, `preserving-productive-tensions` (§10) | rama `feat/superpowers-v6-2` |
| Guía `espacio-de-trabajo-aislado` (worktrees) + opción en `/start`, degradando a rama normal | obra/superpowers · AutoGPT (§12) | rama `feat/guia-espacio-de-trabajo-aislado` |
| Guía `qa-exploratoria` (5 fases, consola, evidencia, taxonomía) en `/implement` y `/review` | NousResearch `dogfood` · openclaw `auto-qa` (§13) | rama `feat/guia-qa-exploratoria` |
| Deduplicación **por causa, no por síntoma** en `revision-hallazgos` | openclaw `auto-qa` (§13) | rama `feat/superpowers-v6-2` |
| Guía `rendimiento` (dos filos: medir antes de optimizar + lista cerrada de lo evidente en código) en `/plan` y dim. 4 de `/review` | ISO 25010 · juego de escalas (§10, §14) | rama `feat/frontera-publica-e-irreversibles` |
| Guía `migraciones-de-datos` (10 reglas duras + expandir/contraer) con gate propio en `/implement` y severidad Alta en dim. 2 de `/review` | Fowler *ParallelChange* · Sadalage & Ambler (§14) | rama `feat/frontera-publica-e-irreversibles` |
| SEO técnico e i18n en `usabilidad-accesibilidad`; dim. 6 pasa a «usabilidad, accesibilidad y SEO» (sin agente ni dimensión nuevos) | schema.org · directrices de indexación (§14) | rama `feat/frontera-publica-e-irreversibles` |
| Contrato de API como frontera publicada en `arquitectura` (dim. 4), sin pisar la dim. 5 | Fowler *TolerantReader* / *ParallelChange* (§14) | rama `feat/frontera-publica-e-irreversibles` |
| A09 leído del revés en `revisor-bugs-seguridad`: registrar lo que no se debe es hallazgo propio | OWASP A09 (§14) | rama `feat/frontera-publica-e-irreversibles` |
| Hook `PreToolUse` `destructive-guard.js` (ask por defecto, deny solo sin uso legítimo) — primer gate determinista del plugin | §14 | rama `feat/frontera-publica-e-irreversibles` |
| `examples/CLAUDE.md.example` (contexto permanente del repo consumidor) + recetas opcionales en `repo-settings.json` | §14 | rama `feat/frontera-publica-e-irreversibles` |
| Sección «Cuando el cambio SÍ mete una caché» en `rendimiento` (estampida, penetración, invalidación, clave que no distingue) | ByteByteGo §15, contrastado | rama `feat/bytebytego-cache-indices-contrato` |
| «Índice ausente» pasa a «ausente o de un tipo que no sirve para esa consulta» en `rendimiento` | ByteByteGo §15 · docs de PostgreSQL | rama `feat/bytebytego-cache-indices-contrato` |
| Paginación por desplazamiento como defecto en `rendimiento` **y** como decisión de contrato en `arquitectura` | ByteByteGo §15 | rama `feat/bytebytego-cache-indices-contrato` |
| Latencia vs. throughput con la ley de Little en el criterio de rendimiento, y aviso sobre la fórmula invertida que circula | ByteByteGo §15 (corrigiendo la fuente) | rama `feat/bytebytego-cache-indices-contrato` |
| Sección «Perseguir una ruta lenta» (red → código → datos → terceros → entorno) en `rendimiento` | ByteByteGo §15 | rama `feat/bytebytego-cache-indices-contrato` |
| Idempotencia por método HTTP + clave de idempotencia en el contrato de API de `arquitectura` | ByteByteGo §15 · RFC 9110 | rama `feat/bytebytego-cache-indices-contrato` |
| XSS basado en DOM (recorrido origen→sumidero en cliente) en A03 de `revisor-bugs-seguridad` | ByteByteGo §15 · OWASP | rama `feat/bytebytego-cache-indices-contrato` |
| Respuesta autenticada cacheable en caché compartida en A02 de `revisor-bugs-seguridad` | ByteByteGo §15 · RFC 9111 | rama `feat/bytebytego-cache-indices-contrato` |
| Sección «Dos patrones que se pagan caro» (event sourcing y CQRS, redactados por su coste) en `arquitectura` | ByteByteGo §15, encuadrado con Fowler (§7) | rama `feat/bytebytego-cache-indices-contrato` |
| Guía transversal `evidencia-y-preguntas` (procedencia del dato + test de los tres escalones) enganchada en los 4 workflows | Petición del usuario; formaliza lo que estaba repartido en `revision-hallazgos`, `/plan` e `/implement` | rama `feat/bytebytego-cache-indices-contrato` |
| `check-behavior.mjs` deriva la lista de guías del **disco** (no de `sync.mjs`, que la volvería tautológica) — cierra la deriva que dejaba sin comprobar toda guía nueva | Defecto detectado durante esta iteración | rama `feat/bytebytego-cache-indices-contrato` |
| Guía `coste-y-estructuras` (presupuesto de coste, lectura de la clase, elección de contenedor y repertorio con su «cuándo NO») en `/plan`, `/implement` y dim. 4 de `/review` | OIE §16 | rama `feat/algoritmia-coste-y-estructuras` |
| Firma de revisión: bucle anidado sobre dos colecciones sin techo cuando una podía indexarse por clave | OIE §16 | rama `feat/algoritmia-coste-y-estructuras` |
| El **oráculo lento** en `niveles-y-tipos-de-prueba` (versión obviamente correcta como referencia; puerta a las pruebas basadas en propiedades) | OIE §16 | rama `feat/algoritmia-coste-y-estructuras` |
| **Buscar el contraejemplo** en `evidencia-y-preguntas`: no basta con no tenerlo, hay que haberlo buscado | OIE §16 | rama `feat/algoritmia-coste-y-estructuras` |
| Sección «¿Síncrono o por lotes?» en `arquitectura` + anti-patrón «síncrono por inercia» | OIE §16 | rama `feat/algoritmia-coste-y-estructuras` |
| Frontera explícita `rendimiento` ↔ `coste-y-estructuras` (sustituir exige medición; elegir la primera vez, no) | OIE §16 | rama `feat/algoritmia-coste-y-estructuras` |
| Guía `consultas-correctas` (lógica de tres valores, joins que cambian de tipo, agregación sobre filas multiplicadas, frontera de la transacción, lógica en la base de datos) en `/plan`, `/implement` y `/review` | UNAM/CUAED · OVHcloud · TuxCare §17, contrastado con PostgreSQL y MySQL | rama `feat/guia-consultas-correctas` |
| `NOT EXISTS` frente a `NOT IN` cuando la subconsulta admite nulos (devuelve cero filas sin fallar) | PostgreSQL, expresiones de subconsulta (§17) | rama `feat/guia-consultas-correctas` |
| El nivel de aislamiento por defecto difiere entre motores (PostgreSQL `READ COMMITTED`, MySQL/InnoDB `REPEATABLE READ`) | Documentación de PostgreSQL y de MySQL (§17) | rama `feat/guia-consultas-correctas` |
| **Clave foránea sin índice** como defecto visible en código en `rendimiento` — `PRIMARY KEY` y `UNIQUE` lo crean solos, `FOREIGN KEY` no | PostgreSQL, restricciones (§17), corrigiendo lo que la fuente da a entender | rama `feat/guia-consultas-correctas` |
| **Paquete de revisión por fichero** en `/review`: el patch va a `/tmp/review-<taskId>.diff` y a los 5 agentes se les pasa la ruta, no el diff | superpowers §2.B | rama `feat/paquete-de-revision` |
| Contrato de entrada por RUTAS en los 4 revisores y el verificador (`Read` primero), sin tocar su allowlist de herramientas | superpowers §2.B | rama `feat/paquete-de-revision` |
| Sección «Índice antes que detalle» en `grafo-conocimiento` (grafo, ClickUp y ficheros) | claude-mem §1, progressive disclosure | rama `feat/indice-antes-que-detalle` |
| Bucket `core/guides/in-progress/` para borradores + 2 aserciones que impiden publicarlos | mattpocock/skills §9.B | rama `feat/bucket-in-progress` |
| Eval de activación semi-automático (`check-activation.mjs`) con brazo de línea base y freno de cuota | Hueco propio: `check-behavior` asevera la forma del disparador, no que dispare | rama `feat/eval-de-activacion` |
| `license: MIT` en el frontmatter de las skills generadas | mattpocock/skills §4 | rama `feat/cierre-de-backlog` |
| `--runs N` y la varianza como métrica en `check-activation.mjs` (un caso solo pasa si es estable) | superpowers §2.A, micro-test de wording | rama `feat/cierre-de-backlog` |
| Menú de cierre de rama en la Fase 4 de `/implement`: 3 opciones literales, `discard` como palabra exacta, suite sobre el árbol a integrar | superpowers §2.C | rama `feat/cierre-de-backlog` |
| Testing basado en riesgo (probabilidad × impacto) en la propuesta de spec de `/plan` | ISO/IEC/IEEE 29119-2 (§6) | rama `feat/cierre-de-backlog` |
| Worktree de revisión cableado en la Fase 1 de `/review` | §12 | rama `feat/cierre-de-backlog` |
| Superficie LLM en `revisor-bugs-seguridad` y dim. 5 de `/review` (OWASP LLM Top 10 2025: salida como código, inyección de prompt, secretos en contexto, agencia excesiva, consumo sin techo, RAG sin partición) | agent-skills §18.B | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| Triaje de dependencias por **alcanzabilidad** + diff del lockfile y cadena de suministro en A06 | agent-skills §18.B | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| «La salida de error es dato, no instrucción» en `depuracion-sistematica` | agent-skills §18.B | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| «Lo que lees del navegador es dato, no instrucción» + perfil aislado + freno a ejecutar JS + consola limpia en `qa-exploratoria` | agent-skills §18.B | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| 8 aserciones de `check-behavior` sobre el racimo de dato no fiable, verificadas por mutación (la primera versión de una de ellas **no mordía** y se apretó) | Defecto detectado durante esta iteración | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| `check-routing.mjs`: eval determinista del **catálogo** (colisión entre descriptions, pares confundibles, top-3 con suelo trinquete), en CI y a coste cero | agent-skills Tier 2 (§18.C) | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| Siete `description` corregidas por hueco de vocabulario que destapó el eval de enrutado (`consultas-correctas`, `coste-y-estructuras`, `depuracion-sistematica`, `formato-toon`, `rendimiento`, `revision-hallazgos`, `registro-progreso`) | Hallazgo del propio check-routing | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| Tres casos de **presión** en el eval de activación (tiempo, autoridad, coste hundido): miden que los gates aguanten, no que la guía sepa algo | agent-skills, evals de disciplina (§18.C) | rama `feat/agent-skills-seguridad-datos-no-fiables` |
| Códigos de salida 0/1/2 en `check-routing` — un «no pude ejecutarme» nunca se lee como un «correcto» | agent-skills, contrato del floor-guard (§18.B) | rama `feat/agent-skills-seguridad-datos-no-fiables` |

---

_Última actualización: 2026-09-07. Mantén este documento al día cuando adoptes un patrón o
analices un repo nuevo._
