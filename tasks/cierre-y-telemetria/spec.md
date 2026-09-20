# Spec — cierre-y-telemetria: comando `/close` y telemetría de flujo

> Identificador provisional. El conector de ClickUp no alcanza el workspace desde la sesión
> que redactó esta spec (tres endpoints, tres fallos), así que la carpeta usa un slug. Al
> crear la tarea en ClickUp, renombrar a `tasks/<taskId>/`.

## Propósito

Cerrar el ciclo del flujo con un comando `/close` que valide el cumplimiento antes de cerrar,
y hacer que el plugin genere un dataset de flujo utilizable —llegada y salida por tarea— que
hoy no produce.

## Contexto

El análisis de cuatro fuentes contra las guías del plugin (ver «Decisiones tomadas») señaló
que `progress.md` registra marcas de tiempo por fase y que `estados-tareas.md` gobierna las
transiciones con un dueño único cada una. Sobre el papel, eso es el dataset que *Actionable
Agile Metrics* (Vacanti) pide: la fecha en que cada ítem entra a cada estado, con un mínimo
indispensable de fecha de llegada y fecha de salida.

**Medido sobre las 37 tareas de `biomas_frontend`, el papel no se sostiene:**

| Métrica | Valor |
|---|---|
| Tareas sin `progress.md` | 14 de 37 (38 %) |
| Tareas con par `start` + `review` | **2** |
| Entradas de historial con `HH:MM` | 113 de 304 (37 %) |
| Entradas con fase canónica | 195 de 304 (64 %) |

Las dos únicas tareas con datos completos se llaman `wdp7ewz2h3` y `wdp7ewz2f3` —ids de
ClickUp—; las otras 35 usan slugs. Es decir: solo las que pasaron por `/start` tienen
telemetría.

**Causa raíz.** `/start` hace dos cosas pegadas: prepara el entorno (rama y transición de
ClickUp) y crea el esqueleto `tasks/<taskId>/`. Cuando la tarea ya está definida, la primera
sobra y se omite el comando entero — perdiendo la segunda sin quererlo. La telemetría vive
dentro de un comando que se omite por razones ajenas a la telemetría.

**Segundo hueco.** No existe fase `complete`: `registro-progreso.md` acota
`<fase> ∈ {start, plan, implement, review}` y `estados-tareas.md` declara que ningún comando
cierra tareas. Sin marca de salida no hay cycle time, aunque la llegada esté registrada.

## Criterios de aceptación

- [ ] **A1** — `/plan` crea `tasks/<taskId>/` si no existe, sin recrear nada si ya existe.
- [ ] **A2** — `/implement` hace lo mismo que A1.
- [ ] **A3** — Cuando `/plan` o `/implement` crean el esqueleto sin `/start` previo, la primera
      entrada marca la llegada como **inferida**, sin inventar la hora de inicio real.
- [ ] **A4** — `registro-progreso.md` admite la fase `complete` y define los campos
      `**Salida:**` (motivo) y la marca de llegada inferida.
- [ ] **A5** — Existe `/close` y su tabla de «Banderas rojas» (exigida por `check-behavior`).
- [ ] **A6** — `/close` rechaza cerrar si algún criterio está **no cumplido**, sin que ninguna
      aprobación humana pueda saltarse ese gate. Un criterio **no verificable desde el diff**
      no bloquea: se lista aparte y exige que el usuario lo reconozca explícitamente antes de
      seguir.
- [ ] **A7** — `/close` escribe la entrada de fase `complete` con la fecha real del sistema y
      el motivo de salida.
- [ ] **A8** — `/close` propone la transición `review → complete` y la ejecuta **solo** tras
      aprobación explícita; si el MCP de ClickUp falta, indica hacerlo a mano y no bloquea.
- [ ] **A9** — `/close` admite salida por **abandono**, en cuyo caso no aplica el gate de
      cumplimiento y exige el motivo en una línea.
