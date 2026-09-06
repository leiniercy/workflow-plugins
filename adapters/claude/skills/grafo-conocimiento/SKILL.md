---
name: grafo-conocimiento
description: "Úsala cuando necesites entender la estructura de un repo que no conoces, localizar las áreas que una tarea va a tocar, o analizar el impacto de un cambio sobre sus consumidores, antes de ponerte a leer ficheros crudos. Síntoma extra: vas a pedir el contenido completo de una lista (nodos, tareas, ficheros) sin haberla filtrado antes."
user-invocable: false
license: MIT
---
# Grafo de conocimiento (graphify) — exploración eficiente del repo

Cuando explores el repo, el grafo es tu **acelerador, no tu oráculo**: orienta dónde mirar con
un coste en tokens muy inferior a leer ficheros crudos, pero el código es quien decide.
[graphify](https://github.com/safishamsi/graphify) construye el grafo (código vía AST,
docs/PDFs/imágenes vía IA) en `graphify-out/`. Este paquete lo usa como acelerador opcional,
NUNCA como requisito bloqueante.

## Proceso

1. **Detección (siempre primero):** `graphify --version`.
   - **No instalada** → DEGRADA: informa de que puede instalarse con `pipx install graphifyy`
     (sí, doble y; el comando CLI sigue siendo `graphify`) y continúa con exploración manual
     (glob/grep/lectura dirigida). No insistas ni bloquees.
   - **Instalada** → paso 2.
2. **Estado del grafo:** ¿existe `graphify-out/graph.json` en la raíz?
   - **No existe** → propón construirlo (`graphify .`). Es costoso en repos grandes: pide
     aprobación. Si el usuario declina, exploración manual.
   - **Existe pero puede estar desactualizado** (commits/cambios posteriores a su fecha) →
     propón `graphify . --update` (reprocesa solo lo cambiado). Con aprobación, ejecútalo; si
     no, úsalo ADVIRTIENDO que puede estar desfasado.
   - **Existe y fresco** → úsalo directamente.
3. **Consulta según el objetivo:**
   - **Orientarse:** lee `graphify-out/GRAPH_REPORT.md` (god nodes, conexiones sorprendentes);
     si existe `graphify-out/wiki/index.md`, navega la wiki por comunidades.
   - **Áreas afectadas por una tarea:** `graphify query "<concepto central>"`.
   - **Entender un módulo/concepto:** `graphify explain "<Nodo>"`.
   - **Impacto / qué conecta A con B:** `graphify path "<NodoA>" "<NodoB>"`.

## Índice antes que detalle

La regla que más tokens ahorra de toda la exploración, y la que más se salta: **nunca traigas el
detalle de un conjunto que todavía no has filtrado.** Se trabaja en tres capas, y solo se baja
de capa con lo que sobrevive a la anterior:

| Capa | Qué traes | Coste |
|---|---|---|
| **1. Índice** | Identificadores y una línea por elemento: nodos y su tipo, ids y títulos de tareas, rutas de ficheros | Barato |
| **2. Filtro** | Nada. Se descarta con lo que ya tienes | Cero |
| **3. Detalle** | El contenido completo, **solo de los supervivientes** | Caro |

- **En el grafo:** `graphify query` devuelve candidatos; filtra por lo que la tarea toca y solo
  entonces `graphify explain` de los que queden. No expliques todo lo que devolvió la consulta.
- **En ClickUp:** primero la búsqueda o el filtro, que devuelve ids y títulos; después la tarea
  completa —con su descripción y sus comentarios— **solo de la que vas a trabajar**. Traer el
  detalle de una lista entera para elegir una es el caso más caro y el más común.
- **En ficheros:** `glob`/`grep` acotan; `Read` confirma. Es la misma distinción entre buscar y
  leer de `evidencia-y-preguntas` (`${CLAUDE_PLUGIN_ROOT}/skills/evidencia-y-preguntas/SKILL.md`), vista por el lado del coste: buscar es la capa 1,
  leer es la capa 3, y entre las dos falta el filtro que casi nadie hace explícito.

**Por qué importa más de lo que parece:** este gasto no lo paga el repositorio, lo paga la
ventana de contexto de quien está trabajando — y no se nota hasta que se agota a mitad de una
tarea. Un conjunto de treinta elementos del que solo interesan dos cuesta quince veces más si se
trae entero.

**Cuándo NO aplica:** si el conjunto ya es pequeño y acotado, las tres capas son ceremonia. La
regla es para conjuntos que crecen o cuyo tamaño no controlas.

**Formato de salida:** para listas largas y uniformes del grafo (nodos con metadatos, rutas,
áreas afectadas, aristas) usa formato TOON siguiendo la guía `formato-toon` (`${CLAUDE_PLUGIN_ROOT}/skills/formato-toon/SKILL.md`) en lugar de
JSON/YAML. Para resúmenes o conclusiones, prosa normal.

## Anti-patrones (nómbralos para no caer en ellos)

- **Tomar el grafo como verdad** — cada arista es `EXTRACTED` (hecho), `INFERRED` o
  `AMBIGUOUS` (hipótesis). Verifica las dos últimas leyendo el fichero fuente antes de basar
  una decisión en ellas.
- **Escribir spec desde el grafo** — volcar "áreas afectadas" o un enfoque técnico en spec.md
  sin confirmar los ficheros clave en el código real. El grafo reduce dónde mirar; no
  sustituye mirar.
- **Construir/actualizar sin permiso** — son operaciones costosas (no destructivas, pero
  visibles en tiempo y consumo): nunca las lances sin aprobación.
- **Bloquear sin graphify** — si no está, se explora a mano; nada se detiene por su ausencia.
- **Versionar el artefacto** — `graphify-out/` es local generado: recomienda mantenerlo en el
  `.gitignore` del repo consumidor.
- **Traer el detalle para decidir qué te interesa** — pedir el contenido completo de una lista y
  filtrarlo después de tenerlo delante. El filtro va **antes** de bajar a la capa 3, no después:
  al revés ya has pagado.
- **Explicar todo lo que devolvió la consulta** — `explain` de cada nodo que salió en `query`,
  en vez de los dos que la tarea toca.

## Autocrítica antes de pedir el detalle

Antes de bajar a la capa 3, pregúntate: **¿he filtrado ya, o voy a traerlo todo para decidir
después? ¿de estos elementos, cuántos necesito de verdad?** Si la respuesta al segundo es «unos
pocos», trae esos.

## Autocrítica antes de apoyarte en el grafo

Antes de escribir una decisión de diseño basada en el grafo, pregúntate: **¿confirmé en el
código fuente lo que el grafo afirmó?** Si la arista era INFERRED/AMBIGUOUS y no la verificaste,
no la uses todavía.
