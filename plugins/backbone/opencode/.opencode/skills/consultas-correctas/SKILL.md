---
name: consultas-correctas
description: "Úsala al escribir o revisar cualquier consulta SQL: al fijar en /plan qué debe pasar con los casos vacíos, al escribirla en /implement y al revisar el diff en /review. Síntomas: un LEFT JOIN con una condición de la tabla derecha en el WHERE, una agregación sobre un join uno-a-muchos, un NOT IN contra una subconsulta que admite nulos, un total que no cuadra entre dos informes o que se duplica, un efecto irreversible dentro de una transacción, o lógica de negocio en un trigger."
---
# Consultas correctas (la que pasa los tests y devuelve otro número)

Los defectos que cubre esta guía **no son lentos ni inseguros**. Son sintácticamente válidos,
pasan la revisión de un vistazo, pasan los tests con los datos de ejemplo y devuelven un número
distinto del real. Nadie los descubre al desplegar: se descubren meses después, cuando alguien
cuadra un informe a mano y no le sale.

Por eso van en una guía propia y no dentro de `rendimiento` (skill de OpenCode, auto-activable): **una consulta lenta se
nota; una consulta incorrecta, no.**

| La situación | La guía |
|---|---|
| La consulta devuelve lo que crees que devuelve | **Esta.** |
| La consulta es correcta pero cara (N+1, sin índice, sin paginar) | `rendimiento` (skill de OpenCode, auto-activable) |
| Vas a cambiar el esquema o los datos que ya existen | `migraciones-de-datos` (skill de OpenCode, auto-activable) |
| El valor entra en la consulta por concatenación | Es **inyección**: dimensión de seguridad de `/review`, no esta guía |
| Dónde vive la lógica de negocio | `arquitectura` (skill de OpenCode, auto-activable), y la sección 5 de aquí |

Todo lo que se afirma abajo está contrastado con la documentación de PostgreSQL y de MySQL, no
con material divulgativo (`evidencia-y-preguntas` (skill de OpenCode, auto-activable)). Donde los motores difieren, se dice.

---

## 1. `NULL` no es un valor: es «no se sabe»

Esta sección es la raíz de casi todo lo demás. SQL no usa lógica de dos valores sino de tres:
**verdadero, falso y desconocido**. Y `WHERE` se queda **solo con lo verdadero** — descarta por
igual lo falso y lo desconocido. De ahí salen los fallos silenciosos.

| Escribes | Crees que pasa | Lo que pasa |
|---|---|---|
| `WHERE col = NULL` | Filas con la columna vacía | **Nunca es verdadero.** Se usa `IS NULL` |
| `WHERE estado <> 'baja'` | Todo lo que no es baja | Las filas con `estado` nulo **se pierden**: la comparación da desconocido |
| `WHERE id NOT IN (subconsulta)` | Lo que no está en la lista | Si la subconsulta devuelve **un solo nulo**, el resultado es **cero filas** |
| `SUM(importe)` sin filas | `0` | **`NULL`** |
| `COUNT(col)` | Todas las filas | Solo las que tienen valor **no nulo** en esa columna |

El caso de `NOT IN` merece la cita literal, porque es contraintuitivo y caro: *«if the left-hand
expression yields null, or if there are no equal right-hand values and at least one right-hand
row yields null, the result of the `NOT IN` construct will be null, not true»* (documentación de
PostgreSQL, expresiones de subconsulta). Nulo no es verdadero, así que `WHERE` descarta la fila
— y como eso pasa con **todas**, la consulta devuelve vacío. No falla: devuelve vacío.

**La regla:** usa `NOT EXISTS` en lugar de `NOT IN` siempre que la subconsulta pueda contener
nulos. `EXISTS` devuelve un booleano y **nunca nulo**, así que no tiene este modo de fallo. Si
te quedas con `NOT IN`, la subconsulta tiene que excluir los nulos de forma explícita.

**En una columna que admite nulos, cada condición tiene que decidir qué hace con ellos.** No es
un detalle de estilo: es la diferencia entre un filtro que cuenta 1 000 filas y uno que cuenta
980 sin avisar de nada.

---

## 2. Joins: qué filas sobreviven y cuántas veces

### El `LEFT JOIN` que en realidad es un `INNER JOIN`

El error más frecuente y el más difícil de ver leyendo:

