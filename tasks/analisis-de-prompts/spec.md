# Spec — analisis-de-prompts: estudio del protocolo de trabajo con IA y comando `/clarify`

> Identificador provisional (slug): la tarea se abrió en conversación, sin taskId de ClickUp.
> Al crearla en ClickUp, renombrar a `tasks/<taskId>/`. El alcance real lo fija el estudio del
> 23/10/2026 (ver Contexto y Decisiones 4–7): este fichero es su registro, no un documento aparte.

## Propósito

Estudiar el protocolo completo de trabajo con IA que definió el usuario —los cuatro campos de
contexto, la rúbrica de 3 criterios con bucle, los sesgos, el análisis multi-rol, la política de
datos sensibles y la familia XDD (SDD, ODD, TDD, CDD, SSD, BDD, DDD, ATDD, EDD, PDD, GitOps)—,
decidir **dónde encaja en backbone y si mejora procesos**, y materializar solo lo que de verdad
faltaba: el comando `/clarify` y dos micro-huecos. Que ninguna respuesta del agente se produzca
sin contexto comprobado y que ninguna pieza del estudio duplique un mecanismo que ya existe.

## Contexto

El usuario definió en conversación (23/10/2026) un protocolo de trabajo con IA que hoy no estaba
codificado en ninguna parte del plugin:

- **No empezar sin contexto**: contexto, intención, restricciones y criterio antes de responder.
- **Separar el problema** en partes pequeñas, con instrucciones precisas para cada una.
- **Rúbrica de 3 criterios** con bucle de corrección: identificar qué no cumplió, qué mantener,
  qué cambiar y re-evaluar hasta pasar.
- **Sesgos a vigilar**: representación, confirmación y omisión («¿quién falta en este análisis?
  ¿qué versión no estoy escuchando?»).
- **4 preguntas de evaluación**: ¿Es precisa? ¿Está completa? ¿Tiene sesgos? ¿Sirve para mi
  contexto?
- **Datos sensibles**: si el prompt trae datos personales, financieros o de contratos, avisar y
  exigir anonimización o consentimiento explícito antes de seguir.
- **Multi-rol**: ver el problema desde varios ángulos (desarrollador, matemático, científico,
  diseñador de videojuegos, analista de comportamiento, cliente) y preguntar la información
  indispensable que el usuario quizá no está teniendo en cuenta.

**El estudio** (23/10/2026) analizó ese contenido contra las guías y comandos del plugin y
llegó a dos conclusiones que fijan el alcance de esta tarea:

1. **La mayoría ya vivía en backbone** — SDD, ODD, TDD, BDD, ATDD, GitOps y SSD son mecanismos
   existentes con otro nombre (ver Decisión 5). El riesgo del contenido no era la falta de
   piezas, era la duplicación: dos piezas que responden lo mismo acaban respondiendo distinto.
2. **El único hueco real era conversacional** — el protocolo de calidad de respuestas — y ahí
   nace `/clarify`. Un análisis posterior multi-rol destapó cinco refinamientos (C1–C7, Decisión
   4): stakes proporcionales, veredicto con evidencia, registro del bucle, roles con pregunta
   fija + pre-mortem, anonimización activa, medición del protocolo y desacuerdo.

## Criterios de aceptación

- [ ] **A1** — Existe `/clarify` con su tabla de «Banderas rojas».
- [ ] **A2** — `/clarify` no empieza a trabajar sin los cuatro campos (contexto, intención,
      restricciones, criterio) cuando los stakes lo piden: con `evidencia-y-preguntas` decide qué
      se verifica, qué se asume declarándolo y qué se pregunta, y pregunta antes de continuar.
- [ ] **A3** — Si el prompt trae datos personales, financieros o de contratos, `/clarify` hace
      stop-the-line: aplica la plantilla de anonimización (`Cliente-1`, `MONTO-1`, `Fecha-1`) y
      advierte de que la reidentificación puede ocurrir por combinación de valores, no solo por
      nombres. Solo sigue con anonimización o autorización explícita (`proteccion-de-datos`).
- [ ] **A4** — `/clarify` separa el problema en partes pequeñas (máximo 5) con instrucciones
      precisas para cada una; si no caben en 5, vuelve a acotar.
