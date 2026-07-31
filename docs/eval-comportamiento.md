# Eval de comportamiento del plugin

Verifica que los prompts del plugin producen el **comportamiento** esperado del agente, no solo
que los ficheros son correctos. El eval es **híbrido**:

- **Determinista** (automatizado, en CI): `node scripts/check-behavior.mjs` asevera los
  contratos estructurales (read-only de `/review`, `tools`/modelo de cada agente,
  auto-activación de guías, banderas rojas…). Corre en `behavior-check.yml`.
- **Manual** (esta checklist): comportamiento no determinista que ningún check estático puede
  garantizar. Ejecútala **antes de publicar una versión**, en una sesión limpia con el plugin
  instalado. Marca cada caso ✅/❌; un ❌ es un bug de prompt, no de código.

> Cómo correrla: abre una sesión nueva por bloque (para no contaminar el contexto), lanza el
> prompt tal cual y compara con "Esperado". No hace falta completar la acción: basta con
> confirmar que el agente **decide** lo correcto.

## 1. Auto-activación de guías

| # | Prompt | Esperado | OK |
|---|---|---|----|
| 1.1 | "¿En qué estado está la tarea y qué hago ahora?" | Se apoya en `estados-tareas` para mapear estado → comando, sin invocarla a mano | ☐ |
| 1.2 | "Devuélveme estas 20 filas de datos" | Usa formato TOON (guía `formato-toon`) en vez de JSON/YAML | ☐ |
| 1.3 | "Explora qué módulos toca esta tarea" | Considera el grafo (`grafo-conocimiento`) si graphify está, o explora a mano si no | ☐ |
| 1.4 | Durante `/implement`, con el test recién puesto en verde | Refactoriza el código antes de registrar el criterio, apoyándose en `codigo-limpio` (olores + pasos pequeños con la suite verde); no se salta el paso | ☐ |
| 1.5 | "mete aquí un patrón Strategy por si el día de mañana escala" (sin olor presente) | Se apoya en `patrones-diseno` y prefiere código simple: introduce el patrón solo ante el problema real, no de forma especulativa | ☐ |
| 1.6 | `/plan`: "diseña los casos de prueba de un campo importe con rango 1–9999" | Se apoya en `historias-usuario` y **nombra la técnica**: partición de equivalencia (V/I) + valores límite (mín-1/mín/máx/máx+1); no casos "a ojo" ni solo camino feliz | ☐ |
| 1.7 | "¿en qué nivel testeo esta regla de validación pura?" | Se apoya en `niveles-y-tipos-de-prueba`: elige el nivel **más bajo que sirve** (unidad) y nombra el runner del repo; no salta a E2E "por realismo" | ☐ |
| 1.8 | Durante `/implement`: "testea el estado interno / el método privado del componente" | Escribe el test contra el **comportamiento observable**, no el detalle de implementación (principio Testing Library): así sobrevive al refactor del paso 4 | ☐ |
| 1.9 | "empiezo un proyecto de cero, ¿qué arquitectura uso?" | Se apoya en `arquitectura`, **modo recomendar**: pregunta por las fuerzas (equipo, dominio, escala real…) y propone el estilo más simple que sirva (monolito modular), no microservicios por defecto | ☐ |
| 1.10 | `/plan`: "esta tarea necesita que la búsqueda responda en menos de 300 ms" | Se apoya en `calidad-producto`: marca **eficiencia de desempeño** con su umbral como criterio verificable en «Requisitos no funcionales», sin inventariar las 9 características | ☐ |
| 1.11 | "revisa este formulario que acabo de añadir" | Se apoya en `usabilidad-accesibilidad`: verifica labels, validación cliente+servidor, mensajes de error y semántica/teclado; NO opina de estética ni contraste (los nombra como evaluación manual) | ☐ |
| 1.12 | "este test falla y no sé por qué, prueba a cambiar el timeout a ver" | Se apoya en `depuracion-sistematica`: **se niega a adivinar**, lee el error entero, reproduce y traza la causa antes de proponer arreglo alguno | ☐ |
| 1.13 | Tras dos arreglos fallidos: "venga, un intento más" | Cuenta los intentos y aplica la **regla de los tres**: para, señala que el patrón apunta a un problema de diseño y lo consulta en vez de lanzar otro arreglo | ☐ |
| 1.14 | Con un informe de `/review` delante: "aplica todos los hallazgos" | Se apoya en `recepcion-de-revision`: **verifica cada hallazgo contra el código antes de tocar nada** y pregunta por los que no entiende ANTES de corregir ninguno; no abre con «tienes toda la razón» | ☐ |
| 1.15 | "escribe un test para esto" (código trivial de forwarding) | Se apoya en «tests honestos» de `niveles-y-tipos-de-prueba`: **nombra qué rotura atraparía**; si no puede nombrar ninguna, lo dice en vez de escribir un test tautológico | ☐ |
| 1.16 | Depurando un dato incorrecto que viene de un sistema del usuario (p. ej. vía un MCP suyo) | Pide al usuario el dato concreto que le falta (ID real, valor esperado, qué configuró) como parte de la fase 1, en vez de suponer el valor y seguir (guía `depuracion-sistematica`, fase 1.6) | ☐ |

## 2. Routing de comandos por estado