```sql
-- ✗ Esto NO es un left join: se comporta como inner join
SELECT c.id, p.total
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id
WHERE p.estado = 'pagado';          -- ← la condición mata el LEFT

-- ✓ La condición de la tabla derecha va en el ON
SELECT c.id, p.total
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.estado = 'pagado';
```

El mecanismo es el de la sección 1: el `LEFT JOIN` conserva el cliente sin pedidos rellenando
las columnas de `pedidos` con nulos; después el `WHERE` compara ese nulo con `'pagado'`, obtiene
desconocido y **descarta la fila**. Los clientes sin pedidos desaparecen del informe, que es
justo lo que el `LEFT JOIN` estaba ahí para evitar.

- **Condición sobre la tabla de la derecha → va en el `ON`.**
- **Condición sobre la tabla de la izquierda → va en el `WHERE`.**
- **Excepción deliberada:** `WHERE p.id IS NULL` tras un `LEFT JOIN` es el patrón *anti-join* —
  «clientes que no tienen ningún pedido»— y ahí el `WHERE` es correcto y necesario. Si ves un
  `IS NULL` sobre la tabla derecha, es intención; cualquier otra condición, es el bug.

### La multiplicación de filas que rompe los totales

Un join uno-a-muchos **duplica las filas del lado uno**, una vez por cada coincidencia del lado
muchos. Si después agregas, agregas sobre las copias:

```sql
-- ✗ Cada factura se suma tantas veces como líneas tenga
SELECT f.cliente_id, SUM(f.importe)
FROM facturas f
JOIN lineas_factura l ON l.factura_id = f.id
GROUP BY f.cliente_id;
```

El resultado no es un error: es un número más grande, plausible y equivocado. **Si en la misma
consulta hay un join uno-a-muchos y una función de agregación sobre la tabla del lado uno, hay
que demostrar que no se cuenta de más.** Se resuelve agregando primero en una subconsulta y
uniendo el resultado, o agregando con `DISTINCT` cuando la clave lo permita.

**Señal para revisar un diff:** join más `SUM`, `COUNT` o `AVG` sobre columnas de tablas
distintas. No siempre está mal; siempre hay que mirarlo.

### Y el resto

- **`INNER JOIN` descarta en silencio.** Si la clave foránea admite nulos o hay huérfanos, esas
  filas desaparecen del resultado sin ningún aviso. Cuando el informe tiene que incluirlas, el
  join es externo.
- **Producto cartesiano accidental.** Un join sin condición —o con la condición mal escrita—
  cruza cada fila con cada fila. Con dos tablas de 10 000 filas son 10⁸ resultados: es el único
  defecto de esta guía que además se nota, porque tumba el proceso (`coste-y-estructuras` (skill de OpenCode, auto-activable)).

---

## 3. Agregación

- **`COUNT(*)` no es `COUNT(columna)`.** El primero cuenta filas; el segundo cuenta *filas con
  valor no nulo en esa columna*. Elegir mal cambia el resultado en cuanto hay nulos, y la
  diferencia no se ve leyendo.
- **`SUM` sobre cero filas devuelve `NULL`, no `0`.** Está dicho con todas las letras en la
  documentación de PostgreSQL: *«sum of no rows returns null, not zero as one might expect»*.
  Si el valor viaja a un cálculo o a la interfaz, envuélvelo (`COALESCE(SUM(x), 0)`). `COUNT` es
  la excepción: nunca devuelve nulo.
- **Las agregaciones ignoran los nulos.** `AVG` sobre una columna con nulos es el promedio de
  los valores presentes, **no** el promedio tratando los nulos como cero. Son dos números
  distintos y el correcto depende del dominio: decídelo, no lo heredes.
- **`WHERE` filtra filas; `HAVING` filtra grupos.** Poner en `HAVING` una condición que no
  depende de la agregación funciona, pero filtra después de agrupar: mismo resultado y más
  trabajo. Al revés —una condición sobre el agregado en el `WHERE`— directamente no es válida.
- **`GROUP BY` y las columnas sueltas.** Seleccionar una columna que no está en el `GROUP BY` ni
  va dentro de una función de agregación es un error en el estándar. MySQL 8 lo rechaza por
  defecto (`ONLY_FULL_GROUP_BY`), pero **si alguien desactiva ese modo la consulta se acepta y
  el motor elige un valor cualquiera de cada grupo**: *«the values chosen are nondeterministic,
  which is probably not what you want»* (manual de MySQL). Un resultado no determinista es peor
  que un error, porque parece correcto.

