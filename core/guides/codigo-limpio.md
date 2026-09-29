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

Reconocerla es esta guía; **decidir qué se hace con ella** es {{guide:deuda-tecnica}}: cuándo
contraerla a sabiendas, dónde se escribe con su señal de cobro, y por qué no se paga dentro de
una tarea que no la pidió. Un olor detectado y nunca decidido se lee, se asiente y se olvida.

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

## Antes de quitar algo: entiende por qué está

La valla de Chesterton: si te encuentras una valla cruzando un camino y no sabes por qué está
ahí, no la tires. Primero averigua la razón; después decide si sigue valiendo.

Es la contraparte necesaria de la mitad de este catálogo, que te dice **elimina**. Antes de
borrar una rama, un `if` que parece imposible, una comprobación redundante o código que nadie
llama, contesta:

- ¿De qué se encarga esto? ¿Quién lo llama y a quién llama?
- ¿Qué casos límite y qué rutas de error cubre?
- ¿Hay un test que fije su comportamiento? Si lo hay, léelo: suele explicar la valla.
- ¿Por qué pudo escribirse así? ¿Rendimiento, una limitación de la plataforma, un bug de un
  tercero, una razón histórica?
- **`git blame` y el commit que lo introdujo**: ahí está el contexto que el código no cuenta.

Si no puedes responder, todavía no estás en condiciones de quitarlo: lee más contexto. Y si la
razón resulta seguir viva, lo que falta no es borrar el código: es **escribir el porqué al
lado**, que es lo que evita que el siguiente lo intente otra vez.

## El código cuenta lo que hace, no lo que dejó de hacer

La valla de arriba dice que la historia **se lee**. Esta dice que la historia **no se escribe
en el código**: git ya guarda el diff, y un comentario que lo repite envejece en el cambio
siguiente y pasa a describir código que ya no está.

```js
// ✗ Solo se entiende con el diff delante
// Antes recorríamos todo el array; ahora usamos un Map para evitar el O(n²).

// ✓ Se entiende dentro de seis meses, que es cuando hace falta
// Índice por id: las búsquedas del bucle de conciliación son O(1).
```

Es el olor más frecuente en código escrito por un agente, y el mecanismo lo explica: **el
cambio que acaba de hacer es lo más presente que tiene**, así que escribe sobre eso en vez de
sobre lo que el lector se va a encontrar. El lector no tiene el diff; tiene el fichero. Aplica
igual a los nombres (`procesarPedidoNuevo` cuando ya no queda uno viejo), a los ficheros
(`utils-v2.ts`) y a la documentación de un módulo que arranca explicando lo que sustituyó.

**Dónde sí va la versión anterior**, porque es documentación legítima y hace falta: el mensaje
del commit, el CHANGELOG, las notas de versión, la guía de migración y `progress.md`
({{guide:registro-progreso}}). Son documentos *sobre el cambio*; el código no lo es.

**La excepción** es cuando el pasado sigue vivo y explica el presente: un rodeo que sigue ahí
por un bug de un tercero, un formato que se mantiene por compatibilidad, una constante rara que
viene de una limitación real. Eso no es contar la versión anterior: es el **porqué al lado** que
pide la valla de Chesterton, y va con el enlace a la incidencia si lo hay.

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
| Código muerto | Variable/método/clase que ya no se usa | Eliminarlo — tras pasar la valla de Chesterton: «no lo encuentro llamado» no es lo mismo que «no se usa» (reflexión, carga dinámica, consumidor externo) |
| **Generalidad especulativa** | Clase/método/parámetro creado «por si acaso» | Alinear/eliminar. **Es el olor de la sobre-ingeniería.** |

### Couplers (acopladores) — demasiada dependencia entre clases
| Olor | Señal | Refactorización |
|---|---|---|
| Envidia de características | Un método usa más los datos de otro objeto que los suyos | Mover método |
| Cadenas de mensajes | `a.b().c().d()` | Ocultar delegado |
| Intermediario | Clase que solo delega en otra | Eliminar intermediario; Alinear clase |

## Cascadas de simplificación (el refactor de 10x, no de 10%)

El catálogo de arriba se aplica olor a olor. A veces eso deja pasar algo mayor: **una sola
idea que hace innecesarios varios componentes a la vez**. La pregunta que la destapa es «¿y si
todos estos casos fueran el mismo por debajo?».

| Síntoma | Cascada probable |
|---|---|
| El mismo concepto implementado de 5 formas | Abstrae el patrón común |
| Lista de casos especiales que no para de crecer | Encuentra el caso general |
| Reglas con excepciones encadenadas | Encuentra la regla que no tiene excepciones |
| Configuración que crece sin fin | Encuentra el valor por defecto que sirve al 95 % |

Ejemplo: manejadores separados para datos por lotes, en tiempo real, de fichero y de red →
«todas las entradas son flujos, solo cambia el origen» → un procesador de flujos y varias
fuentes; **cuatro implementaciones eliminadas**.

Proceso: lista las variantes → busca la esencia común → extrae la abstracción → comprueba que
**todos** los casos encajan sin forzar → mide la cascada en cuántas cosas puedes **borrar**.

**El límite, y es el que importa:** una cascada es legítima porque la duplicación **ya existe**
y la abstracción la **elimina**. Se mide en código borrado. Si estás creando una abstracción
para casos que aún no existen, eso no es una cascada: es _Generalidad especulativa_, y la
respuesta está en {{guide:patrones-diseno}} — el patrón se introduce ante el problema real, no
antes. Ante la duda: ¿cuántas líneas desaparecen? Si la respuesta es «ninguna, pero quedará más
extensible», no es una cascada.

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
- **Comentario que narra el diff** — «antes esto era X, ahora es Y». Envejece en el cambio
  siguiente y el que lo lee no tiene el diff delante. Lo que cambió va al commit y al CHANGELOG.

## Autocrítica antes de cerrar

Con la suite en verde, pregúntate: **¿introduje algún olor de la tabla? ¿el nombre dice la
intención? ¿hay duplicación que extraer? ¿alguna abstracción que metí no tiene aún un problema
que la justifique? ¿algún comentario o nombre que he escrito solo se entiende con el diff
delante?** Si algo falla, aplica la refactorización que lo cura —en pasos pequeños,
manteniendo los tests verdes— antes de registrar el criterio como completado.
