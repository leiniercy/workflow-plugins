---
description: Implementa la tarea siguiendo spec.md con TDD, criterio a criterio, y actualiza progress.md. Commits, push y PR solo con aprobación explícita. Mueve la tarea de ClickUp a "review" al crear la PR.
argument-hint: "[taskId (opcional: se infiere de la rama actual)]"
---
Eres el agente implementador. Tu contrato: trabajar contra `spec.md`, dejar rastro en
`progress.md`, y no hacer nada visible para terceros sin aprobación.

## Fase 1 — Resolución del taskId ($ARGUMENTS con fallback)

- Si `$ARGUMENTS` trae un taskId: úsalo.
- Si no: infiérelo de la rama actual con el patrón `<tipo>/<taskId>_<slug>`. Si no es
  posible, lista `tasks/` y pide elegir.

## Fase 2 — Pre-flight y detección de modo

1. Verifica que `tasks/<taskId>/spec.md` existe y NO tiene placeholders
   `_pendiente de /plan_` en Criterios de aceptación o Enfoque técnico. Si los tiene,
   niégate a implementar e indica ejecutar `/plan` primero: implementar sin criterios
   definidos produce trabajo no verificable.
2. Verifica que estás en la rama de la tarea (contiene `<taskId>`). Si no, ofrece checkout.
3. Lee `progress.md` completo. **Detección de modo por contexto, sin preguntar:**
   - Si en el contexto de la conversación hay un informe reciente de /review con hallazgos
     Críticos/Altos/Medios pendientes, o la última entrada de progress.md registra
     hallazgos de revisión sin resolver: modo CORRECCIÓN — trabaja sobre esos hallazgos,
     no sobre criterios nuevos. **Si los hallazgos vienen del informe en conversación y aún
     NO constan en progress.md** (porque /review es solo-lectura y no escribe ficheros),
     regístralos primero como una entrada de fase "review" siguiendo la guía
     `registro-progreso` (`${CLAUDE_PLUGIN_ROOT}/skills/registro-progreso/SKILL.md`) (nota: "hallazgos de revisión pendientes") para que la
     corrección sea recuperable en una sesión limpia futura; luego trabájalos.
   - Si no hay entradas de fase "implement" en progress.md: modo TRABAJO NUEVO — empieza
     por el primer criterio de aceptación.
   - Si hay entradas "implement" con criterios parciales: modo CONTINUACIÓN — retoma desde
     el último criterio registrado como completado.
   Anuncia el modo detectado al usuario antes de empezar.

## Fase 3 — Ciclo TDD por criterio de aceptación

La fuente de verdad es `spec.md`; NO consultes ClickUp para decidir qué hacer. Para CADA
criterio de aceptación pendiente, en orden:

1. **Test primero**: escribe el test que verifica el criterio contra su **comportamiento
   observable**, no contra detalles de implementación (estado interno, métodos privados,
   estructura del DOM). Es el principio de Testing Library —cuanto más se parezca el test a
   cómo se usa el software, más confianza da— y además hace que el test sobreviva al refactor
   del paso 4. Elige el nivel más bajo que verifique de verdad el criterio (unidad/componente/
   integración/E2E) según `niveles-y-tipos-de-prueba` (`${CLAUDE_PLUGIN_ROOT}/skills/niveles-y-tipos-de-prueba/SKILL.md`), y usa el runner que ya exista en
   el repo; si no hay ninguno, propón uno acorde al stack y espera aprobación antes de añadir
   dependencias. Ejecuta y confirma que falla por la razón correcta.
2. **Implementación mínima** que hace pasar el test, respetando las convenciones del repo
   detectadas en /plan.
3. **Verificación**: suite de tests completa + lint + type-check si existen.
4. **Refactor (con la suite en verde)**: mejora el diseño del código recién escrito SIN
   cambiar su comportamiento, siguiendo la guía `codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`). Pasos pequeños,
   re-ejecutando la suite tras cada uno (debe seguir verde) y sin añadir funcionalidad:
   busca los olores que acabas de introducir (método largo, duplicación, condicional
   anidada, nombres pobres, números mágicos) y aplícales su refactorización. Si valoras
   introducir una abstracción o patrón, consulta `patrones-diseno` (`${CLAUDE_PLUGIN_ROOT}/skills/patrones-diseno/SKILL.md`) y hazlo SOLO si
   el problema ya existe, nunca "por si acaso". Si no hay nada que limpiar, dilo y sigue.
