---
name: recepcion-de-revision
description: "Úsala al recibir hallazgos de una revisión —informe de /review, comentarios de un humano en la PR, avisos de CI— antes de tocar código. Síntomas: te oyes decir «tienes toda la razón», vas a implementar sin comprobarlo contra el repo, o hay puntos que no entiendes y piensas empezar por los que sí."
user-invocable: false
license: MIT
---
# Recepción de revisión — evaluar antes de implementar

Recibir una revisión es un **acto técnico, no social**. Un hallazgo es una hipótesis de otro
sobre tu código: puede ser correcta, puede estar mal, o puede ser correcta pero irrelevante
para este repo. Tu trabajo es **verificarla contra el código antes de tocar nada**, no
ejecutarla porque venga de un revisor.

Aplícala al recibir hallazgos de cualquier origen: el informe de `/review`, comentarios de un
humano en la PR, avisos de CI o los hallazgos que `/implement` recupera de `progress.md` al
entrar en modo corrección.

## Nada de acuerdo performativo

Prohibido abrir con «tienes toda la razón», «buen apunte», «gracias por detectarlo» o
cualquier variante. No aportan información y sustituyen la comprobación por cortesía.

En su lugar: **replantea el requisito técnico con tus palabras**, pregunta lo que no entiendas,
o simplemente arréglalo y enséñalo en el código. Cuando el hallazgo es correcto, «corregido en
`fichero:línea`: <qué cambió>» dice todo lo que hay que decir.

Si rebatiste y te equivocaste, dilo en una frase y sigue: «comprobado, tenías razón — X sí
hace Y. Lo corrijo». Sin disculpas largas ni justificaciones de por qué rebatiste.

## Proceso

1. **Lee la lista COMPLETA antes de tocar nada.** Los hallazgos se relacionan entre sí; empezar
   por el primero puede hacerte reescribir después.
2. **Aclara TODO lo dudoso antes de implementar NADA.** Si entiendes 4 de 6 hallazgos, no
   implementes esos 4 y preguntes luego: pregunta primero por los 2. Entender a medias produce
   la corrección equivocada.
3. **Verifica cada hallazgo contra el código**, en su contexto completo:
   - ¿Es cierto en este repo, con esta versión, este stack?
   - ¿Rompe algo que hoy funciona?
   - ¿Hay una razón por la que el código está así (compatibilidad, decisión registrada en
     «Decisiones tomadas» de `spec.md`)?
   - ¿Contradice una decisión que el usuario ya tomó? → **para y consúltalo**, no lo apliques.
4. **Filtro YAGNI sobre la sugerencia.** Si el hallazgo pide «implementar esto como es debido»,
   comprueba primero si se usa: si nada lo llama, la respuesta correcta es proponer eliminarlo,
   no construirlo bien. Un revisor puede pedir de más; tú y el revisor respondéis al usuario.
5. **Ordena la corrección**: primero lo que bloquea (rotura, seguridad), luego lo mecánico
   (typos, imports), luego lo complejo (lógica, refactor). **Un hallazgo cada vez, verificando
   cada uno**, nunca en bloque.
6. **Registra el resultado de cada hallazgo.** Corregido, refutado con motivo, o diferido con
   motivo — en `progress.md`. Un hallazgo que desaparece sin dejar rastro es un descarte
   silencioso, y es exactamente lo que la revisión existía para evitar.

## Cuándo rebatir

Rebatir es parte del trabajo, no una falta de colaboración. Hazlo cuando el hallazgo rompa
funcionalidad existente, cuando al revisor le falte contexto, cuando viole YAGNI, cuando sea
técnicamente incorrecto para este stack, cuando exista una razón de compatibilidad, o cuando
contradiga una decisión del usuario.

**Cómo:** con razonamiento técnico y evidencia (`fichero:línea`, el test que lo demuestra), no
a la defensiva. Si no puedes verificarlo, dilo con esas palabras — «no puedo verificar esto sin
X; ¿investigo, pregunto, o sigo?» — en vez de aplicarlo a ciegas.

## El bucle de corrección: tope y salida

Un bucle de corrección sin tope es un bucle infinito. La unidad es una **ronda**: corriges los
hallazgos abiertos y **vuelves a verificar solo lo corregido**.

- **La re-verificación es acotada.** Comprueba cada hallazgo abierto como `corregido` o `no
  corregido`, y busca roturas nuevas **solo en el cambio que acabas de hacer**. Lo que
  descubras fuera de ese alcance se anota como hallazgo diferido; **no alarga esta ronda**.
- **Los hallazgos Bajos no entran al bucle.** Se anotan como diferidos en `progress.md` y se
  decide sobre ellos antes del merge, no ahora.
- **Máximo 3 rondas.** Es el mismo umbral que la depuración sistemática por la misma razón: si
  tres rondas no cierran un hallazgo, lo que falla no es la corrección, es el diseño o la spec.

**Al llegar al tope, adjudica cada hallazgo abierto** — y siempre por escrito en `progress.md`:

| Situación | Qué haces |
|---|---|
| El hallazgo es discutible o el revisor se equivoca | Lo aparcas con el motivo por el que el código se sostiene |
| Es real, pero nada depende de él | Lo aparcas como deuda reconocida, con su motivo |
| Es real y **portante** (algo se construye encima, o revela un defecto de la spec) | **PARA** y escala al usuario con el hallazgo, el texto de spec con el que choca y el historial de intentos |

Adjudicar **solo al llegar al tope**. Adjudicar antes para cerrar el bucle es pre-juzgar con
otro nombre.

## Cuando el hallazgo choca con la spec

Si un hallazgo señala como defecto algo que `spec.md` **exige**, no lo descartes por eso: la
autoría de la spec no califica su propio trabajo. Presenta ambas cosas —el hallazgo y el texto
de la spec que lo obliga— y **decide el usuario** cuál manda. Si decide cambiar el enfoque,
queda registrado en «Decisiones tomadas».

## Anti-patrones

| Pensamiento | Realidad |
|---|---|
| «Tienes toda la razón, lo cambio ya» | Acuerdo performativo + implementación sin verificar. Comprueba primero contra el código. |
| «Implemento los que entiendo y luego pregunto» | Los hallazgos se relacionan: la comprensión parcial produce la corrección equivocada. |
| «Lo dice el revisor, será verdad» | Un hallazgo es una hipótesis. Verifícala en su contexto completo. |
| «Corrijo los seis de golpe y ejecuto los tests» | Uno cada vez, verificando cada uno. Si algo se rompe no sabrás qué fue. |
| «Este hallazgo es absurdo, lo ignoro» | Refutarlo está bien; ignorarlo en silencio no. Escribe el motivo en `progress.md`. |
| «Una ronda más y cierra» (tras 3) | Pasado el tope las rondas no convergen: el problema es estructural. Adjudica y escala. |
| «Es un cambio pequeño, no hace falta re-verificar» | Las correcciones sin verificar son la vía habitual de las regresiones. |
| «Lo pide la spec, así que el hallazgo no cuenta» | Es un hallazgo igualmente. Preséntalo con el texto de la spec y que decida el usuario. |

## Autocrítica antes de aplicar un hallazgo

Pregúntate: **¿he abierto el fichero y confirmado que esto es cierto aquí?** Si vas a corregir
solo porque alguien lo escribió con seguridad, todavía no lo has verificado.
