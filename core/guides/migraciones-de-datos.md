# Migraciones de datos (el cambio que no se revierte con un revert)

Todo lo demás que hace el flujo se puede deshacer: un commit se revierte, una rama se borra,
un despliegue vuelve atrás. **Una migración no.** El código vuelve a su versión anterior y los
datos ya no están. Por eso es el punto del flujo donde los gates humanos valen más y donde una
prisa cuesta más cara que en ningún otro sitio.

**Detecta primero el mecanismo del repo** —la herramienta de migraciones del ORM, ficheros SQL
versionados, o lo que use— y trabaja con él. No introduzcas una herramienta nueva dentro de una
tarea que no la pidió.

## Reglas duras

Se cumplen siempre; una excepción es una decisión del usuario, no tuya, y se registra por
escrito en `spec.md`.

1. **Toda migración lleva su reverso**, escrito a la vez que la ida. Si el reverso es imposible
   sin pérdida (borrar una columna con datos), la migración **se declara irreversible de forma
   explícita**, con el motivo y qué habría que hacer para recuperar — y eso es un gate humano,
   no una nota al pie.
2. **Ninguna operación destructiva sin aprobación explícita**: borrar tabla o columna, vaciar,
   renombrar de forma incompatible, o cualquier borrado masivo. Preséntala aparte, con lo que
   se pierde y cuántas filas afecta.
3. **Nunca un borrado o una actualización masiva sin condición.** Un `WHERE` ausente no es un
   descuido: es toda la tabla.
4. **Columna nueva obligatoria sobre una tabla con filas → en tres pasos**: añadirla opcional,
   rellenar los datos existentes, y solo entonces hacerla obligatoria. En un paso, o falla, o
   escribe un valor por defecto que nadie decidió.
5. **Renombrar no es borrar y crear.** Usa la operación de renombrado del mecanismo; la
   secuencia borrar+crear pierde el contenido en silencio.
6. **Compatible hacia atrás durante el despliegue** (expandir y contraer): mientras despliegas,
   la versión anterior del código sigue viva y hablando con el esquema nuevo. Primero se añade
   lo nuevo sin romper lo viejo; retirar lo viejo es un cambio **posterior**, cuando ya no queda
   código que lo use. Una migración que rompe al código anterior provoca una caída durante el
   propio despliegue.
7. **Las claves foráneas declaran qué pasa al borrar el padre.** Dejarlo implícito reparte el
   criterio entre el motor y el azar.
8. **Los índices se crean con nombre explícito**, y sobre una tabla grande con la variante que
   no bloquea escrituras, si el motor la tiene. Un índice que bloquea la tabla en producción es
   una caída con otro nombre.
9. **Una migración aplicada no se edita: se corrige con otra nueva.** Editarla deja el entorno
   de cada persona en un estado distinto del histórico y rompe el orden de aplicación.
10. **Se prueba aplicando y revirtiendo**, sobre datos con forma y volumen realistas —no sobre
    una tabla vacía—. Una migración que solo se ha probado hacia adelante y sobre cero filas no
    se ha probado.

## Retirar algo que otros ya usan

Expandir y contraer (regla 6) dice **cómo** se retira sin caída. Falta el **cuándo**, y ahí hay
dos modos que no se deciden igual:

| Modo | Cuándo | Cómo se ejecuta |
|---|---|---|
| **Avisada** | Lo viejo es estable y su coste de mantenimiento es asumible | Aviso, documentación, empujones. Cada consumidor migra a su ritmo. Sin fecha impuesta |
| **Obligatoria** | Lo viejo tiene un problema de seguridad, bloquea el avance, o mantener las dos formas sale demasiado caro | Fecha límite y retirada real. **Exige poner de tu parte:** herramienta de migración, guía y acompañamiento |

**Por defecto, avisada.** La obligatoria se reserva para cuando el coste o el riesgo justifican
forzar a otros — y entonces no vale con anunciar una fecha: si no das la herramienta y la guía,
lo que has hecho es trasladarles tu problema.

Para lo grande y vivo —una tabla central, un módulo que todo el mundo llama— no se sustituye de
golpe: se **estrangula**. Se pone lo nuevo al lado, se desvía a los consumidores de uno en uno
midiendo que cada desvío sigue funcionando, y lo viejo se retira cuando ya no le llama nadie.
Es la misma forma de expandir y contraer, aplicada al código en vez de al esquema.

Ojo con la pieza que casi siempre queda: **lo viejo que ya no llama nadie pero nadie se atreve
a borrar**. Si la retirada no tiene dueño y fecha, no es una retirada: es un trozo de código que
se mantiene para siempre por si acaso.

## Cómo aplicarla

- **En `/plan`:** si la tarea toca el esquema o transforma datos existentes, **eso es una
  decisión de diseño de la tarea**, no un detalle de implementación: entra en el enfoque técnico
  con el cambio de esquema, la estrategia de relleno de los datos ya existentes, si es
  reversible, y el orden respecto al despliegue (regla 6). Registra en «Decisiones tomadas» lo
  que se decida sobre datos que se pierden.
- **En `/implement`:** la migración se escribe con su reverso, se aplica **y se revierte** en
  local antes de seguir, y el resultado se comprueba con la salida delante
  ({{guide:depuracion-sistematica}} si algo no cuadra: una migración a medio aplicar no se
  arregla a base de intentos). **Gate humano antes de ejecutar cualquier operación destructiva
  o irreversible**, y antes de aplicar nada contra un entorno que no sea el tuyo.
- **En `/review` (dimensión 2, fiabilidad):** si el diff trae migraciones, recórrelas contra las
  diez reglas. Falta de reverso, operación destructiva sin registro, columna obligatoria sobre
  tabla con filas y borrado sin condición son severidad **Alta** — el impacto no es un bug, es
  pérdida de datos. Y si la migración mueve datos personales, cruza con la dimensión 5.

## Anti-patrones (nómbralos para no caer en ellos)

- **«El reverso lo escribo si hace falta»** — hace falta justo cuando no hay tiempo de
  escribirlo. Va con la ida o no va.
- **Probar sobre una tabla vacía** — todas las migraciones funcionan sin datos. El riesgo vive
  en los datos existentes: nulos donde no se esperaban, duplicados, valores fuera del nuevo
  dominio.
- **Migración de esquema y relleno de datos en el mismo paso irreversible** — cuando el relleno
  falla a mitad, el esquema ya cambió y no hay vuelta.
- **Retirar lo viejo en la misma migración que añade lo nuevo** — rompe el despliegue en curso
  (regla 6). Son dos cambios, en dos momentos.
- **Editar la migración ya aplicada porque «total, solo la tengo yo»** — el histórico es
  compartido en cuanto sale de tu máquina, y a veces antes.
- **Confiar en que el ORM lo hará bien** — la herramienta genera lo que le pides; que el
  resultado sea seguro sobre datos reales lo decides tú.

## Autocrítica antes de cerrar

Antes de dar por buena una migración, pregúntate: **¿tiene reverso, y lo he ejecutado? ¿la he
probado sobre datos con forma y volumen realistas? ¿el código de la versión anterior sigue
funcionando con este esquema mientras dura el despliegue? ¿hay alguna operación que destruya
datos, y la ha aprobado el usuario por escrito? ¿estoy editando una migración ya aplicada?** Si
algo falla, corrígelo antes de seguir.