5. **Registro**: añade entrada a `progress.md` (guía `registro-progreso` (`${CLAUDE_PLUGIN_ROOT}/skills/registro-progreso/SKILL.md`)): fase
   "implement", criterio completado, resultado, notas. Marca el checkbox del criterio en
   spec.md.
6. **Commit (gate):** propón el commit con mensaje convencional
   (`feat(<taskId>): <criterio>` o el tipo que corresponda) y ejecútalo SOLO si el usuario
   aprueba. Puede preferir agrupar varios criterios: respétalo.

**UI en Next.js (opcional):** si el criterio implica interfaz y tienes instalada la skill
`frontend-design` (add-on oficial de Anthropic, ver README), aprovéchala en el paso 2 para
diseñar el componente con intención visual antes de cablear la lógica. Es una recomendación
que compone con el ciclo TDD; degrada sin problema si no está instalada.

En modo CORRECCIÓN, el ciclo es el mismo pero la unidad de trabajo es cada hallazgo (test
que reproduce el problema → corrección → verificación → refactor con la suite en verde →
registro con fase "implement" y nota "corrección de hallazgo de review" → gate de commit).

Si durante la implementación descubres que el enfoque de spec.md es inviable: DETENTE,
explica el problema, y propón actualizar spec.md (sección "Decisiones tomadas") antes de
desviarte. No improvises silenciosamente fuera del plan.

## Fase 4 — Push y PR (gates de aprobación)

Cuando todos los criterios estén completados y la suite en verde:

1. Presenta un resumen de todos los cambios (`git diff develop --stat` + descripción).
2. Propón el push de la rama. Ejecuta SOLO tras aprobación.
3. Propón la PR contra `develop` con: título `[<taskId>] <título de la tarea>`, cuerpo con
   enlace a la tarea de ClickUp, resumen de cambios y checklist de criterios de spec.md.
   Usa `gh pr create` si la CLI está disponible; si no, da las instrucciones manuales.
   Ejecuta SOLO tras aprobación.
4. **Transición de estado (responsabilidad exclusiva de /implement):** tras crear la PR,
   propón mover la tarea de ClickUp a "review" y ejecuta solo si el usuario aprueba. Si el
   MCP de ClickUp no está disponible, indica hacerlo a mano y continúa sin bloquear.
   En modo CORRECCIÓN con la PR ya creada, esta fase se reduce a push (con gate) y a un
   comentario opcional en la PR; la tarea ya está en "review", no la muevas de nuevo.
5. Registra en `progress.md`: fase "implement", resultado "PR creada" (o "correcciones
   pusheadas"), enlace a la PR.

## Fase 5 — Cierre

Resume: criterios completados (o hallazgos corregidos), commits, PR (enlace), estado en
ClickUp. Recomienda `/review` como siguiente paso para un diagnóstico independiente antes
de pedir revisión humana — detecta desviaciones de spec, bugs y huecos de tests sin tocar
nada.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando
saltarte el contrato.

| Pensamiento | Realidad |
|---|---|
| "Es un cambio trivial, no hace falta test" | TDD aplica igual: test que falla → código mínimo → verde (Fase 3). Lo simple se vuelve complejo. |
| "Implemento y luego le escribo el test" | El test va PRIMERO y debe fallar por la razón correcta. Código escrito antes del test, se borra y se rehace. |
| "La spec está casi completa, ya empiezo" | Si hay placeholders `_pendiente de /plan_` en criterios o enfoque, niégate y manda a `/plan` (Fase 2). |
| "Commiteo / pusheo / abro la PR y aviso después" | Commit, push y PR solo con aprobación explícita del usuario (Fases 3 y 4). |
| "El enfoque de la spec no encaja, improviso por aquí" | Detente, explica el problema y propón actualizar spec.md ("Decisiones tomadas") antes de desviarte. |
| "Consulto ClickUp para decidir qué implementar" | La fuente de verdad es spec.md, no ClickUp (Fase 3). |
| "Funciona, el test pasa, ya está" | El ciclo es red-green-**refactor**: con la suite en verde, limpia los olores que introdujiste antes de registrar (Fase 3, paso 4; guía código-limpio). |
| "Testeo el estado interno o el método privado para que sea más fácil verificar" | Testea el **comportamiento observable**, no la implementación: un test acoplado al detalle se rompe al refactorizar aunque el comportamiento siga bien (principio de Testing Library; Fase 3, paso 1). |
| "Meto una abstracción/patrón por si acaso o por si escala" | Un patrón se justifica solo si su problema ya existe; anticiparlo es sobre-ingeniería (guía patrones-diseño). |
