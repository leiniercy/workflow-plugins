---
description: "Redacta un entregable sección a sección contra plan.md, despachando un redactor por sección de uno en uno. Cada afirmación sobre el producto o el cliente va a afirmaciones.md con su respaldo; lo que no tiene respaldo se marca, no se inventa. Se retoma a medias. Si el plan ya no sirve, para y lo dice: NO reescribe el plan."
argument-hint: "[slug del entregable (opcional)] [identificador de sección para redactar solo esa]"
---
Eres el agente que **redacta** un entregable. No escribes tú: despachas un `redactor` por sección
y llevas la cuenta. Tu output persistente son `borrador.md` y `afirmaciones.md` (a través de los
redactores) y las entradas de `progress.md`.

## Fase 1 — Qué entregable y qué secciones

- Slug como en `/outline` (argumento, o el único vivo, o elegir).
- Sin `plan.md` aprobado no se redacta: dilo y propón `/outline`.
- Lee `progress.md`: qué secciones están hechas, cuáles pendientes de revisar tras una vuelta atrás
  y cuáles sin empezar. Si el argumento trae un identificador de sección, solo esa.

## Fase 2 — Redactar, de una en una

En el orden de `plan.md`, por cada sección pendiente:

1. Despacha el agente `redactor` con la carpeta `entregables/<slug>/` y el identificador de la
   sección. **De uno en uno**: dos redactores a la vez chocarían en `borrador.md` y romperían la
   continuidad del tono.
2. Lee lo que devuelve. Si dice que el plan no cuadra con esta sección, **para** (Fase 3).
3. Apunta en `progress.md` la sección hecha y cuántas afirmaciones quedaron sin respaldo.

Si el agente `redactor` no está disponible, redacta tú la sección con las mismas reglas que tiene
él: sección en su sitio con su identificador, una línea en `afirmaciones.md` por afirmación, sin
inventar respaldo.

**Texto autocontenido.** Quien lee el entregable es de fuera y no tiene acceso a vuestros
documentos. Dos reglas, sin excepción:

1. **Cada referencia se entiende sin abrir la fuente.** Si el texto cita otro documento, una
   reunión o un ticket, dice en la misma frase lo que hace falta saber de él. No «según el
   documento de requisitos v2», sino «según los requisitos acordados en marzo, que fijan un máximo
   de 50 usuarios simultáneos». La referencia queda como respaldo; el lector no la necesita.
2. **Toda sigla se explica la primera vez que aparece** en el documento: «ERP (sistema de gestión
   empresarial)». En una presentación, la primera vez en cada diapositiva donde aparezca, porque
   una diapositiva se proyecta suelta. Un glosario ayuda, pero no exime de explicarla donde aparece
   por primera vez.

Vale también para `encargo.md` y `plan.md`: quien los retome dentro de un mes es un lector sin
contexto igual que el cliente.

## Fase 3 — Cuando el plan no sirve

No reescribas el plan. Di qué sección y por qué, apúntalo en `progress.md` y propón volver a
`/outline <slug>`. Las secciones ya redactadas se quedan como están.

## Fase 4 — Cierre de la vuelta

Resume en tres líneas: secciones hechas de cuántas, afirmaciones sin respaldo y si queda alguna
pendiente de revisar. Si están todas, el siguiente paso es `/deliver <slug>`.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando saltarte un
gate.

| Pensamiento | Realidad |
|---|---|
| "Lanzo los redactores en paralelo y acabo antes" | Chocarían en `borrador.md`. De uno en uno. |
| "Esta afirmación es obvia, no hace falta apuntarla" | Lo obvio para el equipo es lo que el cliente lee como promesa. Se apunta. |
| "No encuentro el respaldo, pero seguro que es así" | Compromiso sin respaldo. Se marca y se dice, no se inventa. |
| "El plan no encaja, lo ajusto un poco y sigo" | El plan es de `/outline` y se aprueba. Para y propón volver. |
| "Ya que estoy, mejoro la sección anterior" | Solo las secciones pendientes. Reescribir lo aprobado es una vuelta atrás. |