- [ ] **A10** — `estados-tareas.md` refleja que `review → complete` es responsabilidad
      exclusiva de `/close`.
- [ ] **A11** — El ámbito de escritura de `/close` es únicamente
      `tasks/<taskId>/progress.md`: ni código, ni `spec.md`.
- [ ] **A12** — `/review` queda intacto: su `allowed-tools` sigue sin `Edit` ni `Write`.
- [ ] **A13** — `node scripts/sync.mjs` genera el comando en ambos adaptadores y la suite de
      checks de CI pasa en verde.

## Alcance

Fases 1 y 2 del enfoque acordado: esqueleto idempotente con llegada honesta, y el comando
`/close` con su gate de cumplimiento y su sello de salida.

## Fuera de alcance

- **Percentiles, scatterplot y CFD dentro del plugin.** Con n=2 sería teatro. El plugin genera
  datos limpios; graficarlos es de otra herramienta. Es la fase 3, y espera a tener muestra.
- **Medir el tiempo bloqueado.** `registro-progreso.md` ordena borrar la sección `## Bloqueo`
  al resolverla, así que la duración es hoy irrecuperable por diseño. Es un hueco real —el
  *aging* es el disparador de intervención de Vacanti— pero es otra tarea.
- **Reparar el pasado.** Las 14 tareas sin `progress.md` y las 21 sin par completo se quedan
  sin datos. La muestra crece desde la próxima tarea.
- **Un comando `/verify` aparte.** Ver «Decisiones tomadas».

## Enfoque técnico

### Se sella la transición de estado, no la invocación del comando

Los estados del flujo son los de ClickUp, no los comandos. Cada transición ya tiene un dueño
único, y ahí es donde se pone la marca:

| Transición | Dueño | Papel en el dataset |
|---|---|---|
| `to do → in progress` | `/start` | **llegada** (commitment point) |
| `in progress → review` | `/implement`, al crear la PR | estado intermedio |
| `review → complete` | **`/close`** | **salida** |

`/plan` y `/review` no sellan: son actividad *dentro* de un estado. Esto resuelve por
construcción la restricción de `/review`, que no puede escribir.

### La llegada tardía se marca, no se inventa

Si `/implement` crea el esqueleto sin `/start` previo, no sabe cuándo empezó el trabajo.
Registrar la hora actual como llegada sería escribir un dato no comprobado, contra el
principio rector del plugin. La entrada lo declara:

```markdown
### 2026-09-20 14:30 — implement

- **Resultado:** esqueleto creado (sin /start previo)
- **Llegada:** inferida — el trabajo empezó antes de este sello
```

Una llegada inferida vale como cota inferior y se filtra después. Es la estrategia de Vacanti
para datos sucios: etiquetar y filtrar, nunca descartar ni falsificar.

### Contrato de `/close`

```yaml
argument-hint: "[taskId (opcional: se infiere de la rama actual)]"
allowed-tools: Read, Glob, Grep, Edit, Write, Agent,
               Bash(git diff:*), Bash(git log:*), Bash(git status:*),
               Bash(gh pr view:*)
```

1. **Resolución del taskId** — argumento, o inferido de la rama (patrón de los otros tres).
2. **Pre-flight** — la tarea debe estar en `review`; si no, detente y enruta según
   `estados-tareas.md`. Comprueba si la PR existe y está mergeada; si no, dilo y pregunta.
3. **Gate de cumplimiento** — despacha `revisor-spec-tests` contra `spec.md` y el diff.
   Veredicto por criterio: cumplido / no cumplido / no verificable. Con alguno en rojo,
   informa y **detente**.
4. **Sello de salida** — entrada de fase `complete` con fecha real del sistema y `**Salida:**`.
5. **Transición** — propón `review → complete`; ejecuta solo tras aprobación explícita.
   Degrada sin bloquear si falta el MCP.
6. **Banderas rojas** — tabla obligatoria.

