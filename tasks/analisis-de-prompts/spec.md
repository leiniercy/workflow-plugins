# Spec — analisis-de-prompts: comando `/clarify`, análisis de prompts con rúbrica

> Identificador provisional (slug): la tarea se abrió en conversación, sin taskId de ClickUp.
> Al crearla en ClickUp, renombrar a `tasks/<taskId>/`.

## Propósito

Que ninguna respuesta del agente se produzca sin contexto comprobado. `/clarify` toma un prompt
de usuario, pregunta lo que falte (para qué y para quién), separa el problema en partes pequeñas
con instrucciones precisas y valida la respuesta contra una rúbrica de 3 criterios antes de darla
por buena. Si un criterio falla, indica qué mantener y qué cambiar, y re-evalúa.

## Contexto

El usuario definió en conversación (23/10/2026) un protocolo de trabajo con IA que hoy no está
codificado en ninguna parte del plugin:

- **No empezar sin contexto**: contexto, intención, restricciones y criterio antes de responder.
- **Separar el problema** en partes pequeñas, con instrucciones precisas para cada una.
- **Rúbrica de 3 criterios** que garantice utilidad, con bucle de corrección: identificar qué no
  cumplió, qué mantener, qué cambiar y re-evaluar hasta pasar.
- **Sesgos a vigilar**: representación, confirmación y omisión («¿quién falta en este análisis?
  ¿qué versión no estoy escuchando?»).
- **4 preguntas de evaluación**: ¿Es precisa? ¿Está completa? ¿Tiene sesgos? ¿Sirve para mi
  contexto?
- **Datos sensibles**: si el prompt trae datos personales, financieros o de contratos, avisar y
  exigir anonimización o consentimiento explícito antes de seguir.
- **Multi-rol**: ver el problema desde varios ángulos (desarrollador, matemático, científico,
  diseñador de videojuegos, analista de comportamiento, cliente) y preguntar la información
  indispensable que el usuario quizá no está teniendo en cuenta.

Ningún comando actual cubre esto: `/define` convierte intención en tareas, pero no analiza un
prompt suelto ni valida la respuesta contra una rúbrica.

## Criterios de aceptación

- [ ] **A1** — Existe `/clarify` con su tabla de «Banderas rojas».
- [ ] **A2** — `/clarify` no empieza a trabajar sin los cuatro campos (contexto, intención,
      restricciones, criterio): con `evidencia-y-preguntas` decide qué se verifica, qué se asume
      declarándolo y qué se pregunta, y pregunta antes de continuar.
- [ ] **A3** — Si el prompt trae datos personales, financieros o de contratos, `/clarify` se
      detiene y exige anonimización o autorización explícita (`proteccion-de-datos`).
- [ ] **A4** — `/clarify` separa el problema en partes pequeñas (máximo 5) con instrucciones
      precisas para cada una; si no caben en 5, vuelve a acotar.
- [ ] **A5** — `/clarify` evalúa la respuesta contra una rúbrica de exactamente 3 criterios
      (precisión, completitud, ausencia de sesgos — representación, confirmación, omisión), con
      las 4 preguntas del protocolo y veredicto explícito por criterio.
- [ ] **A6** — Con algún criterio en rojo, `/clarify` dice qué mantener y qué cambiar y
      re-evalúa; el bucle termina solo con los 3 criterios en verde o parada del usuario.
- [ ] **A7** — `/clarify` no escribe en el repo: su artefacto es la respuesta en la conversación.
- [ ] **A8** — `node scripts/sync.mjs` genera el comando en ambos adaptadores y la suite de
      checks pasa en verde.

## Alcance

El comando `/clarify` (prosa en `core/workflows/clarify.md`), su entrada en `COMMANDS` de
`scripts/sync.mjs` y el esqueleto de tarea en `tasks/analisis-de-prompts/`.

## Fuera de alcance

