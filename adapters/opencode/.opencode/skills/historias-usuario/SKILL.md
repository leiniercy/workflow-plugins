---
name: historias-usuario
description: "Úsala al definir los criterios de aceptación de una tarea en /plan, al diseñar sus casos de prueba, y siempre que redactes o revises una historia de usuario o su trazabilidad con el proceso de negocio. Síntomas: criterios vagos o no verificables, casos de prueba elegidos a ojo, un requisito sin rol ni valor claros."
---
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
Un EC por criterio como mínimo, derivado con técnicas de caja negra (ver "Técnicas de diseño
de casos de prueba"): clases de equivalencia válidas/inválidas y valores límite, anotados con
la convención V/I/N/A (V = válido, I = inválido, N/A = irrelevante para ese caso).

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
5. **Casos de prueba.** Por cada CA, aplica la técnica de caja negra que le toque por su forma
   (ver "Técnicas de diseño de casos de prueba"): al menos un EC de camino feliz, un EC por
   clase de equivalencia inválida y un EC en cada valor límite del campo. Usa la matriz V/I/N/A
   para cubrir combinaciones sin enumerar lo irrelevante (es una tabla de decisión); si las
   combinaciones explotan, redúcelas con pruebas por pares.
6. **Trazabilidad.** Al cerrar el spec, rellena la tabla de trazabilidad (abajo) para que no
   quede ningún CA sin EC ni ninguna HU sin RF y proceso de origen.

## Tabla de trazabilidad (al cierre de `spec.md`)

| Proceso de negocio | RF (ERS) | HU | Criterio (CA) | Escenario de prueba (EC) |
|---|---|---|---|---|
| <proceso> | RF<n> | HU-<n> | CA-1 | EC-1.1 |
| | | | CA-2 | EC-1.2 |

## Técnicas de diseño de casos de prueba (caja negra)

La matriz V/I/N/A no es arbitraria: es partición de equivalencia y tabla de decisión sin
nombrarlas. **Nombrar la técnica** que aplicas hace el diseño sistemático y te da un criterio
de cuándo has cubierto lo suficiente —no solo el camino feliz—. Elige la técnica por la forma
del CA y combínalas cuando haga falta. Basado en ISTQB (Foundation Level) e ISO/IEC/IEEE
29119-4 (técnicas de diseño de pruebas).

| Técnica | Cuándo aplicarla | Cobertura mínima (qué EC genera) |
|---|---|---|
| **Partición de equivalencia** | El campo admite clases de valores que el sistema trata igual | Un EC por clase: un representante de cada partición válida y de cada inválida. Es la base de la columna V/I |
| **Valores límite (BVA)** | El campo tiene rango o umbral (longitud, edad, importe, fechas) | Un EC en cada borde y su vecino: mín-1, mín, máx, máx+1. Ahí se concentran los defectos |
| **Tabla de decisión** | El resultado depende de combinar varias condiciones o reglas de negocio | Un EC por regla (combinación de condiciones → acción). La matriz V/I/N/A ES una tabla de decisión |
| **Transición de estados** | La entidad tiene estados y transiciones (borrador→enviado→aprobado; sesión, carrito) | Un EC por transición válida + los intentos de transición inválida (evento no permitido en ese estado) |
| **Pruebas por pares (pairwise)** | Varios campos independientes cuyas combinaciones explotan | Cubre todos los pares de valores en vez del producto cartesiano; corta la explosión combinatoria |
| **Familias de ruido** (campo de texto libre) | El campo admite prosa escrita por una persona: una consulta, una descripción, o lo que entra a un modelo de lenguaje | Un EC por familia de ruido: sarcasmo, erratas, divagación, ruido irrelevante inyectado, varios temas a la vez, encabezado que engaña sobre el contenido, carga emocional, enunciado hipotético, referencia indirecta a la entidad, dependencia de algo dicho mucho antes, cambio brusco de tema. Aquí `mín-1/mín/máx/máx+1` no dice nada |
| **Basadas en experiencia** (error guessing, exploratoria) | Complemento de las anteriores, para huecos que no ven | EC extra para entradas hostiles conocidas: vacío, null, unicode, negativos, intentos de inyección |

**Regla práctica:** por cada campo con reglas aplica partición de equivalencia (V/I) **y**, si
tiene rango, valores límite; por cada CA con condiciones combinadas, una tabla de decisión; por
cada entidad con ciclo de vida, transición de estados; y por cada campo de texto libre —sobre todo
si lo consume un modelo de lenguaje (`ingenieria-de-prompts` (skill de OpenCode, auto-activable))—, un EC por familia de ruido. La cobertura de caja blanca (sentencias,
ramas) NO va aquí: es responsabilidad del runner en `/implement`, no del diseño de la spec.

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
- **Límites sin probar** — solo valores "de en medio". Los defectos se concentran en los
  bordes: cuando el campo tenga rango, añade el EC de valor límite (mín-1/mín/máx/máx+1).
- **Combinaciones a fuerza bruta** — un EC por cada combinación de N campos hasta que explota.
  Si crece de más, cúbrelo con pruebas por pares (pairwise), no con el producto cartesiano.
- **No nombrar la técnica** — "los casos que se me ocurren". Di qué técnica aplicas
  (equivalencia, límites, tabla de decisión, estados): es lo que te dice cuándo paraste con
  criterio y no a ojo.

## Autocrítica antes de cerrar

Relee las HU del spec y pregúntate: **¿cada HU tiene rol y valor? ¿cada CA es verificable y
tiene su EC? ¿apliqué la técnica de caja negra que le toca a cada CA (y probé los valores
límite de cada campo con rango)? ¿la tabla de trazabilidad enlaza Proceso → RF → HU → CA → EC
sin huecos? ¿el comportamiento está descrito en un solo sitio?** Si algo falla, arréglalo antes
de escribir `spec.md`.
