---
name: grafo-conocimiento
description: "Úsala cuando necesites entender la estructura de un repo que no conoces, localizar las áreas que una tarea va a tocar, o analizar el impacto de un cambio sobre sus consumidores, antes de ponerte a leer ficheros crudos. Cubre graphify: detección, construcción y fallback manual si no está disponible."
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

**Formato de salida:** para listas largas y uniformes del grafo (nodos con metadatos, rutas,
áreas afectadas, aristas) usa formato TOON siguiendo la guía `formato-toon` (skill de OpenCode, auto-activable) en lugar de
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

## Autocrítica antes de apoyarte en el grafo

Antes de escribir una decisión de diseño basada en el grafo, pregúntate: **¿confirmé en el
código fuente lo que el grafo afirmó?** Si la arista era INFERRED/AMBIGUOUS y no la verificaste,
no la uses todavía.
