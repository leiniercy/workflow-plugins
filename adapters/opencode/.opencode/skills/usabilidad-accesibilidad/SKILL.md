---
name: usabilidad-accesibilidad
description: "Úsala cuando el trabajo toque interfaz: al redactar criterios de aceptación de UI en /plan, al escribir tests de componente en /implement y en la dimensión de usabilidad de /review. Síntomas: formularios sin validación o sin mensajes útiles, imágenes sin alt, controles no alcanzables por teclado. Nielsen + WCAG 2.2."
---
# Usabilidad y accesibilidad (revisable en código)

Cubre la característica **Capacidad de interacción** de ISO 25010 (ver
`calidad-producto` (skill de OpenCode, auto-activable)). Basada en las 10 heurísticas de Nielsen, WCAG 2.2 y listas de
chequeo de laboratorios de pruebas, **destiladas a lo que un revisor puede verificar leyendo
código**. La frontera es dura: lo que exige ver la interfaz renderizada o juicio estético se
**nombra para evaluación manual/E2E, no se intenta** desde un diff.

## Qué SÍ es verificable en código (por heurística)

- **Visibilidad del estado del sistema:** cada página/vista define su título; las acciones
  asíncronas muestran estado (cargando/éxito/fallo) y deshabilitan el reenvío mientras corren
  (doble submit).
- **Lenguaje del usuario, no del sistema:** textos de UI sin jerga técnica ni mensajes crudos
  del backend; la misma función usa siempre el mismo término (no «Buscar» aquí y «Consultar»
  allá para lo mismo).
- **Control y libertad:** las acciones destructivas piden confirmación u ofrecen deshacer;
  tras una acción relevante hay vuelta atrás lógica (navegación, cancelar).
- **Consistencia y estándares:** se reutilizan los componentes/patrones de UI del repo en vez
  de duplicar variantes ad-hoc; los enlaces tienen texto descriptivo (no «clic aquí»); los
  enlaces a descargas señalan tipo y, si es relevante, tamaño del fichero.
- **Prevención de errores:** los formularios validan ANTES de enviar y **revalidan en
  servidor** (la validación de cliente sola es UX, no seguridad); los campos complejos traen
  indicación de formato; los límites del campo casan con los del backend.
- **Reconocer y recuperarse de errores:** los mensajes de error dicen qué pasó y cómo seguir,
  en lenguaje del usuario; nunca códigos crudos, stack traces ni «Error 500» a secas.
- **Accesibilidad (WCAG 2.2, nivel A/AA verificable):** imágenes con `alt` significativo (o
  vacío si son decorativas); inputs con etiqueta asociada; jerarquía de encabezados sin saltos;
  elementos interactivos semánticos (botón real, no `div` con onClick) u operables por teclado
  con rol/tabindex; el foco se gestiona en diálogos y navegación; los idiomas del contenido
  declarados; sin dependencia exclusiva del color comunicada solo en CSS.

## Qué NO se revisa desde el código (nómbralo, no lo intentes)

Contraste efectivo, legibilidad tipográfica, jerarquía visual, ubicación «esperada» de
elementos, estética y todo juicio de diseño: requieren la interfaz renderizada y usuarios.
Márcalo como **evaluación manual o E2E con herramienta de auditoría** (p. ej. axe, Lighthouse)
en la estrategia de tests — la maquinaria es del repo objetivo, no del plugin
(`niveles-y-tipos-de-prueba` (skill de OpenCode, auto-activable)).

## Cómo aplicarla

- **En `/review` (dimensión 6):** SOLO si el diff toca UI (componentes, vistas, plantillas,
  textos de interfaz, formularios). Si no la toca, se declara en una línea y no se fuerza.
  Reporta únicamente lo que el diff **introduce o empeora**, con la disciplina de
  `revision-hallazgos` (skill de OpenCode, auto-activable) — severidad típica Media (accesibilidad que bloquea uso: Alta).
- **En `/plan`:** si la tarea incluye UI, los criterios de aceptación de interfaz incorporan
  lo verificable (etiquetas, validación, estados, teclado) y los aspectos manuales se marcan
  como tipo no-funcional de accesibilidad/usabilidad.
- **En `/implement`:** los tests de componente con locators por rol/etiqueta (Testing Library,
  Playwright) ya verifican semántica accesible de serie; escribirlos así es la implementación
  natural de esta guía.

## Anti-patrones (nómbralos para no caer en ellos)

- **Juicio estético desde el diff** — «este espaciado se ve mal» no es un hallazgo: sin
  renderizar no hay evidencia. Solo lo verificable en código.
- **Checklist forzada a un diff sin UI** — si el cambio es de backend, la dimensión se declara
  no aplicable en una línea; rellenarla es ruido.
- **Nitpicks de redacción** — pulir microcopy es preferencia, no hallazgo, salvo jerga técnica
  real o inconsistencia de nomenclatura demostrable en el repo.
- **Accesibilidad decorativa** — añadir `aria-*` a todo «por si acaso» empeora los lectores de
  pantalla: la semántica nativa primero; ARIA solo donde el HTML no llega.

## Autocrítica antes de cerrar

Antes de reportar, pregúntate: **¿el diff realmente toca UI? ¿cada hallazgo es verificable en
el código citado (fichero:línea)? ¿separé lo manual (nombrado) de lo revisable? ¿evité
estética y nitpicks?** Si algo falla, corrígelo antes de seguir.
