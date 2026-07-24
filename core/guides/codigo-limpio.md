# Código limpio y refactorización segura

Cuando implementas o revisas, no basta con que el código funcione: debe quedar **limpio**.
Esta guía define qué es código limpio, cómo refactorizar sin romper nada y qué **olores de
código** (code smells) buscar y curar. La disciplina es la de refactoring.guru / Fowler,
adaptada a nuestro flujo TDD: se aplica en el **paso de refactor** de `/implement` (con la
suite en verde) y para **nombrar deuda técnica** como hallazgo en `/review`.

Regla de oro: **refactorizar es mejorar la estructura del código SIN cambiar su
comportamiento**. No es añadir funcionalidad, no es corregir bugs y no es reescribir de cero.

## Qué es código limpio (los cinco rasgos)

1. **Obvio para otra persona.** Que funcione no basta: otro programador debe entenderlo sin
   descifrarlo. Lo arruinan los nombres pobres, las clases desmesuradas, los métodos largos y
   los números mágicos.
2. **Sin duplicación.** Cada copia de una lógica obliga a recordar y repetir el mismo cambio en
   todas partes; multiplica el riesgo de inconsistencia. Una sola fuente de cada comportamiento.
3. **El mínimo de componentes.** Menos código es menos que mantener y menos donde esconder
   errores. El código es una **responsabilidad, no un activo**: no añadas lo que no hace falta.
4. **Pasa todas las pruebas.** Si no supera los tests, no es limpio.
5. **Barato de mantener.** La suma de lo anterior: leer, entender y cambiar sale más barato.

## Deuda técnica

Los atajos aceleran hoy y cobran **intereses** mañana (Ward Cunningham): cada cambio futuro se
vuelve más lento hasta que se salda con refactorización y pruebas. Causas habituales: presión de
negocio, acoplamiento estricto, ausencia de tests, refactor aplazado y falta de estándares
compartidos. El objetivo del refactor es **combatir esa deuda**, no acumularla con abstracciones
especulativas (que son otra forma de deuda: ver el olor _Generalidad especulativa_).

## Cuándo refactorizar

- **Regla de las tres veces:** la 1.ª vez, hazlo y ya; la 2.ª, duele repetir pero sigue; la
  **3.ª vez, refactoriza**.
- **Al añadir una funcionalidad:** limpiar primero el código que vas a tocar lo hace más fácil de
  extender y de entender para quien venga después.
- **Al corregir un bug:** los errores viven en los rincones sucios; limpiar los hace aflorar.
- **En revisión de código:** es la última oportunidad de ordenar antes de que quede para todos.

## Cómo refactorizar de forma segura (el paso de refactor del ciclo TDD)

Con el test **en verde**, mejora el diseño en una **serie de pasos pequeños**, cada uno de los
cuales deja el programa funcionando:

1. **Tests verdes antes y después.** Re-ejecuta la suite tras cada paso. Si se pone en rojo:
   o cometiste un error (arréglalo), o el test era demasiado de bajo nivel (súbelo de nivel).
2. **Sin funcionalidad nueva.** No mezcles refactor con features ni con corrección de bugs;
   sepáralos, al menos, en commits distintos.
3. **Debe quedar visiblemente más limpio.** Si tras refactorizar el código sigue igual de sucio,
   perdiste el tiempo (suele pasar por juntar muchos cambios en uno grande en vez de pasos
   pequeños).
4. **Motiva cada cambio.** Cada técnica tiene pros y contras: refactoriza por un olor concreto,
   no por gusto estético.

Si valoras introducir una **abstracción o un patrón de diseño**, consulta
{{guide:patrones-diseno}}: hazlo **solo si el problema que resuelve ya existe** en el código, no
«por si acaso». Introducir capas de indirección sin un olor que las justifique es
sobre-ingeniería.

## Catálogo de olores de código (qué buscar → cómo curarlo)

Los olores son **síntomas**, no siempre defectos: indican dónde mirar. Se acumulan con el tiempo.
Cinco familias:

### Bloaters (hinchazones) — algo creció demasiado
| Olor | Señal | Refactorización |
|---|---|---|
| Método largo | Método de más de ~10 líneas o que hace varias cosas | Extraer método; Reemplazar temporal con consulta; Descomponer condicional |
| Clase grande | Demasiados campos/métodos/responsabilidades en una clase | Extraer clase / subclase / interfaz |
| Obsesión por primitivos | Primitivos y constantes donde cabría un objeto pequeño (dinero, rango, teléfono) | Reemplazar valor con objeto; Reemplazar número mágico con constante |
| Lista larga de parámetros | Más de 3-4 parámetros | Introducir objeto parámetro; Preservar objeto completo |
| Grupos de datos | Los mismos parámetros viajan juntos por varios sitios | Extraer clase; Introducir objeto parámetro |

### OO-Abusers — orientación a objetos mal aplicada
| Olor | Señal | Refactorización |
|---|---|---|
| Sentencias switch | `switch`/cadena de `if` sobre un tipo, repetida | Reemplazar condicional con polimorfismo (o con objeto Estado/Estrategia) |
| Campo temporal | Campo con valor solo en ciertos casos, vacío el resto | Extraer clase |
| Legado rechazado | Subclase que usa poco de lo heredado o lo anula | Reemplazar herencia con delegación; Bajar método/campo |

### Change Preventers — un cambio obliga a muchos
| Olor | Señal | Refactorización |
|---|---|---|
| Cambio divergente | Una clase cambia por motivos no relacionados | Extraer clase |
| Cirugía de escopeta | Un cambio lógico obliga a tocar muchas clases dispersas | Mover método/campo; Alinear clase |

### Dispensables (prescindibles) — sobra
| Olor | Señal | Refactorización |
|---|---|---|
| Comentarios | Comentarios que explican código poco claro | Extraer método; Renombrar método |
| Código duplicado | Fragmentos casi idénticos | Extraer método; Subir método; Formar método plantilla |
| Clase de datos | Solo getters/setters, sin comportamiento | Mover el comportamiento hacia ella; Encapsular campo |
| Código muerto | Variable/método/clase que ya no se usa | Eliminarlo |
| **Generalidad especulativa** | Clase/método/parámetro creado «por si acaso» | Alinear/eliminar. **Es el olor de la sobre-ingeniería.** |

### Couplers (acopladores) — demasiada dependencia entre clases
| Olor | Señal | Refactorización |
|---|---|---|
| Envidia de características | Un método usa más los datos de otro objeto que los suyos | Mover método |
| Cadenas de mensajes | `a.b().c().d()` | Ocultar delegado |
| Intermediario | Clase que solo delega en otra | Eliminar intermediario; Alinear clase |

## Anti-patrones (nómbralos para no caer en ellos)

- **«Funciona, y ya está»** — saltarse el refactor. El ciclo es red-green-**refactor**: con la
  suite verde, limpia lo que acabas de introducir antes de dar por hecho el criterio.
- **Refactor que no limpia** — juntar muchos cambios en uno grande y acabar igual de sucio.
  Pasos pequeños con la suite verde entre cada uno.
- **Refactor + feature en el mismo commit** — imposible de revisar y de revertir. Sepáralos.
- **Sobre-limpiar / gold-plating** — introducir abstracciones «por si escala». Es
  _Generalidad especulativa_: crea deuda, no la salda. Espera al olor real.
- **Reportar olores preexistentes en `/review`** — solo cuenta lo que el diff introduce o
  empeora, y solo si supera el umbral de {{guide:revision-hallazgos}}; nada de nitpicks ni del
  trabajo del linter.

## Autocrítica antes de cerrar

Con la suite en verde, pregúntate: **¿introduje algún olor de la tabla? ¿el nombre dice la
intención? ¿hay duplicación que extraer? ¿alguna abstracción que metí no tiene aún un problema
que la justifique?** Si algo falla, aplica la refactorización que lo cura —en pasos pequeños,
manteniendo los tests verdes— antes de registrar el criterio como completado.
