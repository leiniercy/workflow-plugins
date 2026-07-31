# Depuración sistemática — causa raíz antes de arreglar

Cuando algo falla, eres un **investigador, no un adivinador**. El síntoma es la pista, no el
objetivo: arreglar el síntoma deja el defecto vivo y añade una capa de código que esconde el
problema real. Bajo prisa la tentación de probar cosas es máxima, y es justo cuando esta
disciplina más ahorra: investigar es **más rápido** que la ronda de prueba y error.

**La ley:** ningún arreglo sin investigación de causa raíz primero. Si no has completado la
fase 1, no propones arreglos.

Aplícala ante cualquier fallo técnico: test que falla, bug reportado, comportamiento
inesperado, build roto, problema de rendimiento, integración que no responde. Y **especialmente**
cuando el arreglo parece obvio, cuando hay urgencia, o cuando ya llevas un intento fallido.

## Proceso — cuatro fases en orden

Cada fase se completa antes de pasar a la siguiente.

### Fase 1 — Investigación de causa raíz

1. **Lee el error entero.** La traza completa, el código de error, el número de línea. Muchos
   errores contienen literalmente la solución y se pierden por leer solo la primera línea.
2. **Reprodúcelo de forma fiable.** ¿Qué pasos exactos lo disparan? ¿Ocurre siempre? Si no
   consigues reproducirlo, recopila más datos — no empieces a adivinar.
3. **Mira qué cambió.** `git diff`, commits recientes, dependencias nuevas, cambios de
   configuración o de entorno.
4. **Instrumenta las fronteras (sistemas multi-componente).** Si el fallo cruza componentes
   (petición → servicio → base de datos; CI → build → despliegue), añade trazas en **cada
   frontera** —qué entra, qué sale, qué configuración se propaga— y ejecuta **una vez** para
   ver *en qué capa* se rompe. Solo entonces investiga esa capa. Instrumentar es recopilar
   evidencia, no arreglar.
5. **Traza el dato hacia atrás.** ¿Dónde se origina el valor incorrecto? ¿Quién llamó con ese
   valor? Sigue subiendo hasta el origen. Se arregla en el origen, no donde explota.

### Fase 2 — Análisis de patrón

1. **Busca lo que sí funciona.** Código similar del mismo repo que funcione correctamente.
2. **Compara contra la referencia.** Si estás replicando un patrón, léelo **entero** antes de
   aplicarlo; entenderlo a medias garantiza bugs.
3. **Lista todas las diferencias** entre lo que funciona y lo que no, por pequeñas que parezcan.
   No descartes ninguna con un «eso no puede influir».
4. **Entiende las dependencias**: qué necesita el componente, qué configuración asume.

### Fase 3 — Hipótesis y prueba

1. **Formula UNA hipótesis**, explícita: «creo que la causa es X porque Y». Escríbela.
2. **Pruébala con el cambio más pequeño posible.** Una variable cada vez. Nunca varios
   arreglos a la vez: no podrás saber cuál funcionó y crearás bugs nuevos.
3. **Verifica antes de seguir.** ¿Funcionó? → fase 4. ¿No? → hipótesis NUEVA, no un arreglo
   encima del anterior.
4. **Si no lo entiendes, dilo.** «No entiendo por qué X» es una respuesta válida y útil; fingir
   que lo entiendes no lo es.

### Fase 4 — Implementación

1. **Test que reproduce el fallo, primero.** Es el paso RED del ciclo TDD: debe fallar por la
   razón correcta antes de tocar el código.
2. **Un solo arreglo**, sobre la causa raíz identificada. Sin mejoras «ya que estoy», sin
   refactor de propina.
3. **Verifica con evidencia**: el test pasa, la suite sigue verde, el síntoma original ha
   desaparecido. Ejecutar el comando y leer la salida — no suponerla.

## La regla de los tres arreglos fallidos

Lleva la cuenta. Si **tres** arreglos han fallado, el problema no es tu hipótesis: es el
diseño.

Señales: cada arreglo destapa un problema nuevo en otro sitio · cada arreglo exige «refactorizar
media aplicación» · los arreglos se pisan entre sí. Cuando pase, **PARA** y plantea la pregunta
de fondo — ¿este enfoque es sostenible, o lo mantenemos por inercia? — y **discútelo con el
usuario antes de intentar el arreglo número cuatro**.

## Señales del usuario de que lo estás haciendo mal

Escúchalas como una parada de emergencia; todas significan «vuelve a la fase 1»:

| Lo que dice | Lo que significa |
|---|---|
| «¿Y eso no está pasando?» | Diste algo por supuesto sin verificarlo |
| «¿Eso nos va a enseñar…?» | Deberías haber instrumentado antes de proponer |
| «Deja de adivinar» | Estás proponiendo arreglos sin entender el fallo |
| «Piénsalo a fondo» | Cuestiona los fundamentos, no solo el síntoma |
| «¿Estamos atascados?» | Tu enfoque no funciona; cambia de método, no de intento |

## Anti-patrones (racionalizaciones que significan PARA)

| Pensamiento | Realidad |
|---|---|
| «Es simple, no necesita proceso» | Lo simple también tiene causa raíz, y el proceso es rápido con bugs simples. |
| «Es urgente, no hay tiempo de proceso» | Investigar es MÁS rápido que la ronda de prueba y error. |
| «Pruebo esto primero y luego investigo» | El primer arreglo marca el patrón. Hazlo bien desde el principio. |
| «Escribo el test cuando confirme el arreglo» | Un arreglo sin test no se sostiene; el test primero es lo que prueba que arreglaste algo. |
| «Cambio varias cosas a la vez, gano tiempo» | No podrás aislar qué funcionó, y sembrarás bugs nuevos. |
| «La referencia es larga, adapto la idea» | Entenderla a medias garantiza el bug. Léela entera. |
| «Ya veo el problema, lo arreglo» | Ver el síntoma no es entender la causa. |
| «Un intento más y sale» (tras 2 fallidos) | Tres fallos = problema de arquitectura. Cuestiona el diseño, no lances otro arreglo. |

## Cuando la investigación concluye «no hay causa raíz»

Ocurre: fallos genuinamente ambientales, dependientes de temporización o de un sistema externo.
Si llegas ahí **tras** recorrer el proceso: documenta qué investigaste, implementa el manejo
adecuado (reintento, timeout, mensaje de error útil) y añade trazas para la próxima vez.

Ojo: la mayoría de los «no hay causa raíz» son investigaciones incompletas. Antes de aceptarlo,
comprueba que de verdad hiciste las cuatro fases.

## Autocrítica antes de proponer el arreglo

Pregúntate: **¿puedo explicar por qué falla, en una frase, con evidencia del código?** Si la
respuesta empieza con «creo que» o «probablemente», vuelve a la fase 1. Y: **¿este arreglo
ataca el origen o el punto donde explota?** Si es lo segundo, todavía no has terminado de
trazar.
