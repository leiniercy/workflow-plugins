---
name: observabilidad
description: "Úsala al decidir qué log, qué métrica, qué traza o qué alerta acompañan a una frontera nueva —endpoint, tarea programada, integración con un tercero— y con qué umbral. Síntomas: de una caída se entera antes el cliente que vosotros; un catch vacío; un cron o proceso que corre cada noche deja de dispararse sin dar error; una alerta que nadie atiende; un log sin identificador con el que correlacionar la petición que falló."
user-invocable: false
license: MIT
---
# Observabilidad (qué señal te diría que esto salió mal)

`entrega-y-despliegue` (`${CLAUDE_PLUGIN_ROOT}/skills/entrega-y-despliegue/SKILL.md`) exige, en su regla 7, que nada salga sin saber qué se mira
después. Esta guía resuelve **qué es ese «qué»**, y tiene el mismo freno que
`rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`): no se instrumenta por inventario.

La pregunta no es «¿qué podríamos medir?» —la respuesta es todo, y por eso no sirve—. Es:
**si este cambio concreto se tuerce, ¿cómo me entero, y me entero antes que el usuario?** Si no
sabes contestarla, el cambio se despliega a ciegas aunque el panel esté lleno de gráficas.

Cubre la característica **fiabilidad** de ISO 25010 (`calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`)) por el lado
que no se ve en el diff: un sistema no es fiable porque el código esté bien, sino porque
alguien se entera cuando deja de estarlo.

## Las tres señales, y qué pregunta contesta cada una

| Señal | Contesta | Cuándo es la correcta |
|---|---|---|
| **Registro** (log) | Qué pasó, con su contexto | Un suceso concreto que querrás reconstruir después: un fallo, una decisión del sistema, una frontera cruzada |
| **Métrica** | Cuánto, cuántas veces, cuánto tardó | Algo que solo tiene sentido agregado: tasa de error, latencia, cola pendiente |
| **Traza** | Por dónde pasó y dónde se fue el tiempo | Varios servicios o varios saltos, y la pregunta es «cuál de ellos» |

Elegir mal sale caro en las dos direcciones: un registro por cada petición para saber el
volumen es una métrica escrita de la forma más cara posible; y una métrica que sube sin
registros detrás te dice que algo falla y no qué.

## Reglas duras

1. **Una señal nombrada por cambio, antes de desplegar.** Concreta: qué se mira, qué valor es
   normal y a partir de cuál hay problema. «Miraremos los logs» no es una señal.
2. **Un registro sin contexto no sirve.** Lo que se busca a las tres de la mañana es *esta*
   petición, *este* usuario, *este* pedido — así que el registro lleva el identificador que
   permite correlacionarlo. Un `console.log("error")` es ruido con coste de disco.
3. **Ni datos personales ni secretos en los registros.** Un registro se replica, se exporta y
   lo ve gente que no tiene acceso a la base de datos. El identificador vale; el contenido, no.
4. **El error que se traga no existe.** Un `catch` vacío, o que registra y sigue como si nada,
   convierte un fallo en un comportamiento raro que nadie sabrá explicar dentro de un mes.
5. **Una alerta que salta y nadie atiende es peor que no tenerla.** Entrena a ignorar el canal
   entero — el mismo antipatrón del «bloqueo fantasma» que nombra `registro-progreso` (`${CLAUDE_PLUGIN_ROOT}/skills/registro-progreso/SKILL.md`).
   Si nadie va a actuar, no es una alerta: es una métrica, y va a un panel.
6. **Lo que se instrumenta se instrumenta con el cambio**, no en una tarea posterior. La tarea
   posterior no llega, y cuando llega ya nadie recuerda qué había que vigilar.
7. **No instrumentes lo que ya está instrumentado.** Antes de añadir, mira qué recoge ya el
   repo. Una segunda métrica de lo mismo con otro nombre es peor que ninguna: obliga a decidir
   cuál miente.

## Qué vigilar según lo que haya cambiado

| El cambio trae | La señal que casi siempre toca |
|---|---|
| Endpoint o handler nuevo | Tasa de error y latencia. Y quién lo llama, si es público |
| Tarea programada o en segundo plano | Que **se ejecutó**, cuánto tardó y cuántos elementos procesó. Una tarea que deja de dispararse no da error: deja de dar señales |
| Integración con un tercero | Errores y tiempo de respuesta **del tercero**, separados de los tuyos. Cuando se cae, la pregunta es de quién es la culpa |
| Migración o transformación de datos | Cuántas filas tocó, frente a cuántas esperabas. La diferencia es el hallazgo |
| Cambio detrás de una bandera | La señal **partida por el valor de la bandera**, o no sabrás si la diferencia la trae tu cambio |

## Cómo aplicarla

- **En `/plan`:** si la tarea activa la característica de fiabilidad, el requisito no funcional
  lleva la señal con su umbral — si no, no es verificable en `/review` ni se puede escribir un
  test que lo defienda. Es la misma exigencia que `rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`) hace con sus cuatro
  piezas.
- **En `/implement`:** la instrumentación entra con el código del criterio, en el mismo commit.
  Y se comprueba que emite: una métrica que nadie ha visto emitir todavía no existe.
- **En `/review`:** frontera nueva sin ninguna señal, `catch` que se traga el error, y dato
  personal o secreto en un registro son hallazgos. El último es severidad **Alta** y cruza con
  la dimensión de seguridad.
- **Al entregar:** la señal escrita se mira durante la ventana escrita
  (`entrega-y-despliegue` (`${CLAUDE_PLUGIN_ROOT}/skills/entrega-y-despliegue/SKILL.md`)), y lo que se vea se apunta — también si no se vio nada, que
  es el resultado más frecuente y el que cierra la entrega.

## Anti-patrones (nómbralos para no caer en ellos)

- **Instrumentar todo «por si acaso»** — coste, ruido, y la señal que importaba enterrada entre
  las que no. Es la sobre-ingeniería de este terreno.
- **El panel que nadie mira** — bonito, caro y sin dueño. Si no hay alguien que lo abra o algo
  que le avise, no es observabilidad: es decoración.
- **Alertar sobre la causa en vez de sobre el efecto** — «la CPU al 90 %» despierta a alguien
  aunque los usuarios estén perfectamente. Se alerta de lo que le duele a quien usa el sistema.
- **Registrar el objeto entero** — el volcado completo lleva dentro el correo, el teléfono y a
  veces el token. Rompe la regla 3 sin que nadie lo decida.
- **«Lo vigilamos los primeros días»** — sin decir qué, sin umbral y sin quién. Se traduce en
  que nadie lo mira a partir del segundo.
- **Poner la métrica y no mirarla nunca** — la instrumentación no es el objetivo; enterarse
  sí. Si nadie la consultó en tres meses, sobra.

## Autocrítica antes de cerrar

Antes de dar por instrumentado un cambio, pregúntate: **¿puedo nombrar la señal que me diría
que esto ha salido mal, con su umbral? ¿me entero antes que el usuario? ¿el registro lleva con
qué correlacionarlo, y no lleva nada que no deba salir de la base de datos? ¿hay algún error
que se esté tragando en silencio? ¿lo que he añadido ya estaba recogido en otro sitio? ¿si esto
alerta, alguien va a hacer algo?** Si algo falla, corrígelo antes de seguir.
