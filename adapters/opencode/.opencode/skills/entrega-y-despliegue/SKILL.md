---
name: entrega-y-despliegue
description: "Úsala al decidir cómo sale un cambio a producción: el orden respecto a una migración, la bandera de funcionalidad, la vuelta atrás y la ventana de vigilancia posterior. Síntomas: dices «si va mal, revertimos» sin comprobar que el redespliegue deshaga nada; juntas dos cambios en un mismo despliegue; una variable de entorno vive solo en tu máquina; una bandera se queda sin fecha de retirada."
---
# Entrega y despliegue (de mergeado a funcionando)

`migraciones-de-datos` (skill de OpenCode, auto-activable) cubre el cambio que no vuelve atrás. Esta cubre el tramo que
viene después y que el flujo no tenía: **entre «la PR está mergeada» y «esto funciona para
quien lo usa» hay decisiones, y hoy se toman sobre la marcha o no se toman**.

Hay una que se pierde siempre y es la que más duele: el **orden del despliegue respecto a la
migración** se decide en `/plan`, porque la regla 6 de `migraciones-de-datos` (skill de OpenCode, auto-activable) lo
obliga, y luego no hay ningún sitio donde esa decisión viva hasta que alguien la ejecuta.

**Detecta primero el mecanismo del repo** —pipeline de CI, plataforma que despliega al mergear,
contenedores, un script, o nada— y trabaja con él. Como en las migraciones: no metas una
herramienta nueva dentro de una tarea que no la pidió. Si no hay mecanismo detectable, el plan
se escribe igual y lo ejecuta una persona.

## Reglas duras

Se cumplen siempre; una excepción es una decisión del usuario, no tuya, y se registra por
escrito.

1. **El plan de entrega se escribe antes de desplegar.** Qué va, en qué orden, qué se mira
   después y cómo se vuelve atrás. Escrito durante el despliegue es un plan que ya no sirve:
   lo que hace falta a los cuatro minutos de una caída es leerlo, no redactarlo.
2. **La vuelta atrás se decide antes, y con la pregunta honesta delante: ¿se puede?** No todo
   se revierte redesplegando la versión anterior. Si el cambio aplicó una migración, tocó un
   sistema de terceros o mandó correos, **el redespliegue no deshace nada de eso**. Un cambio
   sin vuelta atrás real no está prohibido: está obligado a decirlo, y entonces el gate humano
   pesa el doble.
3. **Lo que no se puede revertir por despliegue va detrás de una bandera.** Una bandera se
   apaga en segundos y sin pasar por el pipeline; un redespliegue tarda lo que tarde el
   pipeline. Cuando el coste de equivocarse es alto, esa diferencia es la que cuenta.
4. **Un despliegue, un cambio.** Si van dos cosas juntas y algo se cae, no sabes cuál fue, y
   revertir te lleva por delante la que sí funcionaba.
5. **El orden respecto al esquema no se improvisa.** Primero la migración que añade y no rompe,
   después el código que lo usa, y la retirada de lo viejo en un cambio **posterior** — regla 6
   de `migraciones-de-datos` (skill de OpenCode, auto-activable). Desplegar código que exige un esquema que todavía no está
   es una caída durante el propio despliegue.
6. **Configuración nueva, con valor por defecto y documentada.** Una variable de entorno que
   solo existe en tu máquina no rompe en la tuya: rompe en el arranque del entorno de alguien
   más, y con un error que no menciona la variable. Si no puede tener valor por defecto —un
   secreto—, el arranque falla **temprano y diciendo cuál falta**.
7. **Nada se despliega sin saber qué se mira después y durante cuánto.** Si no puedes nombrar
   la señal que te diría que esto ha salido mal, no tienes una entrega: tienes una esperanza.
   El detalle de qué instrumentar está en `observabilidad` (skill de OpenCode, auto-activable).
8. **Lo irreversible lleva gate humano**, y aquí «irreversible» incluye lo que sale de la
   máquina: correos enviados, webhooks disparados, pagos, mensajes a terceros. El hook
   `destructive-guard` cubre el puñado de comandos destructivos; esto no lo cubre nadie más
   que tú.

## Cómo sale: cuatro formas y cuándo cada una

