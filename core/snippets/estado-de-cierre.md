**Estado de salida.** Termina el mensaje con una de estas cuatro líneas, tal cual y en la
última línea de todo:

- `ESTADO: HECHO` — se hizo lo que el comando promete, y lo has comprobado.
- `ESTADO: HECHO CON RESERVAS` — se hizo, pero queda algo que el usuario tiene que saber.
- `ESTADO: BLOQUEADO` — no se pudo seguir.
- `ESTADO: FALTA CONTEXTO` — hace falta un dato o una decisión que solo tiene el usuario.

Las tres últimas llevan encima tres líneas, una por campo: **Motivo** (qué pasa),
**Intentado** (qué probaste de verdad, no qué ibas a probar) y **Siguiente** (qué necesitas,
o qué recomiendas). `HECHO` no lleva ninguna: si te sobra algo que contar, no era `HECHO`.
