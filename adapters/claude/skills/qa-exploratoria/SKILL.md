---
name: qa-exploratoria
description: "Úsala tras implementar criterios que tocan interfaz y antes de pedir revisión humana, o cuando el cambio afecte a un flujo de usuario completo. Síntomas: los tests pasan pero nadie ha abierto la aplicación; hay que evaluar estética, contraste o jerarquía visual, que no se verifican desde un diff."
user-invocable: false
license: MIT
---
# QA exploratoria (probar la aplicación de verdad)

Los tests que diseñas cubren lo que **anticipaste**: los criterios de aceptación y sus casos
derivados. La QA exploratoria cubre lo que **no anticipó nadie** — se recorre la aplicación
real, se interactúa como lo haría una persona y se busca lo que se rompe fuera del guion.

Es la contraparte de las otras dos guías de prueba: `historias-usuario` (`${CLAUDE_PLUGIN_ROOT}/skills/historias-usuario/SKILL.md`) diseña los casos
a partir del criterio, `niveles-y-tipos-de-prueba` (`${CLAUDE_PLUGIN_ROOT}/skills/niveles-y-tipos-de-prueba/SKILL.md`) decide a qué nivel automatizarlos, y
esta se ocupa de **lo que solo aparece ejecutando el producto**. En concreto, es la forma de
cubrir lo que `/review` declara «evaluación manual» porque no es verificable desde un diff:
estética, contraste, jerarquía visual y flujos completos de usuario.

**Cuándo:** tras implementar criterios que tocan interfaz, antes de pedir revisión humana. Y
siempre que un cambio afecte a un flujo de usuario completo (alta, login, pago, búsqueda),
aunque cada pieza tenga sus tests en verde.

**Degradación:** si dispones de automatización de navegador (herramientas de tipo
navegar/capturar/click/consola), úsala y adjunta evidencia. Si no, **el proceso es el mismo a
mano**: el valor está en la disciplina de recorrido y evidencia, no en la herramienta.

## Proceso — cinco fases

### 1. Planifica el recorrido

Acota el alcance con el usuario (¿esta funcionalidad, o el sitio entero?) y esboza el mapa de lo
que vas a recorrer: página de entrada, navegación (cabecera, pie, lateral), los flujos clave de
principio a fin, formularios y elementos interactivos, y **los estados que nadie mira**: vacío,
error, 404, sin permisos, carga lenta.

### 2. Explora

Por cada pantalla del plan: entra, entiende su estructura, **mira la consola**, y ejercita los
elementos interactivos — pulsar, escribir, navegar con teclado (`Tab`/`Enter`), hacer scroll
hasta el final, enviar formularios vacíos y con datos inválidos.

**La consola es la mina de oro.** Revísala después de cada navegación y después de cada
interacción significativa: los errores de JavaScript que no rompen la pantalla —pero rompen algo
más abajo— son los hallazgos de más valor y los únicos que no se ven mirando.

Prueba también lo que nadie prueba: textos larguísimos, caracteres especiales, pulsar dos veces
seguidas rápido, retroceder a mitad de un flujo, recargar tras enviar.

### 3. Recoge evidencia (en el momento, no después)

Por cada hallazgo, y **mientras lo tienes delante**:

- **Dónde** ocurre (URL o pantalla).
- **Pasos para reproducirlo**, numerados y suficientes para que otro lo repita.
- **Qué esperabas** frente a **qué pasó**.
- **Errores de consola**, si los hubo.
- **Captura** del estado que lo demuestra.

Un hallazgo sin pasos de reproducción no es un hallazgo: es una impresión.

### 4. Clasifica y deduplica

**Deduplica por invariante roto, no por síntoma.** Un solo defecto puede manifestarse en cuatro
pantallas; es **un** hallazgo con cuatro manifestaciones, no cuatro hallazgos. Contar síntomas
infla el informe y hace que se corrija cuatro veces lo mismo — o peor, que se parchee cada
síntoma y quede la causa viva.

Asigna severidad con la escala de `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`) y etiqueta la característica de
`calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`) afectada:

| Severidad | Qué la define | Ejemplos típicos |
|---|---|---|
| **Crítico** | Funcionalidad esencial inutilizable, o pérdida de datos | Pantalla en blanco; el formulario pierde lo escrito; no se puede iniciar sesión; secreto expuesto en consola |
| **Alto** | Deteriora seriamente la funcionalidad, aunque exista rodeo | Un botón clave no hace nada; la búsqueda no devuelve resultados válidos; la validación rechaza entradas correctas; enlace a 404; excepción no capturada en consola |
| **Medio** | Se nota y molesta, pero no bloquea | Maquetación descuadrada; imágenes rotas; esperas visibles largas; un campo sin mensaje de error; avisos de consola |
| **Bajo** | Acabado | Erratas; espaciados; texto de relleno en producción; mensajes de depuración en consola |

Y la categoría: **funcional**, **visual**, **accesibilidad**, **consola**, **experiencia de
uso** o **contenido**.

### 5. Informa

Resumen ejecutivo (cuántos hallazgos, desglose por severidad, qué se recorrió), la lista
ordenada de mayor a menor severidad con la evidencia de cada uno, y —esto es lo que casi
siempre falta— **qué NO se probó y por qué**: la parte no recorrida, lo que quedó bloqueado y lo
que requiere datos o permisos que no tenías. Un informe que calla su alcance se lee como si lo
hubiera cubierto todo.

## Relación con `/review`

`/review` analiza el **diff**; esta guía ejercita el **producto**. No se solapan y no se
sustituyen: un cambio puede pasar la revisión de código entera y romper el flujo en cuanto se
usa. Los hallazgos de la QA exploratoria entran en el mismo circuito que los de revisión: se
verifican contra el código antes de corregirlos, y si son bugs, se busca la causa raíz antes
de arreglar el síntoma.

## Anti-patrones

| Pensamiento | Realidad |
|---|---|
| «Los tests pasan, la funcionalidad está bien» | Los tests cubren lo que anticipaste. La exploratoria existe para lo demás. |
| «Lo he visto fallar, luego escribo los pasos» | La evidencia se recoge en el momento; reconstruirla después es cómo se pierden los hallazgos. |
| «Aquí no miro la consola, la pantalla se ve bien» | Los errores silenciosos de JavaScript son los hallazgos de más valor y no se ven mirando. |
| «Sale en cuatro pantallas: cuatro hallazgos» | Deduplica por invariante roto. Cuatro síntomas del mismo defecto son un hallazgo. |
| «Solo recorro el camino feliz» | Los estados vacío, de error y sin permisos son donde vive la mayoría de los defectos de interfaz. |
| «No digo lo que no probé, se sobreentiende» | Un informe que calla su alcance se lee como completo. Declara siempre lo no cubierto. |
| «Esto es feo, lo reporto» | Sin pasos, sin evidencia y sin criterio, es una opinión. Descríbelo como observación de diseño, no como defecto. |

## Autocrítica antes de entregar el informe

Pregúntate: **¿revisé la consola en cada pantalla? ¿cada hallazgo tiene pasos que otro pueda
repetir? ¿deduplique por causa y no por síntoma? ¿declaré lo que no probé?** Si algo falla,
corrígelo antes de entregar.
