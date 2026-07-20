# Historias de usuario — plantilla y procedimiento

Cuando planificas (Fase 4 de `/plan`), los **criterios de aceptación** de `spec.md` son el
corazón del contrato con `/implement`. Esta guía define cómo redactar cada requisito como una
**Historia de Usuario (HU)** para que la HU, el **plan de pruebas** y el **contexto de proceso
de negocio** queden coherentes y trazables entre sí, con una sola fuente de verdad del
comportamiento y sin arrastrar datos de gestión que envejecen mal.

## Principios (no los negocies)

1. **Fuente única del comportamiento.** El comportamiento se describe UNA vez, en la HU. El
   catálogo de requisitos (ERS) y el diseño de pruebas la **referencian**, no la repiten.
   Cambiar un campo debe tocar un solo sitio.
2. **La HU añade quién y para qué.** "El sistema debe permitir…" es un requisito funcional
   (RF) de la ERS, no una HU. La HU aporta el **rol** y el **valor**: sin ellos, no es una HU.
3. **Datos de gestión fuera de la HU.** Programador, iteración, prioridad de desarrollo,
   tiempo estimado/real y riesgo son volátiles: viven en **ClickUp** (la fuente de verdad del
   flujo), no en `spec.md`. La HU describe el requisito estable; ClickUp lleva el seguimiento.
4. **Cada criterio es verificable y tiene su prueba.** Todo criterio de aceptación debe poder
   comprobarse con un test o una acción concreta, y mapea 1:1 con un escenario de prueba (EC).
5. **Trazabilidad de extremo a extremo:** Proceso de negocio → RF (ERS) → HU → Criterio de
   aceptación (CA) → Escenario de prueba (EC).

## Estructura de la HU en `spec.md`

```markdown
## HU-<n>: <Nombre del requisito>

**Requisito (ERS):** RF<n> — <nombre del requisito funcional>
**Proceso de negocio:** <nombre del proceso / subproceso>

### Historia
Como <rol>, quiero <acción o capacidad> para <valor / resultado esperado>.

### Contexto de negocio
- **Objetivo del proceso:** <infinitivo + qué se logra>
- **Evento que la genera:** <qué dispara el proceso>
- **Reglas de negocio aplicables:** <referencia a las reglas, p. ej. RN-3, RN-7>

### Precondiciones
- <estado del sistema, rol autenticado, datos que deben existir antes>

### Datos y comportamientos válidos/no válidos
| Campo | Tipo | Obligatorio | Reglas (longitud, formato, caracteres) | Ejemplo válido |
|---|---|---|---|---|
| <nombre> | <texto/selección/…> | Sí/No | <alfanumérico, máx. 128, …> | <ejemplo> |

### Criterios de aceptación (Given / When / Then)
Cada criterio es verificable y corresponde a un escenario de prueba (ver más abajo).

- **CA-1 — <título>**
  - **Dado** <contexto / precondición>
  - **Cuando** <acción del rol>
  - **Entonces** <resultado observable del sistema>
- **CA-2 — <flujo alterno / error>**
  - **Dado** … **Cuando** … **Entonces** …

### Diseño de casos de prueba (derivado de los CA)
Un escenario (EC) por criterio; combina datos válidos/inválidos con la convención V/I/N/A
(V = válido, I = inválido, N/A = irrelevante para ese caso).

| EC | Criterio | Escenario | Datos (V/I/N/A) | Resultado esperado |
|---|---|---|---|---|
| EC-1.1 | CA-1 | <camino feliz> | <combinación> | <respuesta del sistema> |
| EC-1.2 | CA-2 | <datos incompletos> | <combinación> | <mensaje / vuelta a EC-1.1> |

### Fuera de alcance
- <lo que esta HU explícitamente NO cubre>
```

## Cómo derivar cada sección

1. **Rol y valor.** Identifica el actor real del proceso de negocio (no "usuario" a secas si
   puedes ser específico) y el resultado que persigue. Si no sabes decir el "para qué", vuelve
   al proceso de negocio: probablemente falta entenderlo.
2. **Contexto de negocio.** Sácalo de la Descripción de procesos de negocio: objetivo, evento
   que lo genera y reglas de negocio aplicables. Enlaza, no copies el proceso entero.
3. **Comportamientos válidos/no válidos.** Cada campo con su tipo, obligatoriedad y reglas
   (longitud, formato, caracteres admitidos). Esta tabla alimenta directamente los datos de
   las pruebas.
4. **Criterios Given/When/Then.** Un criterio por comportamiento observable. El flujo central
   es un CA; cada flujo alterno y cada manejo de error (datos incompletos, datos incorrectos,
   cancelar) es su propio CA. Redáctalos en presente y en términos observables desde fuera.
5. **Casos de prueba.** Por cada CA, al menos un EC de camino feliz y los EC de datos
   inválidos que apliquen. Usa la matriz V/I/N/A para cubrir combinaciones de campos sin
   enumerar lo irrelevante.
6. **Trazabilidad.** Al cerrar el spec, rellena la tabla de trazabilidad (abajo) para que no
   quede ningún CA sin EC ni ninguna HU sin RF y proceso de origen.

## Tabla de trazabilidad (al cierre de `spec.md`)

| Proceso de negocio | RF (ERS) | HU | Criterio (CA) | Escenario de prueba (EC) |
|---|---|---|---|---|
| <proceso> | RF<n> | HU-<n> | CA-1 | EC-1.1 |
| | | | CA-2 | EC-1.2 |

## Patrón CRUD (Incluir, Editar, Eliminar, Ver, Listar, Filtrar)

La mayoría de los RF siguen el patrón CRUD y comparten esqueleto de CA y EC. Reutiliza el
molde y ajusta solo los campos y reglas propios de la entidad, en lugar de redactar cada HU
desde cero:

- **Incluir:** camino feliz (crea + mensaje), datos incompletos, datos incorrectos, cancelar.
- **Editar:** muestra datos actuales, actualiza + mensaje, datos incompletos/incorrectos, cancelar.
- **Eliminar:** confirma + elimina, condición que impide eliminar, integridad de datos relacionados.
- **Ver / Listar / Filtrar:** datos mostrados, orden, filtro con y sin resultados.

## Anti-patrones (nómbralos para no caer en ellos)

- **HU que en realidad es un RF** — "El sistema debe permitir…" sin rol ni valor. Añádele el
  "como … quiero … para …" o déjalo en la ERS.
- **Comportamiento duplicado** — describir los mismos campos y flujos en ERS, HU y pruebas.
  Una sola fuente (la HU); las demás referencian.
- **Datos de gestión dentro de la HU** — programador, iteración, tiempos, riesgo. Van en
  ClickUp; en la HU envejecen y mienten.
- **Criterio no verificable** — "debe funcionar correctamente". Todo CA se comprueba con un
  test o una acción concreta.
- **Criterio sin prueba** — un CA sin su EC. Cada criterio necesita al menos un escenario.
- **Solo camino feliz** — sin EC de datos inválidos ni flujos alternos, la HU está a medias.

## Autocrítica antes de cerrar

Relee las HU del spec y pregúntate: **¿cada HU tiene rol y valor? ¿cada CA es verificable y
tiene su EC? ¿la tabla de trazabilidad enlaza Proceso → RF → HU → CA → EC sin huecos? ¿el
comportamiento está descrito en un solo sitio?** Si algo falla, arréglalo antes de escribir
`spec.md`.