### Salida por abandono

El supuesto 2 de la ley de Little exige que todo trabajo empezado salga del sistema; una tarea
abandonada como WIP eterno envenena los cálculos. `/close` acepta dos motivos:

```markdown
- **Salida:** completada
- **Salida:** abandonada — requisito retirado por producto
```

En abandono no aplica el gate de cumplimiento. Si el estado de destino en ClickUp no está en la
tabla de `estados-tareas.md`, manda la **Regla de oro**: no inventar el mapeo, preguntar. El
sello local se escribe igual.

## Áreas afectadas

**`core/` — fuente de verdad:**

| Fichero | Cambio |
|---|---|
| `core/workflows/close.md` | nuevo |
| `core/guides/estados-tareas.md` | `review → complete` pasa a `solo /close`; salida por abandono |
| `core/guides/registro-progreso.md` | fase `complete`; campos `**Salida:**` y llegada inferida; anti-patrones |
| `core/workflows/plan.md`, `implement.md` | esqueleto idempotente + llegada inferida |

**`scripts/`:** una entrada en la tabla de descripciones de `sync.mjs`; `"close"` en la lista
de `check-behavior.mjs:52`.

**Generado por `sync.mjs`** (no editar a mano): `adapters/claude/commands/close.md` y
`adapters/opencode/.opencode/command/close.md`.

**A mano:** `adapters/claude/hooks/session-context.js` — tras la revisión, sugerir `/close`.

**Versión:** 0.19.0 → 0.20.0 (`scripts/bump-version`).

**No se toca:** `routing.json` (sus 8 casos son pares de guías, no comandos), `/review`,
`check-routing`, `check-hooks`, `check-hygiene`, `check-graders`.

## Dependencias

- `revisor-spec-tests` (ya existe, read-only) — el gate de cumplimiento lo reutiliza.
- MCP de ClickUp para la transición. **No bloqueante:** degrada a instrucción manual.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El gate de cumplimiento genera falsos rojos y la gente deja de usar `/close` | El veredicto distingue «no cumplido» de «no verificable desde el diff»; solo el primero bloquea |
| Cambiar el invariante de `estados-tareas.md` se lee como que el agente cierra solo | La aprobación explícita se mantiene, igual que en las otras dos transiciones; queda escrito en la guía y en las Banderas rojas |
| El esqueleto idempotente crea carpetas en repos que no usan el flujo | Solo se crea cuando el comando ya opera sobre un `taskId` resuelto |
| La muestra tarda en crecer y la fase 3 se pospone indefinidamente | Asumido y declarado: la fase 3 depende de datos, no de código |

## Decisiones tomadas

**1. Un solo comando nuevo, no dos.** Se pidieron un validador de cumplimiento y un cerrador.
El validador ya existe: es la dimensión 1 de `/review`, ejecutada por `revisor-spec-tests`. Un
`/verify` aparte duplicaría esa pregunta, y dos comandos que responden lo mismo acaban
respondiendo distinto. El cumplimiento se convierte en **la puerta de `/close`**, porque cerrar
sin validar no debería ser posible.

**2. Sellar transiciones y no invocaciones.** Alternativa descartada: que cada comando añadiera
su entrada. Habría exigido que `/review` escribiese, rompiendo un contrato que `check-behavior`
vigila contra el artefacto publicado.

**3. La llegada inferida se marca en vez de estimarse.** Descartado usar la hora de creación del
esqueleto como llegada real: sería un dato inventado.

**4. Origen del análisis.** *Actionable Agile Metrics for Predictability* (Vacanti) —métricas de
flujo, supuestos de la ley de Little, aging— e *Implementing Service Level Objectives* (Hidalgo).
Se descartaron como fuentes el capítulo 1 suelto de Khorikov (la guía de pruebas ya cubre su
contenido) y el fichero de *Explore It!*, que resultó ser un resumen de terceros y no el libro.
