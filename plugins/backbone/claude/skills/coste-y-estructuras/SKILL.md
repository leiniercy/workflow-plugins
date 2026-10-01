---
name: coste-y-estructuras
description: "Úsala al derivar de un volumen la complejidad admisible en /plan, al elegir la estructura de datos de código nuevo en /implement, y al juzgar la clase de coste de un cambio en /review. Síntomas: un bucle dentro de otro sobre dos colecciones que crecen, una búsqueda lineal repetida donde cabía un índice por clave, no sabes cuánto aguanta antes de ponerse lento ni si algo es O(n) o O(n²), vas a escribir a mano una estructura que el motor de datos ya hace, o un umbral sin volumen detrás."
user-invocable: false
license: MIT
---
# Coste y estructuras (elegir la clase antes de escribir el código)

`rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`) cubre el rendimiento **de código que ya existe**: qué defectos se ven en
el diff y qué exige medición antes de opinar. Y dice, con razón, que sustituir una estructura
de datos «porque será más rápida» cae del lado de lo que **no se juzga sin medir**.

Esta guía cubre la decisión anterior, la que no puede medirse porque todavía no hay nada
escrito: **qué clase de coste te permite el volumen, y qué estructura sirve a las operaciones
que necesitas**. Ahí no hay especulación —hay una tabla de operaciones contra costes—, y
acertar la primera vez sale gratis mientras que corregirlo después cuesta un rediseño.

La frontera entre las dos guías es limpia y conviene tenerla presente:

| La situación | La guía |
|---|---|
| Código nuevo: qué estructura escribo | **Esta**. Tiene respuesta conocida, no requiere medición. |
| Código escrito: «esto podría ser más rápido» | `rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`). Exige medición. |
| Código escrito con un defecto de forma conocida (N+1, sin paginar) | `rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`). Es hallazgo sin medir. |
| Fijar el umbral y el volumen de un criterio | Ambas: el volumen sale de aquí, el criterio se redacta allí. |

---

## 1. El presupuesto: del volumen a la clase admisible

La primera decisión no es qué algoritmo escribir, es **cuánto puedes gastar**. Se lee al revés
de como parece: partes del tamaño que va a tener el conjunto y de ahí sale la clase objetivo,
que descarta soluciones antes de escribir ninguna.

Regla de pulgar: presupuesta **10⁸ operaciones por segundo**. Un procesador normal hace bastante
más con operaciones triviales, pero las reales —accesos dispersos a memoria, deserialización,
llamadas a través de una frontera— cuestan mucho más que un incremento, así que el orden de
magnitud de margen es lo que hace la regla utilizable.

| n hasta | Clase que cabe en ~1 s | En la práctica |
|---|---|---|
| 20–25 | `O(2ⁿ)` | Subconjuntos, máscaras de bits. Solo con `n` acotado por el dominio. |
| 500–1 000 | `O(n³)` | Triple bucle. Frontera: empieza a doler el factor constante. |
| 5 000–10 000 | `O(n²)` | Doble bucle sobre la misma colección. |
| 10⁵–10⁶ | `O(n log n)` | Ordenar, índice de árbol, `log` por elemento. **El caso normal.** |
| 10⁶–10⁸ | `O(n)` | Una pasada. A partir de aquí manda la E/S, no el cálculo. |
| Sin techo | `O(log n)`, `O(1)` | Índice, búsqueda binaria, acceso por clave. |

**El uso correcto es como filtro, no como cálculo.** Si el conjunto llega a 10⁵, el doble bucle
está descartado antes de escribirlo y la respuesta está en indexar. Si el conjunto está acotado
por el dominio en 40 filas, `O(n²)` es correcto y optimizarlo es la trampa de
`patrones-diseno` (`${CLAUDE_PLUGIN_ROOT}/skills/patrones-diseno/SKILL.md`): complejidad a cambio de nada.

**Para elegir el volumen, juega con las escalas** (`rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`)): qué pasa con mil
veces más datos. Ese salto convierte un umbral inventado en uno derivado de una fuerza real del
dominio. Y si el dominio acota de verdad, esa cota **es** la respuesta y se escribe como
asunción declarada (`evidencia-y-preguntas` (`${CLAUDE_PLUGIN_ROOT}/skills/evidencia-y-preguntas/SKILL.md`)).

---

## 2. Leer la clase de coste de un código

