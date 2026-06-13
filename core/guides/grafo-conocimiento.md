# Grafo de conocimiento (graphify) — exploración eficiente del repo

[graphify](https://github.com/safishamsi/graphify) construye un grafo de conocimiento del
repo (código vía AST, docs/PDFs/imágenes vía IA) en `graphify-out/` y permite consultarlo
con un coste en tokens muy inferior a leer los ficheros crudos. Este paquete lo usa como
acelerador de exploración, NUNCA como requisito bloqueante.

## Paso 1 — Detección (siempre primero)

Comprueba disponibilidad con `graphify --version` (CLI instalada). Resultados:

- **No instalada** → DEGRADACIÓN: informa al usuario que puede instalarla con
  `pipx install graphifyy` (sí, con doble y; el comando CLI sigue siendo `graphify`) según
  el README del paquete, y continúa con exploración manual del repo (glob/grep/lectura
  dirigida). No insistas ni bloquees.
- **Instalada** → continúa al Paso 2.

## Paso 2 — Estado del grafo

Comprueba si existe `graphify-out/graph.json` en la raíz del repo:

- **No existe**: propón construirlo (`graphify .` desde la raíz). Es una operación que
  consume tiempo y tokens en repos grandes: pide aprobación antes de lanzarla. Si el
  usuario declina, usa exploración manual.
- **Existe pero puede estar desactualizado** (hay commits o cambios posteriores a su
  fecha de modificación): propón `graphify . --update` (solo reprocesa ficheros
  cambiados, gracias a la caché SHA256). Con aprobación, ejecútalo; si no, usa el grafo
  tal cual ADVIRTIENDO que puede estar desfasado.
- **Existe y está fresco**: úsalo directamente.

## Paso 3 — Consulta según el objetivo

- **Visión general / orientarse**: lee `graphify-out/GRAPH_REPORT.md` (god nodes,
  conexiones sorprendentes, preguntas sugeridas). Si existe `graphify-out/wiki/index.md`,
  navega la wiki por comunidades en lugar de parsear `graph.json`.
- **Localizar áreas afectadas por una tarea**:
  `graphify query "<concepto central de la tarea>"`.
- **Entender un módulo/concepto concreto**: `graphify explain "<Nodo>"`.
- **Impacto de un cambio / qué conecta A con B**: `graphify path "<NodoA>" "<NodoB>"`.

**Formato de salida:** al presentar resultados del grafo que sean listas largas y
uniformes (nodos con metadatos, múltiples rutas, áreas afectadas, aristas), usa formato
TOON siguiendo la guía {{guide:formato-toon}} en lugar de JSON/YAML, para minimizar el
consumo de contexto. Para resúmenes breves o conclusiones, prosa normal.

## Reglas de fiabilidad

1. Cada arista del grafo está etiquetada `EXTRACTED`, `INFERRED` o `AMBIGUOUS`. Trata
   `EXTRACTED` como hecho; `INFERRED`/`AMBIGUOUS` como hipótesis a VERIFICAR leyendo el
   fichero fuente antes de basar una decisión de diseño en ellas.
2. El grafo orienta, el código decide: antes de escribir en spec.md una lista de áreas
   afectadas o un enfoque técnico, confirma en el código real los ficheros clave que el
   grafo señaló. El grafo reduce dónde mirar; no sustituye mirar.
3. `graphify-out/` es un artefacto generado local: recomienda mantenerlo en `.gitignore`
   del repo consumidor (ver README del paquete).
4. Nunca ejecutes construcciones/actualizaciones del grafo sin aprobación: son
   operaciones costosas, no destructivas pero sí visibles en tiempo y consumo.
