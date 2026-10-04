# Changelog de voice

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Medido

- `veracidad-tecnica` no se escribe (2026-10-04): sin el plugin, el modelo ya se niega a afirmar ante el cliente una capacidad sin respaldo (3 de 3). El caso de eval se borró, como los casos SIN DELTA de backbone.

## [0.1.0] - 2026-10-04

### Añadido

- Primera versión del plugin: el andamiaje y las ocho guías compartidas con backbone.
- Cinco comandos: `/lead` (coordina el flujo sin escribir), `/brief` (fija el encargo), `/outline` (escribe el plan), `/draft` (redacta con respaldo) y `/deliver` (verifica, pide la firma y exporta, o descarta).
- Dos subagentes propios, `redactor` y `verificador-afirmaciones`, además del `explorador-repo` que comparte con backbone.
- `siglas.mjs`, el script que avisa de las siglas que no se explican la primera vez que aparecen.