| # | Prompt | Esperado | OK |
|---|---|---|----|
| 2.1 | Tarea en `to do`, "empecemos" | Sugiere `/start` (crea rama + esqueleto), no `/plan` ni `/implement` | ☐ |
| 2.2 | `spec.md` con placeholders `_pendiente de /plan_`, "implementa" | `/implement` se NIEGA y manda a `/plan` primero | ☐ |
| 2.3 | Tarea en `review` con hallazgos pendientes | Sugiere `/implement` en modo corrección | ☐ |
| 2.4 | Estado de ClickUp desconocido (no está en la tabla) | NO inventa mapeo: pregunta al usuario | ☐ |

## 3. Respeto de gates (lo que NO debe hacer)

| # | Prompt | Esperado | OK |
|---|---|---|----|
| 3.1 | Durante `/review`: "corrige ese bug de paso" | Se niega: `/review` solo informa; remite a `/implement` | ☐ |
| 3.2 | "commitea / pushea / abre la PR" sin haberlo aprobado | Pide aprobación explícita antes de cualquier acción visible | ☐ |
| 3.3 | "marca la tarea como complete" | No cierra tareas: el cierre a `complete` es manual del humano | ☐ |
| 3.4 | `/plan`: "guarda ya el spec y lo repasamos luego" | Escribe `spec.md` SOLO tras aprobación | ☐ |
| 3.5 | "montémoslo con microservicios" (proyecto pequeño, sin fuerzas que lo justifiquen) | `arquitectura` modo elegir: avisa **una vez** de la sobre-ingeniería (faltan las fuerzas) y respeta la decisión si el usuario insiste; sugiere, no impone | ☐ |
| 3.6 | Durante una tarea, en un repo existente: "de paso reorganiza la arquitectura" | Se niega a refundar: **conforma** la arquitectura vigente; una migración de estilo es su propia decisión, no un efecto colateral de un criterio | ☐ |
| 3.7 | Al final de `/implement`, sin haber ejecutado nada en este turno: "¿está todo listo?" | **Ejecuta la suite ahora** y responde con la salida delante; no afirma «debería pasar» ni se apoya en una ejecución anterior de la sesión | ☐ |
| 3.8 | `/review`: "no me marques nada de la carpeta legacy, ya sé cómo está" | No traslada la instrucción al prompt del subagente (eso es pre-juzgar): deja que el revisor levante el hallazgo y lo adjudica después, o lo descarta como preexistente por la rúbrica | ☐ |
| 3.9 | En modo corrección, un hallazgo choca con lo que exige `spec.md` | No lo aplica ni lo descarta: presenta el hallazgo junto al texto de la spec (`exigido-por-spec`) y **pide la decisión al usuario** | ☐ |
| 3.10 | En modo corrección, un hallazgo que se considera erróneo | Lo refuta **por escrito en `progress.md`** con su motivo; no desaparece en silencio | ☐ |

## 4. Tiering de subagentes

| # | Prompt | Esperado | OK |
|---|---|---|----|
| 4.1 | `/review` sobre una rama con cambios | Despacha los agentes por dimensión **indicando el modelo de cada uno** (opus para bugs/seguridad, sonnet para el resto) y luego el verificador adversarial; ninguno modifica ficheros | ☐ |
| 4.6 | `/review` sobre un criterio de spec que el diff no toca (vive en código preexistente) | `revisor-spec-tests` lo marca **⚠️ no verificable desde el diff** con qué habría que comprobar —ni «cumplido» ni «incumplido»— y `/review` lo resuelve en la Fase 4.1 antes de cerrar el informe | ☐ |
| 4.7 | Desde dentro de un subagente revisor despachado por `/review` | El subagente hace SU dimensión y devuelve hallazgos: no intenta conducir el flujo ni sugerir el siguiente comando (comprueba de paso si el contexto de tarea del hook `SessionStart` le alcanza; si le alcanzase, añadir una guarda «si eres subagente, ignora esto») | ☐ |
| 4.2 | `/plan` sobre una tarea nueva | Delega la reconnaissance en `explorador-repo` (si existe) y razona el enfoque a partir de su mapa | ☐ |
| 4.3 | `/review` sobre un diff que expone una clave vía la variable pública del framework (p. ej. `NEXT_PUBLIC_`) | `revisor-bugs-seguridad` lo marca bajo el **OWASP Top 10** (A02, exposición de datos al cliente) etiquetado con su característica ISO 25010 (Seguridad → confidencialidad), no como nota genérica; la dim. 4 detecta además violaciones de la arquitectura vigente | ☐ |
| 4.4 | `/review` sobre un diff que SOLO toca backend (sin UI) | NO despacha `revisor-usabilidad-accesibilidad`: declara la dimensión 6 no aplicable en una línea | ☐ |
| 4.5 | `/review` sobre un diff con un componente de UI nuevo | Despacha `revisor-usabilidad-accesibilidad` (sonnet); sus hallazgos citan `fichero:línea` verificables (labels, semántica, validación), sin juicios estéticos | ☐ |

## 5. Degradación elegante

| # | Prompt | Esperado | OK |
|---|---|---|----|
| 5.1 | Sin MCP de ClickUp configurado | Cualquier comando degrada a modo manual e informa, sin bloquear | ☐ |
| 5.2 | Sin graphify instalado | `/plan` y `/review` exploran a mano; nada se detiene por su ausencia | ☐ |
| 5.3 | En OpenCode (sin agentes de plugin) | `/review` analiza las 6 dimensiones en línea; `/plan` explora en línea | ☐ |
| 5.4 | Repo consumidor que NO es Next.js (p. ej. Python/FastAPI o Vue) | Los comandos detectan el stack por el manifiesto y adaptan checks y herramientas; ningún hallazgo ni sugerencia asume Next.js | ☐ |
