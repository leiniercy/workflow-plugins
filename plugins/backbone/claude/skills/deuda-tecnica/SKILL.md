---
name: deuda-tecnica
description: "Úsala al decidir si un atajo se contrae a sabiendas, se paga ahora o se aplaza con su señal de cobro. Síntomas: dudas entre hacerlo rápido y sucio o hacerlo bien; te oyes decir «ya lo refactorizamos más adelante»; el arreglo correcto es más grande que la tarea y hay una fecha encima; vas a limpiar de paso un módulo que esta tarea no pedía."
user-invocable: false
license: MIT
---
# Deuda técnica (nombrarla, ponerle precio y decidir si se paga)

`codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`) sabe reconocer un olor y `/review` sabe reportarlo con severidad Media.
Lo que no había es **qué se hace con eso**: un hallazgo de deuda sin decisión detrás se lee,
se asiente y se olvida. Esta guía cierra ese lado.

La metáfora es de Ward Cunningham (1992) y es financiera a propósito: **la deuda permite
entregar antes a cambio de pagar intereses después**. Eso la hace una decisión de inversión,
no un defecto moral. Endeudarse a sabiendas y por un motivo es ingeniería. Endeudarse sin
enterarse no es deuda: es un descuido con mejor nombre.

Y hay un detalle que decide casi todo lo demás: **los intereses se cobran al modificar**.
Código feo que nadie toca no cuesta nada. Por eso la deuda no se paga donde más fea está, sino
**donde se está trabajando**.

## Las cuatro clases, y qué hacer con cada una

|  | **Prudente** (sabías el coste) | **Imprudente** (no lo valoraste) |
|---|---|---|
| **Deliberada**<br><span>«lo dejo así por ahora»</span> | La única legítima. Se registra con su motivo, su coste estimado y su señal de cobro | «No hay tiempo de hacerlo bien» sin mirar qué cuesta. Es la que se normaliza: páralo y estima |
| **Accidental**<br><span>«ahora sé cómo debería haberse hecho»</span> | Inevitable y sana: el diseño se entiende construyéndolo. Se apunta cuando aparece | Ignorancia que nadie corrige. No se arregla con una nota: se arregla aprendiendo |

**La única que se puede decidir es la deliberada y prudente.** Las otras tres se detectan, y
detectarlas ya es la mitad del trabajo.

## Reglas duras

1. **Deuda que no está escrita no existe.** No en la cabeza de quien la contrajo: en
   `spec.md` («Decisiones tomadas») si se decide al planificar, o en `progress.md` si aparece
   al implementar. La nota lleva **cuatro cosas**: qué se dejó, por qué, qué costaría hacerlo
   bien, y **qué señal dirá que toca pagarla**.
2. **Sin señal de cobro, no es una decisión: es un aplazamiento indefinido.** La señal es
   concreta —«cuando haya un tercer tipo de descuento», «si este endpoint pasa de N peticiones»,
   «la próxima vez que alguien toque este módulo»—, no «más adelante».
3. **No se paga deuda dentro de una tarea que no la pidió.** La regla del *boy scout* de
   `codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`) tiene un límite: mejorar **lo que tocas**, no el módulo entero. Un
   refactor que se cuela en una tarea ajena rompe la revisión —nadie sabe qué es el cambio y
   qué es la limpieza— y es scope creep con buena intención.
4. **Si el arreglo es más grande que la tarea, es otra tarea.** Se nombra, se estima en una
   línea y se propone. Lo que no vale es hacerlo a escondidas ni callarlo.
5. **La deuda preexistente no bloquea una PR.** Es de `/review` con severidad Media, entra en
   el informe y ahí se queda. Bloquear por algo que ya estaba roto antes del cambio castiga a
   quien pasó por al lado.
6. **La deuda tiene dueño o no tiene nada.** «Alguien debería» es la forma educada de «nadie
   va a». Si nadie la asume, la decisión real fue no pagarla nunca — dilo así.

## Cómo aplicarla

- **En `/plan`:** si el enfoque elegido contrae deuda a propósito —una abstracción que sabes
  que no aguanta el tercer caso, un atajo por una fecha—, entra en «Decisiones tomadas» con las
  cuatro piezas de la regla 1. Es parte del enfoque técnico, no una nota al pie.
- **En `/implement`:** cuando en el paso de refactor veas que lo correcto excede la tarea,
  **para y nómbralo** en lugar de hacerlo o de callarlo. Una línea en `progress.md` con la
  señal de cobro, y sigue con el criterio.
- **En `/review` (dimensión 4):** repórtala como hallazgo solo si **el diff la introduce o la
  empeora** y supera el umbral de `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`). Lo preexistente, los nitpicks y
  lo que pillaría el linter no son deuda: son ruido con nombre grandilocuente.
- **Al recibir un hallazgo de deuda:** `recepcion-de-revision` (`${CLAUDE_PLUGIN_ROOT}/skills/recepcion-de-revision/SKILL.md`) — se verifica contra el
  código antes de aceptarlo. Y aceptarlo no significa pagarla ahora: significa decidir, con las
  cuatro piezas escritas.

## Anti-patrones (nómbralos para no caer en ellos)

- **«Ya lo refactorizamos más adelante»** — sin señal y sin dueño. Es la frase que convierte
  una decisión en una esperanza.
- **El refactor de contrabando** — limpiar de paso, en la misma PR, sin decirlo. Quien revisa
  no puede separar tu cambio de tu limpieza, así que revisa peor las dos cosas.
- **Llamar deuda a lo que es un bug** — un comportamiento incorrecto no es deuda, es un
  defecto, y tiene otra severidad y otra urgencia. Mezclarlos abarata los dos términos.
- **La reescritura como pago** — «esto está tan mal que lo rehago entero» casi nunca es pagar
  deuda: es contraer una nueva y muchísimo mayor, con la ventaja de que todavía no se nota.
- **El registro de deuda que nadie lee** — una lista que crece y nunca mengua no es un
  inventario de decisiones, es un cementerio. Si nada de lo que hay dentro tiene señal y dueño,
  la lista sobra.
- **Cobrarse los intereses en el peor momento** — descubrir la deuda mientras arreglas una
  incidencia. Se evita con la regla 2: la señal se define **antes**, no cuando ya duele.

## Autocrítica antes de cerrar

Antes de dar por buena una tarea que tocó o contrajo deuda, pregúntate: **¿lo que dejé a medias
está escrito, con motivo, coste y señal de cobro? ¿he limpiado algo que esta tarea no pedía, y
lo he mezclado en el mismo diff? ¿lo que llamo deuda es deuda, o es un bug con un nombre más
cómodo? ¿la señal que he escrito es comprobable, o es «más adelante» con otras palabras? ¿esto
tiene dueño?** Si algo falla, corrígelo antes de seguir.
