---
name: incidente-en-produccion
description: "Úsala cuando se haya caído algo en producción ahora mismo y haya usuarios sufriéndolo. Síntomas: vas a reiniciar el servidor antes de guardar el error; te piden saltarte un gate porque urge; has apagado la bandera y das el incidente por cerrado; o cambias tres cosas a la vez a ver cuál lo arregla."
---
# Incidente en producción (la ruta con la ceremonia apagada)

El README del plugin dice que este flujo no sirve para una emergencia: «a las tres de la mañana
lo que necesitas es desplegar y documentar después». Es verdad, y por eso hace falta escribir
**qué se apaga exactamente y qué no**. Sin eso, «es una urgencia» se convierte en la llave que
abre todas las puertas, incluidas las que nunca deben abrirse.

Un incidente es que **algo está roto ahora y alguien lo está sufriendo**. No es un bug
prioritario, ni una tarea con prisa. Si nadie lo está sufriendo todavía, no estás en un
incidente: estás en una tarea urgente, y el flujo normal sirve.

## El orden, que no es el de siempre

`depuracion-sistematica` (skill de OpenCode, auto-activable) tiene una ley: ningún arreglo sin causa raíz primero. **Aquí
esa ley se invierte durante la primera fase, y solo durante esa.**

1. **Estabilizar.** Parar el daño: apagar la bandera, volver a la versión anterior, cortar el
   proceso que corrompe, poner el mantenimiento. Mitigar **no es arreglar** y no requiere
   entender la causa. Este es el único momento del flujo entero donde actuar sin diagnóstico
   es lo correcto.
2. **Capturar la evidencia, antes de que desaparezca.** Es el paso que más se salta y el único
   **irrecuperable**: los registros rotan, el estado se sobrescribe, el proceso se reinicia y
   se lleva la pista. Antes de reiniciar nada, guarda lo que haya —mensaje de error completo,
   identificadores, hora, qué se desplegó por última vez y cuándo—. Reiniciar es a menudo la
   mitigación correcta y a la vez la destrucción de la prueba: guarda primero.
3. **Diagnosticar.** Ahora sí, `depuracion-sistematica` (skill de OpenCode, auto-activable) entera y sin atajos. Con el
   sistema ya estable, la prisa se acabó — y creerse la primera hipótesis es lo que provoca el
   segundo incidente.
4. **Arreglar y entregar**, con `entrega-y-despliegue` (skill de OpenCode, auto-activable). Un cambio, y con vuelta atrás
   comprobada: el arreglo apresurado que rompe otra cosa es un clásico.
5. **Cerrar por escrito.** Una entrada, no un informe.

## Lo que se apaga y lo que no

| Se suspende | Se mantiene, y aquí no hay excepción |
|---|---|
| `spec.md` y sus criterios de aceptación | **Todo lo irreversible**: borrados, migraciones destructivas, `push --force`, vaciar tablas |
| El TDD estricto criterio a criterio | **Los secretos**: nada de pegar credenciales en un chat o en un ticket para ir más rápido |
| La rama de tarea y el orden del flujo | **La evidencia**: no se destruye la pista para ir más deprisa (paso 2) |
| La revisión previa a desplegar | **Decir lo que has hecho**: cada acción sobre producción se anuncia según ocurre |
| El gate de commit y el de PR | **El gate de lo que no vuelve atrás**: sigue siendo del usuario, y se pide aunque urja |

La columna de la derecha es la razón de ser de esta guía. **La prisa es justo cuando lo
irreversible sale más caro**: es cuando se ejecuta un `DELETE` sin `WHERE` sobre producción
creyendo que se está arreglando algo. El hook `destructive-guard` seguirá preguntando, y su
pregunta **no se contesta con «es una urgencia»**.

## Reglas duras

1. **Anuncia lo que vas a hacer antes de hacerlo, y lo que has hecho después.** En un incidente
   suele haber más de una persona actuando. Dos mitigaciones simultáneas sin coordinar producen
   un tercer problema que nadie sabe explicar.
2. **Una cosa cada vez.** Cambiar tres cosas a la vez y ver que mejora no te dice cuál fue, y
   te deja dos cambios sin justificar en producción.
3. **Mitigar no cierra el incidente.** Si has apagado una bandera, el incidente sigue abierto:
   está contenido, no resuelto. Decirlo evita que todos se vayan a casa.
4. **La causa raíz se sigue debiendo.** Si no da tiempo hoy, es `deuda-tecnica` (skill de OpenCode, auto-activable) con las
   cuatro piezas escritas —y su señal de cobro es «antes de volver a tocar esto».
5. **Nada de cambios de mejora dentro del arreglo.** El «ya que estoy» en producción, a las
   tres de la mañana, sin revisión, es cómo un incidente se convierte en dos.

## Cómo aplicarla

- **Al detectarlo:** lo primero es la fase 1, y lo segundo la 2. No abras `/start`, no crees
  una rama de tarea, no escribas una spec. Eso viene después y puede que en otra tarea.
- **Durante:** `escritura-natural` (skill de OpenCode, auto-activable) para lo que digas por el canal que sea — hecho,
  impacto, acción, y nada de preámbulos cuando alguien está esperando para decidir.
- **Al cerrar:** **una** entrada con `registro-progreso` (skill de OpenCode, auto-activable) —qué pasó, qué lo causó, qué
  se hizo, qué queda pendiente y con qué señal—, no un postmortem de diez páginas que nadie
  escribirá y por tanto nadie leerá.
- **Y la pregunta que más valor deja:** ¿qué señal debería haber avisado antes que el usuario, y
  por qué no existía? Eso es trabajo para `observabilidad` (skill de OpenCode, auto-activable), y es la única forma de que
  el incidente sirva para algo más que para arreglarlo.

## Anti-patrones (nómbralos para no caer en ellos)

- **Reiniciar antes de mirar** — funciona, y se lleva por delante la única copia de la pista.
  Volverá a pasar, y no sabrás por qué.
- **«Es una urgencia» como llave maestra** — sirve para saltarse la ceremonia, no lo
  irreversible ni los secretos. Quien te lo pida no está pidiendo velocidad: está pidiendo que
  asumas tú el riesgo.
- **Arreglar la causa antes de parar el daño** — elegante, y mientras tanto los usuarios siguen
  sufriéndolo. Primero se estabiliza.
- **Diagnosticar a base de intentos** — la prisa hace que probar cosas parezca más rápido que
  pensar. No lo es, y además cada intento cambia el estado del sistema.
- **Cerrar al mitigar** — la bandera apagada esconde el problema, no lo quita. El incidente
  sigue abierto hasta que la causa está entendida.
- **El postmortem como castigo** — buscar al culpable garantiza que el siguiente incidente se
  reporte más tarde, o no se reporte.
- **Dejar la mitigación puesta para siempre** — la bandera apagada «temporalmente» hace tres
  meses es una funcionalidad muerta que nadie ha decidido matar.

## Autocrítica antes de cerrar el incidente

Antes de darlo por cerrado, pregúntate: **¿está el daño parado, o solo he entendido la causa?
¿guardé la evidencia antes de reiniciar nada? ¿he hecho un solo cambio cada vez, y he dicho
cuáles? ¿he ejecutado algo irreversible sin que el usuario lo aprobara, escudándome en la
prisa? ¿la mitigación es permanente sin que nadie lo haya decidido? ¿queda escrito qué pasó y
qué se debe todavía? ¿qué señal debería haber avisado, y existe ya?** Si algo falla, corrígelo
antes de cerrar.