- **Aserciones nuevas en `check-behavior.mjs`** sobre `/clarify` (rúbrica, contexto, «no
  escribe»). El check vigila hoy a los 7 comandos existentes; añadir el octavo a la lista es
  tarea aparte una vez estabilizada la prosa.
- **Documentar el comando en `README.md` y `CHANGELOG.md`.** Entran con la release.
- **Análisis multi-rol automatizado.** La prosa lo pide como técnica de pensamiento; no hay
  despacho de subagentes por rol.
- **Integración con ClickUp.** El comando no toca tareas: analiza prompts.

## Enfoque técnico

### Un comando de prosa, sin código nuevo

Igual que el resto de comandos: markdown en `core/workflows/clarify.md` más entrada en
`COMMANDS`. Sin `allowed-tools` a propósito: no toca ficheros, solo lee y conversa (mismo
criterio que `/setup`, donde pre-aprobar le quitaría el prompt al único paso que lo necesita).
En OpenCode corre como `build`, como el resto de comandos que no son solo-lectura puros.

### La rúbrica vive en la prosa del comando

Tres criterios fijos —precisión, completitud, ausencia de sesgos— y las cuatro preguntas del
protocolo. El ajuste al contexto («¿sirve para mi contexto?») se evalúa dentro de Completitud:
la respuesta debe citar qué parte responde a cada campo de contexto recogido. El bucle de
corrección es explícito: veredicto por criterio → qué mantener → qué cambiar → re-evaluar, con
límite (dos rojos del mismo criterio = problema mal delimitado, vuelta a la Fase 1).

### Los sesgos se nombran, no se dice «sesgo» a secas

Representación (¿quién falta?), confirmación (¿solo lo que confirma?) y omisión (¿qué versión no
se está escuchando?). Nombrarlos en la prosa evita que «sin sesgos» sea una casilla que siempre
se marca verde.

## Áreas afectadas

**`core/` — fuente de verdad:**

| Fichero | Cambio |
|---|---|
| `core/workflows/clarify.md` | nuevo |
| `scripts/sync.mjs` | entrada `clarify` en `COMMANDS` |

**Generado por `sync.mjs`** (no editar a mano): `plugins/backbone/claude/commands/clarify.md` y
`plugins/backbone/opencode/.opencode/command/clarify.md`.

**No se toca:** guías, agentes, hooks, `routing.json`.

## Dependencias

- Ninguna externa. Usa dos guías existentes: `evidencia-y-preguntas` y `proteccion-de-datos`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El bucle de rúbrica entra en bucle infinito | Límite escrito: termina con los 3 criterios en verde o cuando el usuario lo pare; dos rojos del mismo criterio = volver a la Fase 1 |
| «¿Sirve para mi contexto?» es subjetivo y siempre puede decirse que sí | Se evalúa dentro de Completitud con cita obligatoria: qué parte responde a qué campo de contexto |
| Preguntar demasiado contexto aburre | `evidencia-y-preguntas` ya decide qué se verifica, qué se asume y qué se pregunta: solo se pregunta lo que no está en ninguna fuente |
| Un comando sin aserciones en `check-behavior` se degrada sin aviso | Fuera de alcance hoy, anotado como tarea siguiente |

## Decisiones tomadas

**1. Un comando, no una guía.** El usuario pidió un procedimiento que se ejecuta al recibir un
prompt: es un verbo del flujo, no conocimiento de referencia. Las guías son saberes que se
auto-activan; esto es una fase con contrato propio.

**2. No escribe en el repo.** Su artefacto es la respuesta validada en la conversación. Si algo
merece tarea, el usuario la crea con `/define`; que `/clarify` creara tareas duplicaría su papel.

**3. Rúbrica de 3 criterios exactos, no una lista abierta.** Las 4 preguntas del protocolo se
reparten así: precisión y completitud son criterios; los sesgos son el tercer criterio, y «¿sirve
para mi contexto?» se evalúa dentro de Completitud contra los campos de contexto recogidos en la
Fase 1.