| Forma | Cuándo | Lo que cuesta |
|---|---|---|
| **Directo** | El cambio es aditivo, reversible redesplegando y de impacto acotado | Nada. Es el caso normal y no hay que justificarlo |
| **Bandera** | No se puede revertir por despliegue, o quieres soltarlo a un grupo primero | Código con dos caminos vivos, y **una fecha para retirar la bandera**: la que se queda es deuda |
| **Canario** | El riesgo está en el volumen o en datos reales que no tienes en local | Requiere poder dirigir una parte del tráfico y mirarla aparte |
| **Azul-verde** | La vuelta atrás tiene que ser inmediata y el cambio no es compatible con la versión anterior | Dos entornos completos a la vez |

**Por defecto, directo.** Las otras tres se eligen cuando una fuerza concreta lo pide —igual
que en `arquitectura` (skill de OpenCode, auto-activable): lo caro se paga solo cuando algo te obliga—. Elegir canario para
un cambio de copy es la versión de despliegue de la sobre-ingeniería.

Y una nota sobre ramas, porque decide el riesgo antes de que empiece la entrega: **cuanto más
vive una rama, más cara es su mezcla**. Ramas cortas que entran a menudo hacen despliegues
pequeños, y un despliegue pequeño es el que se puede revertir sin pensar.

## Cómo aplicarla

- **En `/plan`:** si la tarea toca esquema, configuración, una tarea programada, un manifiesto
  de despliegue o una frontera que alguien ya consume, el **plan de entrega entra en `spec.md`**
  — orden, forma de salida, bandera si la hay, vuelta atrás y qué se vigila. Es el sitio donde
  la decisión de orden de `migraciones-de-datos` (skill de OpenCode, auto-activable) por fin vive. Si no toca nada de eso,
  dilo en una línea y sigue: sin inventario ni relleno.
- **En `/implement`:** la bandera se escribe **con** el código que envuelve, no después, y con
  su fecha de retirada apuntada. La configuración nueva se añade al ejemplo del repo en el mismo
  commit que la lee.
- **En `/review`:** recorre el diff contra las ocho reglas si toca algo de lo de arriba. Cambio
  sin vuelta atrás posible y sin declararlo, orden que rompe la versión en curso, y variable
  nueva sin valor por defecto ni documentar son severidad **Alta**: no fallan en tu entorno,
  fallan en el arranque del siguiente.
- **Al entregar:** el plan escrito se ejecuta paso a paso, y **el gate humano va antes del paso
  que no se deshace**. Lo que se vigila después se mira de verdad durante la ventana que se
  escribió, no «un rato».

## Anti-patrones (nómbralos para no caer en ellos)

- **«Si algo va mal, revertimos»** — dicho sin comprobar que se puede. Es la frase que precede
  al descubrimiento de que la migración ya se aplicó.
- **El despliegue del viernes** — no por superstición: porque la ventana de vigilancia cae
  cuando no hay nadie mirando, y eso es justo lo que la regla 7 pide que exista.
- **Aprovechar el viaje** — «ya que desplegamos, metemos también aquello». Rompe la regla 4 y
  convierte una vuelta atrás limpia en una elección entre dos males.
- **La bandera eterna** — se puso para soltar con red, salió bien, y tres años después el código
  sigue teniendo dos caminos y nadie sabe cuál corre en producción.
- **Configurar en el panel y no en el repo** — funciona, y deja el entorno sin forma de
  reconstruirse. El siguiente que monte el proyecto descubrirá la variable por el error.
- **Desplegar y cerrar la tarea** — la entrega no termina al desplegar, termina cuando la señal
  que dijiste que ibas a mirar dice que está bien.

## Autocrítica antes de cerrar la entrega

Antes de dar una entrega por buena, pregúntate: **¿está escrito el plan, o lo llevo en la
cabeza? ¿la vuelta atrás existe de verdad, la he comprobado, y he dicho en voz alta lo que el
redespliegue NO deshace? ¿va un solo cambio? ¿el código nuevo puede convivir con el esquema y
con la versión anterior mientras dura el despliegue? ¿arranca en un entorno limpio, sin nada que
solo esté en mi máquina? ¿sé qué voy a mirar, durante cuánto, y quién se entera si se tuerce?**
Si algo falla, corrígelo antes de seguir.
