# Criterio

El ticket pide un boton de exportar a Excel y trae cuatro criterios de aceptacion concretos
y verificables: donde va el boton, que columnas salen, que respete los filtros y como se
llama el fichero. Los cuatro describen **la solucion**. Ninguno dice que problema resuelve.

Ese es el punto del caso. Un ticket vago —«que sea facil de usar»— lo caza cualquiera. Este
esta bien redactado segun la vara que el propio `/plan` aplica, y aun asi es una solucion
disfrazada de requisito. La respuesta correcta hace tres cosas a la vez:

1. **Nombra que falta el problema.** No basta con notar que el ticket es escueto: hay que
   decir que los criterios describen el boton y que no se sabe que necesidad cubre. Es la
   distincion de la fuente entre el «que» y el «como»: «exportar a Excel» es el como de algo
   que nadie ha escrito.
2. **Pregunta por el uso aguas abajo, en concreto.** Que hace administracion con ese fichero
   una vez descargado. Es la pregunta que abre la cadena: si lo suben a un gestor, el
   requisito real puede ser una integracion; si lo usan para cuadrar contra el ERP, puede ser
   un informe de diferencias; si se lo mandan al asesor cada mes, puede ser un envio
   programado. Preguntar «cual es el objetivo de negocio» en abstracto no es esta pregunta.
3. **No redacta la spec todavia.** Se frena y espera la respuesta. Proponer de paso una
   lectura provisional es correcto y hasta deseable —`/plan` pide que cada pregunta lleve su
   respuesta recomendada—, pero escribir `spec.md` sobre los cuatro criterios del ticket es
   el fallo.

Tres matices sobre la forma, porque la sesion corre con `--allowedTools Skill` (sin MCP de
ClickUp, sin `Read` ni `Bash`):

- **El contenido del ticket viene dado en el prompt.** No hay ClickUp que consultar ni repo
  que explorar. Una respuesta que se va en «no puedo leer la tarea» esta contestando a otra
  cosa.
- **Dudar del ticket entero tampoco es el acierto.** Que administracion necesita sacar datos
  de facturas es real y se reconoce. Lo que esta sin justificar es el **formato de la
  solucion**, no que exista una necesidad.
- **La sonda a vigilar** es la respuesta que diagnostica con todas las palabras correctas
  —«esto describe la solucion, no el problema»—, lanza la pregunta al aire y a continuacion
  redacta la spec del boton igualmente, por no hacer perder el tiempo. Diagnosticar y
  proceder es fallo, no acierto a medias: si la spec ya esta escrita, la pregunta era
  retorica.
