---
name: patrones-diseno
description: "Úsala al razonar el enfoque técnico en /plan y al valorar si introducir una abstracción durante el refactor de /implement. Síntomas: estás a punto de meter una fábrica, una estrategia o un singleton; te oyes decir «por si escala» o «así queda más extensible»."
user-invocable: false
license: MIT
---
# Patrones de diseño — referencia con freno anti-sobre-ingeniería

Cuando razonas el **enfoque técnico** en `/plan`, o valoras introducir una abstracción durante el
**refactor** de `/implement`, esta guía es tu catálogo de patrones de diseño (GoF, según
refactoring.guru). Pero su regla principal no es «aplica patrones», sino la contraria:

> **Un patrón se justifica SOLO cuando el problema que resuelve ya existe en el código.**
> Introducir subclases, interfaces o capas de indirección «por si acaso», por elegancia o «por si
> escala» es sobre-ingeniería — el anti-objetivo del plugin. Ante la duda, código simple.

Los patrones son un **lenguaje común** («aquí encaja un Strategy» comunica una idea entera) y una
caja de soluciones probadas. No son código para copiar, sino un plano que adaptas a tu caso.

## La crítica (léela antes de proponer un patrón)

refactoring.guru dedica una página a criticar el uso de patrones. Tres trampas:

1. **Chapuza por lenguaje débil.** Muchos patrones suplen lo que un lenguaje moderno ya te da.
   En TypeScript/JavaScript, un **Strategy** suele ser una función que pasas como argumento; un
   **Observer**, un `EventTarget`/callbacks; un **Iterator**, un generador o `for...of`; un
   **Singleton**, un módulo. No montes una jerarquía de clases para lo que resuelve una función.
2. **Aplicación dogmática.** Implementar el patrón «al pie de la letra» del libro sin adaptarlo a
   tu proyecto produce código más complejo de lo necesario.
3. **El síndrome del martillo.** «Si lo único que tienes es un martillo, todo te parece un
   clavo.» Aprender patrones y aplicarlos en todas partes —donde bastaría código más simple— **es
   la definición de sobre-ingeniería**.
4. **Contar responsabilidades en vez de razonar.** Los principios SOLID tienen hoy críticas
   serias: Dan North propone en su lugar las propiedades CUPID (2022), y el ensayo *SOLID is not
   SOLID* de David Copeland pide dejar de aplicarlos como aforismos sin contexto. El punto común
   es útil aquí: «una clase, una responsabilidad» no se cumple contando, y llevado al pie de la
   letra produce justo la jerarquía de clases diminutas que esta guía frena. Lo que sobrevive a
   todos los paradigmas es lo de debajo —**alta cohesión, bajo acoplamiento**—, y es lo que hay
   que razonar en el caso concreto antes de proponer ninguna abstracción.

## Mapa olor → patrón (el patrón cura un olor concreto)

Usa un patrón cuando reconozcas su olor (ver `codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`)), no antes:

| Olor presente en el código | Patrón candidato | Alternativa simple primero |
|---|---|---|
| `switch`/`if` gigante que cambia el comportamiento según un tipo | **Strategy**, **State** o Reemplazar condicional con **polimorfismo** | Un mapa/objeto de funciones si solo varía un cálculo |
| Duplicación entre clases casi idénticas salvo unos pasos | **Template Method** | Extraer método/función compartida |
| Constructor con demasiados parámetros (telescópico) | **Builder** | Objeto de opciones (`{ ... }`) |
| Hay que crear familias de objetos coherentes entre sí | **Abstract Factory** | Factory Method o una función fábrica |
| El código depende de clases concretas al crear objetos | **Factory Method** | Inyección de la dependencia |
| Interfaz de una librería/legado incompatible con la tuya | **Adapter** | — |
| Un subsistema de terceros es complejo y usas poco | **Facade** | Función envoltorio |
| Muchos objetos deben reaccionar a un cambio de estado | **Observer** | Callbacks / eventos del lenguaje |
| Cadena de validaciones/manejadores en secuencia | **Chain of Responsibility** | Lista de funciones que recorres |
| Añadir comportamiento a objetos sin tocar sus clases | **Decorator** / **Visitor** | Composición / funciones de orden superior |
| Control de acceso, cache o carga diferida sobre un objeto | **Proxy** | — |

## Las tres familias (referencia rápida)

**Creacionales** — crear objetos sin acoplarse a clases concretas:
- *Factory Method* (SRP+OCP), *Abstract Factory* (familias coherentes), *Builder* (construcción
  paso a paso), *Prototype* (clonar sin depender de la clase).
- ⚠️ **Singleton — trátalo como anti-patrón.** El propio refactoring.guru advierte que **viola el
  SRP** (unicidad + acceso global a la vez), acopla globalmente, exige cuidado en concurrencia y
  **dificulta las pruebas** (estado global no mockeable). Prefiere **inyección de dependencias**.

**Estructurales** — ensamblar objetos en estructuras flexibles:
- *Adapter* (traduce interfaces), *Bridge* (separa abstracción/implementación), *Composite*
  (árboles uniformes), *Decorator* (envoltorios en runtime), *Facade* (interfaz simple sobre un
  subsistema; ojo con que degenere en «objeto dios»), *Flyweight* (comparte estado; **solo ante un
  problema real de memoria**), *Proxy* (controla el acceso).

**De comportamiento** — algoritmos y responsabilidades entre objetos:
- *Chain of Responsibility*, *Command* (solicitud como objeto; undo/redo), *Iterator*, *Mediator*
  (evita la red de dependencias; ojo con el «objeto dios»), *Memento* (undo sin romper
  encapsulación), *Observer*, *State* y *Strategy* (curan condicionales gigantes),
  *Template Method* (cura duplicación; ojo con violar LSP al quitar un paso), *Visitor*.

Casi todos favorecen **SRP** y **OCP** (abierto a extensión, cerrado a modificación). Ese es el
valor real: aíslan lo que cambia. Pero **cada patrón añade clases y complejidad**: el coste solo
se paga cuando el problema (acoplamiento, explosión de subclases, condicional inmanejable) ya está
haciendo daño.

## Anti-patrones (nómbralos para no caer en ellos)

- **Patrón «por si acaso»** — introducirlo antes de que exista el olor. Espera al problema real.
- **Patrón por elegancia** — abstracción que no reduce ningún dolor concreto. Es deuda disfrazada.
- **Patrón al pie de la letra** — copiar la estructura del libro sin adaptarla ni simplificarla al
  proyecto.
- **Clase donde basta una función** — Strategy/Observer/Iterator montados como jerarquías cuando
  el lenguaje ya los da con funciones, eventos o generadores.
- **Singleton para «acceso cómodo»** — casi siempre es acoplamiento global que estorba a los
  tests. Inyecta la dependencia.

## Autocrítica antes de proponer un patrón

Pregúntate, en este orden: **¿existe ya el olor que este patrón cura, o lo estoy anticipando?
¿lo resuelve una función, un objeto de opciones o una feature del lenguaje sin añadir clases?
¿el código simple de hoy bastaría, dejando el patrón para cuando el problema aparezca de verdad?**
Si la respuesta apunta a lo simple, elige lo simple y regístralo. Un patrón bien elegido aclara;
uno impuesto oscurece.