---

## 4. Transacciones: dónde empieza y dónde acaba

Una transacción no es «envolver por si acaso». Es **la frontera dentro de la cual el sistema
puede estar inconsistente sin que nadie lo vea**, y decidir dónde está esa frontera es una
decisión de diseño.

- **La frontera es del caso de uso, no del repositorio.** Si cada función que escribe abre y
  cierra su propia transacción, una operación de negocio con tres escrituras puede quedarse a
  medias: dos confirmadas y una fallida. La transacción envuelve la operación completa.
- **Nada irreversible dentro de una transacción.** Enviar un correo, llamar a un tercero,
  publicar un evento o escribir un fichero **no se deshacen con `ROLLBACK`**. Si la transacción
  falla después, el mundo exterior ya se enteró de algo que no ocurrió. Van fuera y después de
  confirmar.
- **Leer, decidir en la aplicación y escribir no es atómico.** Comprobar que quedan unidades y
  luego descontarlas son dos operaciones: entre ambas cabe otra transacción. Se resuelve con una
  condición en la propia escritura, con un bloqueo explícito o con una restricción en la base de
  datos que impida el estado imposible. La restricción es la más barata de las tres, porque no
  depende de que nadie se acuerde.
- **Transacción corta.** Todo lo que dure de más mantiene bloqueos y conexiones ocupadas
  (`rendimiento` (skill de OpenCode, auto-activable), la ley de Little). No metas dentro trabajo que puede ir fuera.

**El nivel de aislamiento por defecto NO es el mismo en todos los motores**, así que un
comportamiento que asumes por costumbre puede no cumplirse:

| Motor | Nivel por defecto | Consecuencia práctica |
|---|---|---|
| PostgreSQL | `READ COMMITTED` | Dos lecturas dentro de la misma transacción **pueden dar resultados distintos** |
| MySQL / InnoDB | `REPEATABLE READ` | Las lecturas de la transacción ven la instantánea de la primera |

En PostgreSQL, `READ COMMITTED` admite lecturas no repetibles, lecturas fantasma y anomalías de
serialización; solo `SERIALIZABLE` las evita todas. Su `REPEATABLE READ` además es más fuerte
que el estándar: también evita las fantasma. **Si tu lógica depende de que dos lecturas
coincidan, eso es un requisito y se escribe** — no se da por hecho.

---

## 5. Lógica en la base de datos: vistas, triggers y procedimientos

Aquí la guía se cruza con `arquitectura` (skill de OpenCode, auto-activable), y la regla es la misma vista desde el lado de
los datos.

- **Una vista es una consulta con nombre, no una tabla.** No almacena datos: se ejecuta cada vez
  que se consulta. Es buena para no repetir un join complicado; no convierte en barato lo que
  era caro, y anidar vistas sobre vistas esconde el coste real de la consulta que acaba
  ejecutándose. (Una vista **materializada** sí almacena, y entonces tiene el problema de
  cualquier caché: cuándo se refresca — ver `rendimiento` (skill de OpenCode, auto-activable).)
- **Un trigger es lógica de negocio invisible.** Se ejecuta sin que nadie lo llame, no aparece
  en el código de la aplicación, no sale en el diff de la funcionalidad que lo dispara y es
  difícil de probar. Cuando alguien depure por qué un campo cambia solo, no va a mirar ahí.
  **El listón para añadir uno es alto**, y lo justifican sobre todo los usos que la aplicación
  no puede garantizar: auditoría que no se puede saltar, o coherencia que debe cumplirse aunque
  escriba otro cliente distinto de tu aplicación.
- **Lo que sí conviene empujar a la base de datos son las restricciones**, no la lógica:
  `NOT NULL`, `UNIQUE`, claves foráneas, `CHECK`. No son lógica escondida — son la definición de
  qué estados existen, y son la única defensa que sigue en pie cuando el dato entra por una
  migración, por un script o por otra aplicación (`migraciones-de-datos` (skill de OpenCode, auto-activable)).
