---
name: formato-toon
description: "Úsala siempre que vayas a devolver listas largas de datos uniformes, varias rutas del grafo, esquemas de base de datos o cualquier salida estructural repetitiva, en lugar de JSON o YAML. Síntoma: la salida tendría las mismas claves repetidas en cada elemento y gastaría tokens de más."
user-invocable: false
---
# Formato TOON — eficiencia de contexto en salidas estructuradas

Cuando vayas a presentar datos estructurados, **elige el formato por su coste en tokens**: para
listas uniformes largas, TOON ahorra contexto frente a JSON/YAML. TOON (Token-Oriented Object
Notation) representa los mismos datos que JSON con una fracción de los tokens: declara los
campos UNA vez en una cabecera y elimina llaves, corchetes repetidos y comillas innecesarias.
El ahorro crece con el número de filas (en listas uniformes largas, típicamente 40-60% menos
tokens que JSON).

## Sintaxis

**Lista uniforme de objetos** (el caso estrella — cabecera `nombre[N]{campos}:` + una
fila por línea, valores separados por coma, indentadas):

```toon
usuarios[3]{id,nombre,rol}:
  1,Ana,admin
  2,Luis,editor
  3,Sara,viewer
```

Equivale a `[{"id":1,"nombre":"Ana","rol":"admin"}, ...]`.

**Objeto simple / escalares** (clave-valor con indentación para anidar, como YAML pero
sin comillas ni guiones):

```toon
tarea:
  id: 86abc123
  titulo: Añadir página about
  criterios[2]{n,descripcion,estado}:
    1,Página renderiza en /about,completado
    2,Test e2e de navegación,pendiente
```

## Reglas

1. **Cabecera de lista**: `nombre[N]{campo1,campo2,...}:` donde `N` es el número real de
   filas. Verifica que N coincide con las filas emitidas: es el checksum del formato.
2. **Sin comillas ni llaves** por defecto. Entrecomilla un valor SOLO si contiene coma,
   dos puntos, o salto de línea (`"Pérez, Ana"`).
3. **Valores vacíos**: deja el hueco entre comas (`1,,admin`). Null explícito: `null`.
4. **Anidación por indentación** (2 espacios), nunca por llaves.
5. **Listas no uniformes** (objetos con campos distintos entre sí): TOON pierde su
   ventaja; usa el formato que resulte más claro (YAML compacto o prosa).

## Cuándo usarlo

- Listados largos desde el grafo de graphify: resultados de `query`, rutas de `path`,
  nodos/aristas, áreas afectadas con metadatos.
- Esquemas de base de datos (tablas → columnas, tipo, constraints).
- Tablas de hallazgos, inventarios de ficheros, resultados de análisis con N filas
  homogéneas.

## Cuándo NO usarlo

- **Ficheros que deben ser parseables por herramientas**: manifiestos JSON,
  configuraciones (`.mcp.json`, `opencode.json`), configs YAML de CI, `package.json`.
  TOON es un formato de PRESENTACIÓN para chat e informes, no un formato de fichero del
  ecosistema.
- **Contenido de `spec.md` y `progress.md`**: mantienen su estructura Markdown definida
  (son para humanos y agentes que esperan ese contrato). Dentro de ellos, una tabla de
  datos uniforme puede ir en bloque ```toon si es larga.
- Datos pequeños (menos de ~5 filas) o profundamente anidados: el ahorro no compensa la
  carga cognitiva; usa prosa o una tabla Markdown.
