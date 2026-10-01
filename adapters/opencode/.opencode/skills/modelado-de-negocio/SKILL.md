---
name: modelado-de-negocio
description: "Úsala cuando un flujo de negocio tenga estados y transiciones, varios actores, o un término que cada persona llama distinto. Síntomas: no sabes si el pedido se registra antes o después de validarse; un campo «estado» tiene valores sin lista ni transiciones; en sala lo llaman de una forma y en el código de otra."
---
# Modelado de negocio (entender el proceso antes de partirlo)

`diagramas` (skill de OpenCode, auto-activable) decide **si se dibuja, para quién y a qué altura**. Esta decide otra cosa,
anterior: **qué hay que entender del negocio antes de escribir código**, y cuándo merece la pena
dibujarlo.

El fallo que evita es concreto y no lo detecta ningún test: implementar «validar → enviar»
cuando el negocio exige «validar → registrar → enviar». El código funciona, los criterios pasan,
la revisión aprueba, y el proceso está mal. Nadie lo ve en un diff porque el diff no sabe cómo
funciona el negocio.

**Y el freno primero, porque esta es de las guías que se sobre-aplican:** no se modela por
sistema. Se modela cuando hay **estados**, **más de un actor**, o **un término que cada persona
entiende distinto**. Si la tarea es «añade un campo al formulario», no hay nada que modelar.

## Las tres piezas, y ninguna más

Adam Smith describió la fábrica de alfileres en 1776 con exactamente esto, y sigue bastando:

- **Actores** — quién hace cada cosa. Personas con un papel («jefe de cocina»,
  «administración»), no usuarios genéricos. Y los sistemas externos también son actores.
- **Actividades** — qué hace cada uno, y **en qué orden**. Aquí es donde aparecen los pasos que
  nadie había contado.
- **Artefactos** — qué se produce o se consume en cada paso: un albarán, una comanda, un
  registro. El artefacto suele ser la entidad que falta en tu modelo de datos.

Si puedes escribir las tres en un párrafo claro, **no dibujes nada**. El diagrama es para
cuando el párrafo ya no se sostiene.

## La máquina de estados es un contrato, no un dibujo

Cuando algo del negocio pasa por fases —un pedido, una reserva, una factura, una solicitud—, la
lista de estados y sus transiciones **es una regla de negocio**, con la misma fuerza que un
criterio de aceptación. Y es la pieza que más barato sale acertar y más cara sale corregir.

Tres reglas al escribirla:

1. **Los estados se nombran en participio o gerundio** —`Registrado`, `Enviando`—, nunca en
   infinitivo ni imperativo (`Registrar`). Un infinitivo es una acción, y confundir acción con
   estado es cómo acaban las dos mezcladas en la misma columna.
2. **Toda transición tiene su evento**, y desde un mismo estado no salen dos transiciones con
   el mismo evento salvo que haya una condición que las distinga. Si la hay, escríbela.
3. **Lo que no está en el diagrama no puede pasar.** Esa es la parte de contrato: si alguien
   necesita ir de `Cancelado` a `Enviado`, o el modelo está incompleto o el negocio tiene un
   agujero. Las dos respuestas son valiosas y las dos se descubren preguntando.

## El lenguaje del negocio, y por qué importa en el código

Si en la conversación se dice «comanda» y en el código se llama `OrderItem`, cada lectura
futura paga una traducción. Peor: cuando dos personas del equipo usan el mismo término para
cosas distintas, el error no aparece hasta que el código ya tiene las dos.

Así que el modelado produce **una lista corta de términos con su definición**, y esos términos
son los que se usan al nombrar clases, tablas y funciones — es lo que `codigo-limpio` (skill de OpenCode, auto-activable)
pide cuando dice que el código debe hablar el lenguaje del dominio. Un término que el negocio
no usa es un término que alguien se inventó.

## Cómo aplicarla

- **En `/define`:** si el trabajo toca un proceso con estados o varios actores, modélalo
  **antes** de trocear. Partir un proceso que no entiendes produce tareas que se solapan y
  criterios que se contradicen entre sí.
- **En `/plan`:** el resultado va al «contexto de proceso de negocio» de la historia
  (`historias-usuario` (skill de OpenCode, auto-activable)). Ahí es donde `/implement` lo leerá, y donde `/review` puede
  contrastar si el código respeta el orden que el negocio exige.
- **En `/implement`:** los estados del modelo son los del código. Si al implementar descubres
  un estado que el modelo no tenía, **eso es un hallazgo del negocio**, no un detalle: dilo
  antes de añadirlo por tu cuenta.
- **Al dibujar**, si hace falta: `diagramas` (skill de OpenCode, auto-activable) decide formato y altura. Aquí solo se
  decide **qué** hay que mostrar.

## Anti-patrones (nómbralos para no caer en ellos)

- **Modelar el sistema en vez del negocio** — dibujar tus tablas y llamarlo proceso. El modelo
  de negocio describe lo que pasa **con o sin** tu software.
- **Modelar el «to be» sin haber entendido el «as is»** — la situación deseada sin la actual no
  tiene con qué compararse, y lo que se rediseña suele ser justo el paso que no se conocía.
- **El diagrama que abarca todo** — actores, estados, tablas y tecnologías en el mismo dibujo.
  Se pierde la idea; es la regla de altura de `diagramas` (skill de OpenCode, auto-activable), incumplida.
- **Estados en infinitivo** — `Enviar`, `Aprobar`. Parecen inocentes y acaban conviviendo con
  `Enviado` en la misma columna de la base de datos.
- **Dar por hecho el orden** — «primero se valida y luego se envía, es lo lógico». Lo lógico es
  tu lógica; el orden del negocio se pregunta.
- **Modelar cuando no hace falta** — un formulario no tiene proceso. Media hora de dibujo para
  una tarea de una hora es el mismo desperdicio que cualquier otra sobre-ingeniería.

## Autocrítica antes de cerrar el modelo

Antes de dar por entendido un proceso, pregúntate: **¿puedo nombrar los actores, las
actividades y los artefactos sin mirar? ¿sé el orden, o lo estoy dando por lógico? ¿los estados
están en participio, y sé qué transición NO existe? ¿hay algún término que dos personas del
equipo estén usando distinto? ¿esto hacía falta modelarlo, o me he puesto a dibujar un
formulario?** Si algo falla, corrígelo antes de seguir.