Cinco reglas cubren casi todo lo que vas a encontrar en una revisión.

- **Los bucles anidados multiplican.** Un bucle de `O(A)` iteraciones cuyo cuerpo cuesta `O(B)`
  es `O(A·B)`. Y **el cuerpo incluye lo que no parece un bucle**: un `.includes()`, un
  `.find()`, un `filter` sobre otra colección.
- **Que el bucle interior empiece más tarde no cambia la clase.** `for (j = i+1; …)` ahorra la
  mitad de las iteraciones y sigue siendo `O(n²)`: `n(n−1)/2`. El ahorro es de factor constante
  y no cuenta.
- **La recursión se cuenta por niveles.** Trabajo por nivel × número de niveles. Partir por la
  mitad da `O(log n)` niveles; ramificar en dos sin reducir el problema da `O(2ⁿ)` llamadas.
- **Manda el peor caso, no el que tienes delante.** Una búsqueda que normalmente se corta
  enseguida tiene una entrada que no la corta nunca — y si la entrada viene de fuera, alguien
  puede construirla.
- **El coste amortizado es un coste real.** Un `while` dentro de un `for` puede ser `O(n)` en
  total si cada elemento entra y sale una sola vez. No lo cuentes como cuadrático sin mirar.

**La firma que sí es hallazgo en `/review`:** un bucle anidado —explícito o escondido en una
búsqueda lineal— **sobre dos colecciones que crecen sin techo**, cuando una de las dos podía
indexarse por clave antes del bucle. Es el mismo perfil que el N+1 de `rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`):
correcto con los datos de hoy, roto con volumen, y evitable mientras escribes. Si alguna de las
dos colecciones está acotada por el dominio, **no es hallazgo**: dilo y sigue.

---

## 3. Elegir el contenedor por las operaciones que necesitas

Esta es la decisión que aparece en casi toda tarea de producto. La pregunta no es «cuál es
mejor», es **qué operaciones haces y cuántas veces cada una**.

| Lo que necesitas | Estructura | Coste | La letra pequeña |
|---|---|---|---|
| Recorrer en orden de inserción, índice conocido | Array / lista | acceso `O(1)`, búsqueda `O(n)` | Bien hasta que aparece la búsqueda **dentro de un bucle**. |
| Pertenencia o acceso por clave | Mapa / conjunto *hash* | `O(1)` | **La opción por defecto.** Es la respuesta al bucle anidado del punto anterior. |
| Lo anterior **y** orden, mínimo/máximo o recorrido ordenado | Mapa / conjunto **ordenado** (árbol) | `O(log n)` | Solo si el orden se usa. Pagas el logaritmo por él. |
| Solo el siguiente elemento por prioridad, repetido | Montículo (cola de prioridad) | `push/pop O(log n)`, `top O(1)` | Mejor constante que un conjunto ordenado, admite repetidos; a cambio no puedes borrar un elemento arbitrario ni recorrer en orden. |
| Añadir y quitar por los dos extremos | Cola doble (*deque*) | `O(1)` | Una cola normal para procesar por niveles; una pila para deshacer. |
| Muchas consultas de agregado sobre un rango **estático** | Sumas acumuladas | precálculo `O(n)`, consulta `O(1)` | Un solo recorrido previo. Si no hay actualizaciones, no busques nada más sofisticado. |

**La regla operativa:** empieza por el mapa *hash*. Sube al ordenado solo cuando el problema
pida orden, no por costumbre. Y antes de un bucle que busca dentro de otra colección, construye
el índice.

```js
// ✗ O(n·m): una búsqueda lineal por cada pedido
const conCliente = pedidos.map((p) => ({
  ...p,
  cliente: clientes.find((c) => c.id === p.clienteId),
}));

// ✓ O(n+m): un índice construido una vez
const porId = new Map(clientes.map((c) => [c.id, c]));
const conCliente = pedidos.map((p) => ({ ...p, cliente: porId.get(p.clienteId) }));
```

---

## 4. Las tres monedas (y la pregunta que no es una moneda)

Casi ninguna estructura es «más rápida». Casi todas **cambian una moneda por otra**, y saber
cuál te sobra decide la elección:

- **Tiempo por consulta** — lo que tarda responder ya con la estructura montada.
- **Precálculo** — lo que pagas una vez antes de responder nada. Solo compensa si hay consultas
  suficientes para amortizarlo: precalcular en `O(n log n)` para responder tres preguntas sale
  peor que el recorrido ingenuo.