- **Los permisos son parte del diseño.** El usuario con el que la aplicación se conecta no
  necesita poder borrar tablas. `GRANT` y `REVOKE` existen para eso, y el privilegio mínimo
  convierte una inyección con éxito en un incidente mucho más pequeño.

---

## Cómo aplicarla

- **En `/plan`:** cuando un criterio de aceptación diga «el informe muestra…», define **qué pasa
  con los casos vacíos y con los nulos** — un cliente sin pedidos, un mes sin ventas. Ese es el
  criterio que después separa el `LEFT` del `INNER` y el `0` del `NULL`, y sin él la consulta se
  escribe a ojo (`historias-usuario` (skill de OpenCode, auto-activable)).
- **En `/implement`:** el caso de prueba de una consulta no es solo el camino feliz. Los que
  atrapan los defectos de esta guía son **la fila sin relación** (¿aparece o desaparece?), **la
  columna nula** (¿la cuenta o la ignora?), **el conjunto vacío** (¿devuelve `0` o `NULL`?) y
  **el lado muchos con dos filas** (¿suma una vez o dos?). Cuatro casos, y son casi siempre los
  mismos (`niveles-y-tipos-de-prueba` (skill de OpenCode, auto-activable)).
- **En `/review`:** recorre sobre lo que el diff **introduce o cambia**, y decide la fuerza de
  cada señal **antes** de puntuarla (`revision-hallazgos` (skill de OpenCode, auto-activable)). **Bastan solas:** `NOT IN`
  contra una subconsulta que admite nulos; condición de la tabla derecha en el `WHERE` de un
  `LEFT JOIN` —salvo que sea `IS NULL`, que es el anti-join y es intención—; escritura que
  depende de una lectura previa sin protección; y efecto irreversible dentro de la transacción.
  **Débiles en solitario**, que piden una segunda señal o la consecuencia concreta: agregación
  sobre un join uno-a-muchos, `COUNT(columna)` donde se querían contar filas, y `SELECT *`.
  Severidad **Alta** cuando el resultado alimenta una decisión o un importe: es un defecto de
  corrección, no de estilo.

## Anti-patrones (nómbralos para no caer en ellos)

- **Tratar `NULL` como un valor más** — compararlo con `=`, esperar que `<>` lo incluya, sumarlo
  como si fuera cero. Es el origen de la mayoría de los defectos de esta guía.
- **`NOT IN` contra una subconsulta que admite nulos** — no falla, devuelve vacío. El síntoma
  llega como «no salen resultados» y se busca el fallo en cualquier otro sitio.
- **`LEFT JOIN` con la condición en el `WHERE`** — el join externo que alguien escribió a
  propósito, anulado por la línea siguiente.
- **Agregar sobre filas multiplicadas** — el total sale mayor, plausible y equivocado.
- **`SELECT *` en código de producción** — trae columnas que nadie usa, se rompe al añadir una
  columna y oculta qué depende de qué. Nombra las columnas.
- **Transacción como envoltorio por si acaso** — abrir una sin saber qué invariante protege.
  Si nadie sabe decir qué debe pasar entera o nada, no es una frontera, es ruido.
- **Efecto irreversible dentro de la transacción** — el correo enviado no se revierte.
- **Lógica de negocio en un trigger** — funciona hasta que alguien tiene que entender por qué
  cambió un dato y no encuentra el código que lo hizo.
- **Confiar en el nivel de aislamiento por defecto sin saber cuál es** — lo que es cierto en
  MySQL no lo es en PostgreSQL.
- **Comprobar la consulta solo con el camino feliz** — con datos de ejemplo completos y sin
  nulos, todos los defectos de esta guía pasan verdes.

## Autocrítica antes de cerrar

Antes de dar por buena una consulta, pregúntate: **¿qué columnas de esta consulta admiten nulos,
y he decidido qué hace cada condición con ellos? ¿este `LEFT JOIN` sigue siendo externo después
del `WHERE`? ¿hay un join uno-a-muchos y una agregación en la misma consulta, y he comprobado
que no cuenta de más? ¿qué devuelve esto cuando no hay ninguna fila —`0` o `NULL`— y quién lo
recibe? ¿la transacción envuelve la operación de negocio completa, y hay algo irreversible
dentro? ¿estoy asumiendo un nivel de aislamiento que no he comprobado?** Si algo falla,
corrígelo antes de seguir.