- [ ] **A5** — `/clarify` evalúa la respuesta contra una rúbrica de exactamente 3 criterios
      (precisión, completitud, ausencia de sesgos — representación, confirmación, omisión), con
      las 4 preguntas del protocolo y **veredicto con evidencia**: cita de la parte que respalda
      cada veredicto y respuesta a «¿qué haría falta para que saliera rojo?»; un verde sin cita
      no cuenta. «¿Sirve para mi contexto?» vive en Completitud, anclada al campo Criterio.
- [ ] **A6** — Con algún criterio en rojo, `/clarify` dice qué mantener y qué cambiar, deja
      registro de la vuelta (criterio, qué se mantuvo, qué se cambió) y re-evalúa; con 2 rojos
      del mismo criterio vuelve a la Fase 1; el bucle termina solo con los 3 criterios en verde
      o parada del usuario.
- [ ] **A7** — `/clarify` no escribe en el repo: su artefacto es la respuesta en la conversación.
- [ ] **A8** — `node scripts/sync.mjs` genera el comando en ambos adaptadores y la suite de
      checks pasa en verde.
- [ ] **A9** — `/clarify` clasifica el prompt por **stakes** (trivial / normal / crítico) antes
      de aplicar el protocolo y declara el nivel con su motivo: trivial = contexto de una línea
      sin rúbrica; normal = protocolo completo; crítico = protocolo completo + pre-mortem.
- [ ] **A10** — El análisis multi-rol de `/clarify` usa 6 roles con una **pregunta canónica**
      cada uno (no opinión libre), y el pre-mortem («¿por qué falló esto dentro de un mes?») es
      obligatorio solo en stakes crítico.
- [ ] **A11** — La salida de `/clarify` cierra con la **medición del protocolo**: vueltas de
      bucle y veredictos rojo→verde; si salió toda verde a la primera, lo dice en voz alta.
- [ ] **A12** — En desacuerdo de veredicto entre usuario y agente, **gana el usuario** y el
      motivo queda registrado en la salida.
- [ ] **A13** — El **estudio** queda registrado en «Decisiones tomadas» de esta spec con su
      veredicto por pieza (adoptado de facto / suficiente / adoptado nuevo / rechazado con
      argumento), incluidos los rechazos de CDD, EDD y la «constitución».
- [ ] **A14** — `/plan` abre su propuesta con el paso de **clarificación** (SDD paso 3): caza
      ambigüedades, contradicciones y huecos (para qué, para quién) antes de escribir criterios.
- [ ] **A15** — `proteccion-de-datos` lleva la **regla transversal de conversación**: ante datos
      personales, financieros o de contratos pegados en el chat, stop-the-line con plantilla de
      anonimización y aviso de reidentificación por combinación.

## Alcance

El estudio registrado en esta spec; el comando `/clarify` (prosa en `core/workflows/clarify.md`,
v2 con C1–C7); su entrada en `COMMANDS` de `scripts/sync.mjs`; el paso de clarificación en
`core/workflows/plan.md`; la regla 9 en `core/guides/proteccion-de-datos.md`; y el esqueleto de
tarea en `tasks/analisis-de-prompts/`.

## Fuera de alcance

- **Documento aparte para el estudio.** La tabla de encaje vive condensada en «Decisiones
  tomadas» (Decisión 7); un documento propio duplicaría y divergiría.
- **CDD, EDD y la «constitución» como artefacto único.** Rechazados con argumento (Decisión 5).
- **Aserciones nuevas en `check-behavior.mjs`** sobre `/clarify` y sus casos en
  `docs/eval-comportamiento.md`. Tarea siguiente, una vez estabilizada la prosa.
- **Documentar el comando en `README.md` y `CHANGELOG.md`.** Entran con la release.
- **Análisis multi-rol automatizado con subagentes por rol.** La prosa lo pide como técnica de
  pensamiento con pregunta fija por rol; no hay despacho.
- **Integración con ClickUp.** El comando no toca tareas: analiza prompts.

## Enfoque técnico

### Un comando de prosa, sin código nuevo

Igual que el resto de comandos: markdown en `core/workflows/clarify.md` más entrada en
`COMMANDS`. Sin `allowed-tools` a propósito: no toca ficheros, solo lee y conversa (mismo
criterio que `/setup`). En OpenCode corre como `build`, como el resto de comandos que no son
solo-lectura puros.

### La rúbrica vive en la prosa del comando, con evidencia obligatoria