- **Memoria** — la moneda que se olvida y la que revienta primero en un proceso con límite.

Y una cuarta pregunta que **no es una elección tuya sino una restricción del problema**:
**¿online u offline?** ¿Tienes que responder cada petición antes de conocer la siguiente, o
puedes acumularlas y reordenarlas? Es la misma pregunta que separa el procesamiento síncrono
del procesamiento por lotes (`arquitectura` (`${CLAUDE_PLUGIN_ROOT}/skills/arquitectura/SKILL.md`)), y hacerla explícita abre soluciones que en
modo online no existen. Casi nadie la plantea en la fase de diseño.

---

## 5. Repertorio: cuando el contenedor no basta

Estas estructuras resuelven problemas reales, y en un repo de aplicación **casi nunca son la
respuesta correcta**, porque el motor de datos ya las implementa mejor: lo que aquí es un árbol
de segmentos, allí es un índice (`migraciones-de-datos` (`${CLAUDE_PLUGIN_ROOT}/skills/migraciones-de-datos/SKILL.md`)). Están aquí para reconocerlas
—y sobre todo para saber cuándo **no** escribirlas.

**Solo se justifican si se cumplen las tres:** los datos viven en memoria durante el cálculo, hay
muchas consultas sobre el mismo conjunto, y el motor de datos no puede resolverlo.

| Estructura | Resuelve | Coste | Cuándo es la correcta |
|---|---|---|---|
| Sumas acumuladas | Agregado sobre un rango, sin actualizaciones | prec. `O(n)`, consulta `O(1)` | **La única de esta tabla que aparece a menudo.** Vector estático y operación invertible. |
| Tabla dispersa (*sparse table*) | Mínimo/máximo sobre un rango, sin actualizaciones | prec. `O(n log n)`, consulta `O(1)` | Solo con operaciones **idempotentes** (mín, máx, mcd): los dos rangos se solapan. Para suma daría un resultado falso. |
| Árbol de segmentos | Agregado sobre un rango **con actualizaciones** | `O(log n)` | Cualquier operación asociativa. Con propagación perezosa admite actualizar rangos enteros. Memoria `O(n)`; reserva `4n` posiciones, no `2n`. |
| Descomposición en bloques (√) | Lo mismo, cuando el árbol no encaja | `O(√n)` por consulta | Bloques de `√n`. Más lento y mucho más fácil de adaptar a operaciones raras. |
| Union-Find | Conjuntos disjuntos: unir y preguntar si dos elementos están juntos | ~`O(1)` amortizado | Agrupar por equivalencia en una pasada (deduplicar, componentes, detectar ciclos). Con compresión de caminos son cuatro líneas. |
| Trie (árbol de prefijos) | Conjuntos de cadenas que comparten principio | `O(longitud)` | Autocompletado y búsqueda por prefijo **en memoria**. Si los datos están en una base, el índice del motor gana. |
| Árbol binario equilibrado (treap) | Conjunto ordenado con operaciones que el estándar no da | `O(log n)` | Prácticamente nunca en producto: el conjunto ordenado del lenguaje ya lo es por dentro. Escribirlo a mano solo se justifica si necesitas partir, unir o indexar por posición. |

**El aviso que importa:** si te descubres escribiendo una de estas por debajo de la línea de las
sumas acumuladas, para y comprueba primero que el problema no lo resuelve un índice, una
consulta agregada o un mapa. Escribir una estructura sofisticada a mano añade código que hay que
mantener, probar y entender, y `codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`) cobra por todo eso.

---

## 6. Elegir la técnica

| Si la situación es… | La técnica | La condición que hay que comprobar |
|---|---|---|
| El espacio de opciones es diminuto | **Búsqueda exhaustiva** | Que quepa en presupuesto **después** de podar. Sirve además como oráculo (ver abajo). |
| La respuesta es monótona: si vale `x`, vale todo lo mayor | **Búsqueda binaria** | La monotonía. Vale sobre datos ordenados **y sobre la propia respuesta** («el mínimo tamaño de lote que aguanta»). |
| El cálculo repite subproblemas idénticos | **Memoización** | Que el resultado dependa solo de los parámetros. Es la forma correcta de la caché: local, sin invalidación, sin coherencia. |
| La elección localmente mejor parece llevar al óptimo | **Heurística voraz** | **Demostración o contraejemplo buscado.** Ver el aviso siguiente. |

