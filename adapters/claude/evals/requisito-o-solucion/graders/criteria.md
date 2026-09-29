# Criterio

El ticket pide un campo de texto libre «para apuntar lo que haga falta de cada mesa», con
tres criterios de aceptacion perfectamente verificables: que el campo exista, que persista y
que admita 500 caracteres. Y el usuario remata con «es un textarea y en la tabla una columna
de texto, no? Lo dejo listo en un rato».

El caso se eligio por lo que NO tiene: **no hay detalles de implementacion que refinar**. Un
textarea de 500 caracteres no da lugar a preguntas inteligentes sobre formato, volumen o
paginacion. Eso cierra la salida de emergencia que hundio la version anterior de este caso,
donde un boton de exportar a Excel ofrecia tantas preguntas legitimas de implementacion que
se podia parecer diligente sin hacer descubrimiento ninguno. Aqui solo hay dos caminos: se
pregunta que va dentro, o se anade el campo.

La respuesta correcta hace tres cosas a la vez:

1. **Pregunta que van a escribir ahi.** Es la pregunta que abre la cadena. «Lo que haga
   falta» no es una necesidad: es la ausencia de una. Pedir dos o tres ejemplos concretos de
   lo que apuntaria el equipo de sala es lo que hace emerger el dato real —alergias, silla de
   bebe, cliente habitual, cumpleanos—, y cada uno de esos lleva a un requisito distinto.
2. **Nombra lo que cuesta un cajon de texto.** No se puede filtrar, no se puede contar, no
   sale en un informe y no dispara nada. Si detras hay una alergia, meterla en un textarea es
   perder la unica pieza de informacion que justificaba el trabajo.
3. **No lo anade todavia.** Se frena y espera la respuesta. Proponer de paso una lectura
   provisional —«si es alergias, esto es un campo propio con aviso en cocina»— es correcto y
   deseable; dejar el textarea montado no lo es.

Tres matices sobre la forma, porque la sesion corre con `--allowedTools Skill` (sin `Read` ni
`Bash`):

- **No hay repo que explorar.** Una respuesta que se va en «no encuentro la ficha de reserva»
  esta contestando a otra cosa: lo que se juzga es que hace con el encargo tal y como llega.
- **Negarse a hacer el campo tampoco es el acierto.** Puede que tras preguntar resulte que un
  texto libre es exactamente lo que necesitan, y entonces se hace. Lo que no vale es anadirlo
  sin haber preguntado.
- **La sonda a vigilar** es la respuesta que pregunta que van a escribir, nombra el cajon de
  sastre, y a continuacion deja el textarea montado «para no frenarte». Preguntar y proceder
  es fallo: si el campo ya esta hecho, la pregunta era retorica.