Tres criterios fijos —precisión, completitud, ausencia de sesgos— y las cuatro preguntas del
protocolo. Todo veredicto cita la parte que lo respalda y responde a la inversión («¿qué haría
falta para que fuera rojo?»): la técnica *consider the opposite* contra la complacencia del
evaluador. El ajuste al contexto («¿sirve para mi contexto?») se evalúa dentro de Completitud,
anclada al campo Criterio. El bucle deja registro y tiene condición de parada escrita.

### El rigor es proporcional a los stakes

Fase 0 de `/clarify`: clasificar trivial / normal / crítico antes de aplicar nada. Un protocolo
completo sobre un prompt trivial mata el protocolo por fricción; su ausencia en una decisión
crítica mata la decisión. Los checklists que funcionan (medicina, aviación) son cortos y tienen
puntos de stop-the-line, no veinte casillas.

### Los sesgos se nombran y el evaluador se vigila a sí mismo

Representación (¿quién falta?), confirmación (¿solo lo que confirma?) y omisión (¿qué versión no
se está escuchando?), más el sesgo del propio evaluador: una rúbrica toda verde sin evidencia es
decoración, y la salida lo dice.

### Los micro-huecos se resuelven en lo que ya existe

El paso de clarificación entra en la Fase 4 de `/plan` (abre la propuesta; sin comando nuevo),
y la regla de conversación entra como regla 9 de `proteccion-de-datos` — que ya declara que
mandar datos personales a un tercero (incluido un modelo de lenguaje) es decisión del usuario:
pegarlos en el chat es esa regla ocurriendo en vivo.

## Áreas afectadas

**`core/` — fuente de verdad:**

| Fichero | Cambio |
|---|---|
| `core/workflows/clarify.md` | nuevo (v2 con C1–C7) |
| `core/workflows/plan.md` | paso de clarificación al abrir la Fase 4 |
| `core/guides/proteccion-de-datos.md` | regla 9: stop-the-line con datos sensibles en conversación; compartida con voice |
| `scripts/sync.mjs` | entrada `clarify` en `COMMANDS` |

**Generado por `sync.mjs`** (no editar a mano): `plugins/backbone/claude/commands/clarify.md`,
`plugins/backbone/opencode/.opencode/command/clarify.md` y los regenerados de los tocados.

**No se toca:** agentes, hooks, `routing.json`.

## Dependencias

- Ninguna externa. Usa dos guías existentes: `evidencia-y-preguntas` y `proteccion-de-datos`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El bucle de rúbrica entra en bucle infinito | Límite escrito: 2 rojos del mismo criterio = problema mal delimitado, vuelta a la Fase 1; termina en verde o parada del usuario |
| «¿Sirve para mi contexto?» es subjetivo y siempre puede decirse que sí | Se evalúa dentro de Completitud con cita obligatoria anclada al campo Criterio |
| El rigor proporcional se usa para saltarse el protocolo siempre | El nivel de stakes se declara con su motivo; en duda, el nivel mayor |
| La rúbrica se vuelve decorativa por complacencia del evaluador | Evidencia citada obligatoria + «¿qué haría falta para que fuera rojo?» + medición en la salida (A11) |
| El paso de clarificación de `/plan` añade fricción | `evidencia-y-preguntas` decide qué se pregunta; solo lo que no está en ninguna fuente |
| Un comando sin aserciones en `check-behavior` se degrada sin aviso | Fuera de alcance hoy, anotado como tarea siguiente |
| Los veredictos del estudio se olvidan y alguien propone CDD o la «constitución» en 6 meses | Quedan escritos con su argumento en la Decisión 5 |

## Decisiones tomadas

**1. Un comando, no una guía.** El protocolo se ejecuta al recibir un prompt: es un verbo del
flujo, no conocimiento de referencia. Las guías son saberes que se auto-activan; esto es una fase
con contrato propio.

**2. No escribe en el repo.** Su artefacto es la respuesta validada en la conversación. Si algo
merece tarea, el usuario la crea con `/define`; que `/clarify` creara tareas duplicaría su papel.

**3. Rúbrica de 3 criterios exactos, no una lista abierta.** Las 4 preguntas del protocolo se
reparten así: precisión y completitud son criterios; los sesgos son el tercer criterio, y «¿sirve
para mi contexto?» se evalúa dentro de Completitud contra los campos de contexto recogidos en la
Fase 1.

