# Usabilidad, accesibilidad y SEO (la interfaz pública, revisable en código)

Cubre la característica **Capacidad de interacción** de ISO 25010 (ver
{{guide:calidad-producto}}) y, junto a ella, los otros dos frentes que comparten superficie
—**internacionalización** y **SEO técnico**—, porque se rompen en los mismos ficheros y se
verifican con la misma lectura del diff. Basada en las 10 heurísticas de Nielsen, WCAG 2.2,
listas de chequeo de laboratorios de pruebas y las directrices públicas de indexación
(schema.org y las guías de los buscadores), **destiladas a lo que un revisor puede verificar
leyendo código**. La frontera es dura: lo que exige ver la interfaz renderizada, juicio
estético o datos de rastreo real se **nombra para evaluación manual/E2E, no se intenta** desde
un diff.

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

## Internacionalización (solo si el repo ya la tiene)

Si el proyecto está internacionalizado, un literal en duro es un **hallazgo objetivo**, no una
preferencia: rompe uno de los idiomas de forma silenciosa.

- El texto visible sale del sistema de traducción del repo, no de una cadena en el componente.
- Las claves nuevas existen en **todos** los idiomas activos: una clave que falta cae al idioma
  por defecto o se pinta en crudo, y nadie lo ve hasta que un usuario cambia de idioma.
- Plurales y valores interpolados usan el mecanismo del framework, nunca concatenación de
  cadenas (el orden de las palabras cambia entre idiomas).
- Fechas, números y monedas se formatean por *locale*, no con formato fijo.
- El idioma activo se declara en el marcado — es el mismo check que la accesibilidad ya pide.

Si el repo NO tiene i18n, esto no aplica: no se propone internacionalizar de paso.

## SEO técnico (solo lo que vive en el código)

Una ruta pública mal etiquetada no rompe ningún test y no se ve en pantalla: se descubre
semanas después, cuando no aparece en los buscadores o cuando un enlace compartido sale pelado.
Detecta primero cómo declara el repo los metadatos (export declarativo del framework, plantilla
de `head`, o el mecanismo que sea) y aplica ahí los checks:

- **Metadatos por ruta:** cada ruta pública indexable declara **título y descripción propios**,
  no heredados del layout raíz ni duplicados entre rutas.
- **Canónica:** las rutas alcanzables por más de una URL (con y sin barra final, con parámetros
  de filtrado, paginadas) declaran cuál es la canónica.
- **Compartir:** título, descripción e imagen para tarjetas sociales en las rutas que se
  comparten; su ausencia es un enlace sin previsualización.
- **Datos estructurados:** si el contenido tiene un tipo reconocible (artículo, producto,
  organización, migas de pan), lleva su marcado válido según schema.org. **Solo si lo es de
  verdad**: marcar de más es penalizable, así que aquí también aplica el «sin fuerza real, no
  se marca».
- **Indexabilidad:** el mapa del sitio y el fichero de reglas de rastreo existen y **se generan
  a partir de las rutas reales**, no a mano —una lista manual se queda obsoleta en el siguiente
  PR—; las rutas privadas, de previsualización o de administración se excluyen explícitamente.
- **URLs que cambian:** mover o renombrar una ruta ya publicada exige su **redirección
  permanente**. Sin ella se rompen los enlaces externos y se pierde el histórico.
- **Semántica compartida con accesibilidad:** un solo encabezado de primer nivel por página y
  jerarquía sin saltos, `alt` significativo, texto de enlace descriptivo, idioma declarado. Ya
  están arriba: el mismo check sirve a los dos frentes y **no se reporta dos veces**.
- **Rendimiento de carga, lo verificable en código:** la imagen principal de la vista se marca
  como prioritaria y las de debajo del pliegue se difieren; las imágenes declaran dimensiones
  (evita saltos de maquetación) y usan formatos modernos; lo pesado y no crítico entra por carga
  diferida. **La medición real** de esas métricas es de la fase de pruebas, no del diff.

## Qué NO se revisa desde el código (nómbralo, no lo intentes)

Contraste efectivo, legibilidad tipográfica, jerarquía visual, ubicación «esperada» de
elementos, estética y todo juicio de diseño: requieren la interfaz renderizada y usuarios.
En SEO, además: posicionamiento, competencia, intención de búsqueda, calidad editorial del
contenido y cualquier cosa que dependa de rastreo real o de datos de una consola de búsqueda.
Y la calidad de una traducción, que es trabajo humano, no de revisión de diff.
Márcalo como **evaluación manual o E2E con herramienta de auditoría** (p. ej. axe, Lighthouse)
en la estrategia de tests — la maquinaria es del repo objetivo, no del plugin
({{guide:niveles-y-tipos-de-prueba}}).

## Cómo aplicarla

- **En `/review` (dimensión 6):** SOLO si el diff toca UI (componentes, vistas, plantillas,
  textos de interfaz, formularios) **o rutas públicas** (metadatos, mapa del sitio, reglas de
  rastreo, redirecciones). Si no toca ninguna de las dos, se declara en una línea y no se
  fuerza. Reporta únicamente lo que el diff **introduce o empeora**, con la disciplina de
  {{guide:revision-hallazgos}} — severidad típica Media (accesibilidad que bloquea uso: Alta;
  ruta publicada que pierde su redirección: Alta).
- **En `/plan`:** si la tarea incluye UI, los criterios de aceptación de interfaz incorporan
  lo verificable (etiquetas, validación, estados, teclado) y los aspectos manuales se marcan
  como tipo no-funcional de accesibilidad/usabilidad. Y si crea o mueve una **ruta pública**, o
  añade texto visible en un repo que **ya tiene i18n**, eso también es criterio de aceptación:
  nadie lo pide en la tarea, pero se rompe igual, y en `/implement` ya es tarde para decidirlo.
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
- **SEO opinado** — «esta descripción no convierte» o «faltan palabras clave» es estrategia de
  contenido, no revisión de código. Lo revisable es que el metadato **exista, sea propio de la
  ruta y no esté duplicado**.
- **Marcado estructurado inflado** — declarar tipos que el contenido no es para «salir mejor».
  Es penalizable y además miente sobre la página.
- **Doble reporte del mismo check** — encabezados, `alt` e idioma sirven a accesibilidad y a
  SEO a la vez: se reportan **una** vez, con la etiqueta que corresponda.
- **Internacionalizar de paso** — si el repo no tiene i18n, proponerla en una tarea que no la
  pidió es cambiar el alcance, no revisar.

## Autocrítica antes de cerrar

Antes de reportar, pregúntate: **¿el diff realmente toca interfaz o una ruta pública? ¿cada
hallazgo es verificable en el código citado (fichero:línea)? ¿separé lo manual (nombrado) de
lo revisable? ¿evité estética, nitpicks y opinión de contenido? ¿reporté una sola vez lo que
sirve a dos frentes?** Si algo falla, corrígelo antes de seguir.