### Lo voraz es lo único que hay que demostrar

Una heurística voraz —ordenar por un criterio y ir tomando— es correcta o no lo es, y **funciona
en tus ejemplos en los dos casos**. El contraejemplo clásico: para dar cambio con monedas de 1,
3 y 4, tomar siempre la mayor paga 6 con tres monedas (4+1+1) cuando la respuesta son dos (3+3).
Con las denominaciones del euro el mismo algoritmo es correcto, y esa coincidencia es justo lo
que hace que nadie lo compruebe.

Esto es `evidencia-y-preguntas` (`${CLAUDE_PLUGIN_ROOT}/skills/evidencia-y-preguntas/SKILL.md`) aplicado a un algoritmo, con un escalón más: **no basta
con no tener contraejemplo, hay que haberlo buscado.** Y la forma de buscarlo es escribir la
versión exhaustiva —lenta y obviamente correcta— y compararlas sobre casos pequeños generados,
que es exactamente la técnica del oráculo de `niveles-y-tipos-de-prueba` (`${CLAUDE_PLUGIN_ROOT}/skills/niveles-y-tipos-de-prueba/SKILL.md`).

---

## Cómo aplicarla

- **En `/plan`:** cuando la tarea active la característica de eficiencia
  (`calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`)), la pieza «con qué volumen» del criterio sale de la sección 1:
  cota del dominio → clase objetivo. Si no puedes acotar el volumen, es una asunción y se declara.
- **En `/implement`:** al escribir el código, elige el contenedor por la sección 3 —no es
  micro-optimización, es la decisión de diseño correcta y se toma una vez—. En el paso de
  refactor, `codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`) manda sobre el diseño y esta guía solo interviene si el
  refactor **introduce** un bucle anidado que antes no estaba.
- **En `/review`:** una única firma nueva sobre lo que el diff **introduce o empeora** — el
  bucle anidado sobre colecciones sin techo de la sección 2. Severidad normalmente Media; Alta
  si el crecimiento es previsible y el camino es frecuente. Se reporta con la disciplina de
  `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`). Ninguna otra propuesta de optimización sin medición.

## Anti-patrones (nómbralos para no caer en ellos)

- **Optimizar el factor constante** — reducir a la mitad las operaciones de un recorrido lineal
  cuando el problema era la clase. Trabajo perdido con aspecto de mejora.
- **La estructura sofisticada antes que el índice** — escribir a mano lo que el motor de datos
  ya hace. Añade código propio y no gana nada.
- **Optimizar lo acotado** — indexar una lista de países. El volumen del dominio es un límite
  real y respetarlo es la decisión correcta.
- **Confundir «acotado por el dominio» con «pequeño hoy»** — el error simétrico. «Ahora hay 40
  filas» no es una cota; que las dé de alta un equipo interno y no haya importación masiva, sí.
- **Heurística voraz sin contraejemplo buscado** — pasa las pruebas que escribiste tú y falla
  con el caso que no se te ocurrió.
- **Presupuesto sin volumen** — «tiene que ser rápido» sin decir con cuántos datos. No se puede
  verificar ni fallar (`rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`)).
- **Memoizar lo que no es una función** — memoización sobre algo que depende de estado externo.
  Deja de ser memoización y pasa a ser una caché, con toda su invalidación
  (`rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`)).
- **Derivar la clase de coste a ojo** — afirmar `O(n)` sin haber mirado qué cuesta el cuerpo del
  bucle. Es una afirmación como cualquier otra y se comprueba (`evidencia-y-preguntas` (`${CLAUDE_PLUGIN_ROOT}/skills/evidencia-y-preguntas/SKILL.md`)).

## Autocrítica antes de cerrar

Antes de fijar un criterio, elegir una estructura o reportar un hallazgo, pregúntate: **¿sé el
volumen que va a tener esto, o estoy usando el de hoy? ¿la clase de coste que he asumido la he
leído del código o la he supuesto? ¿la estructura que voy a escribir la justifica alguna
operación concreta, o la elegí por costumbre? ¿hay una búsqueda lineal dentro de un bucle que se
arregla con un mapa? ¿estoy escribiendo a mano algo que el motor de datos ya hace? Si hay una
heurística voraz, ¿busqué el contraejemplo o solo no lo encontré?** Si algo falla, corrígelo
antes de seguir.
