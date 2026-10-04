# Changelog de voice

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Corregido

- El flujo entre fases cuadra: `/lead` ve cuándo un plan quedó pendiente tras cambiar el encargo y `/outline` deja constancia aunque no cambie nada; redactar tras entregar abre una versión nueva; reescribir una sección quita sus afirmaciones viejas; ninguna fase retoma un entregable descartado; y si falta el motor de PDF, `/deliver` deja el markdown en vez de cambiar a `.docx`. El verificador devuelve también lo que el borrador afirma sin apuntarlo.
- `siglas.mjs` reconoce siglas con tilde («ÍNDICE») y, en presentaciones, trata cada encabezado `#` o `##` como una diapositiva.

### Medido

- `veracidad-tecnica` no se escribe (2026-10-04): sin el plugin, el modelo ya se niega a afirmar ante el cliente una capacidad sin respaldo en las 3 corridas. Eso es la conducta del modelo leída a mano; el corrector automático, que va por subcadena, solo dio por buena 1 de 3. El caso de eval se borró, como los casos SIN DELTA de backbone.

## [0.1.0] - 2026-10-04

### Añadido

- Primera versión del plugin: el andamiaje y las ocho guías compartidas con backbone.
- Cinco comandos: `/lead` (coordina el flujo sin escribir), `/brief` (fija el encargo), `/outline` (escribe el plan), `/draft` (redacta con respaldo) y `/deliver` (verifica, pide la firma y exporta, o descarta).
- Dos subagentes propios, `redactor` y `verificador-afirmaciones`, además del `explorador-repo` que comparte con backbone.
- `siglas.mjs`, el script que avisa de las siglas que no se explican la primera vez que aparecen.