**4. Stakes proporcionales y veredicto con evidencia (superan al rigor uniforme de la v1).**
El análisis multi-rol del 23/10/2026 destapó dos eslabones débiles de la primera versión: aplicar
el mismo rigor a todo prompt (fricción → abandono) y veredictos sin evidencia obligatoria
(rúbrica decorativa por complacencia del evaluador). Sustituyen a la lectura uniforme de A1–A8:
stakes (A9), evidencia citada + «¿qué haría falta para que fuera rojo?» (A5), registro del bucle
con condición de parada (A6), roles con pregunta canónica + pre-mortem (A10), anonimización
activa con aviso de reidentificación por combinación (A3), medición del protocolo (A11) y
desacuerdo: gana el usuario (A12).

**5. El estudio: la mayoría ya vivía en backbone; se adopta lo conversacional y se rechaza lo que
duplicaría.** Veredicto por pieza (23/10/2026):
- **Adoptados de facto — no se añade nada:** SDD (spec → /plan → /implement → /review → /close,
  con el loop al paso 1 como modo corrección), ODD (criterios de aceptación como resultado
  esperado, gate de /close con veredicto), TDD (/implement criterio a criterio; guías
  `niveles-y-tipos-de-prueba` y `codigo-limpio`), BDD (Given/When/Then en /define),
  ATDD (criterios antes de implementar + `revisor-spec-tests`), GitOps (core/ única fuente de
  verdad + sync.mjs + check-sync contra el drift) y SSD/DevSecOps (`revisor-bugs-seguridad` con
  OWASP, `proteccion-de-datos`, `SECURITY.md`, `check-hygiene`, suite check-*) como pipeline.
- **Suficientes con lo existente:** DDD (`modelado-de-negocio` + fronteras de `arquitectura`) y
  PDD (`valor-y-prioridad` + telemetría de flujo de la tarea `cierre-y-telemetria`, que espera
  muestra — no duplicarla).
- **Adoptado nuevo:** el protocolo conversacional completo → `/clarify`, el único hueco real.
- **Rechazados con argumento:** **CDD** (fuera de foco: el producto del plugin no es frontend;
  Storybook es decisión de stack del consumidor, y `usabilidad-accesibilidad` +
  `patrones-diseno` cubren lo razonable), **EDD** (fuera de foco para un plugin de flujo de
  trabajo) y la **«constitución» como artefacto único** (duplicaría ADRs, SECURITY.md y los
  gates; divergirían — la constitución ya existe, distribuida y verificada por check-*).

**6. Dos micro-huecos adoptados, en lo que ya existe (23/10/2026).** Paso de clarificación de
ambigüedades al abrir la propuesta de `/plan` (SDD paso 3: escribir criterios sobre una
ambigüedad solo mueve el error a la implementación) y regla 9 transversal en
`proteccion-de-datos` (stop-the-line ante datos sensibles pegados en la conversación: la regla 6
de esa guía — mandar datos a un tercero es decisión del usuario — ocurriendo en vivo).

**7. El estudio se registra aquí, no en documento aparte (23/10/2026, decisión del usuario).**
La tabla de encaje vive condensada en estas Decisiones; un documento propio en `docs/` sería una
tercera copia de lo que ya dicen las guías, y divergiría.

**8. Revisión con brainstorming de superpowers (24/10/2026): cuatro hallazgos, cuatro arreglos.**
El checklist del skill (placeholders, consistencia, alcance, ambigüedad + YAGNI) sobre toda la
tarea destapó: **(a)** la regla 9 podía no activarse nunca fuera de `/clarify` — la `description`
de la guía (su gatillo de auto-activación) solo hablaba de decisiones de diseño —; arreglo:
description con el gatillo de conversación, comprimida a ≤ 500 caracteres que exige
`check-behavior`. **(b)** Ambigüedad en la Fase 0: qué fases aplica un prompt trivial, y el gate
de datos sensibles debe valer en los tres niveles (A3 no distingue stakes); arreglo: dos líneas
en `clarify.md`. **(c)** La `description` de `clarify` en `COMMANDS` seguía en v1; actualizada
(stakes, evidencia, desacuerdo). **(d)** La regla 9 no llegaba a `voice`, que maneja datos de
cliente; arreglo: `packages: ["backbone", "voice"]` en la guía (novena compartida). El enrutado
mejoró con las descriptions nuevas (rank-1 53,1 % → 55,2 % en `check-routing`); los seis roles y
el pre-mortem solo en crítico pasan el YAGNI sin cambios.
