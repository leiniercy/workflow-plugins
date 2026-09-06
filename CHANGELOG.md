# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

Cierra el backlog: los nueve pendientes que quedaban en 🔜 quedan en cero. Dos se dejan fuera
**por decisión declarada, no por olvido** — perfiles de stack (§7), que el propio catálogo marca
como iniciativa aparte, y el glosario `CONTEXT.md` (§9.A), que merece decidir antes si es guía o
sección.

### Añadido

- **Testing basado en riesgo en `/plan`** (ISO/IEC/IEEE 29119-2): los criterios se ordenan por
  probabilidad de fallo × impacto y la spec dice dónde va el esfuerzo. Sin esa ordenación se
  reparte plano y acaba donde es cómodo de probar, no donde duele.
- **Menú de cierre de rama en la Fase 4 de `/implement`** (§2.C): tres opciones literales, con
  **dejarlo como está** por defecto, confirmación de la rama base y suite **sobre el árbol que se
  va a integrar** —no sobre el que quedó verde, que son distintos en cuanto alguien más empuja—.
  Descartar exige la palabra exacta `discard`: es el único punto del flujo donde una respuesta
  ambigua destruye trabajo.
- **Worktree de revisión cableado en `/review`** (§12): si hay que revisar otra rama y el árbol
  del usuario tiene cambios sin commitear, se ofrece worktree en vez de cambiarle la rama bajo
  los pies.
- **`--runs N` y la varianza como métrica** en `check-activation.mjs` (§2.A, micro-test de
  wording): un caso solo pasa si es **estable en las N**. Si unas repeticiones activan la guía y
  otras no, lo que no ata es el wording de la `description` — se reescribe la description, no el
  caso.
- **`license: MIT`** en el frontmatter de las skills generadas (§4): sin él, una skill extraída
  del plugin viaja sin licencia. Verificado con `claude plugin validate --strict`.

### Cerrado sin cambios

- **Riesgo de `<SUBAGENT-STOP>`** (§2.D): estaba anotado como «no comprobado empíricamente».
  Comprobado por configuración — el `matcher` del hook es `startup|clear|compact` y el despacho
  de un subagente no es ninguno de esos eventos, así que `SessionStart` no le alcanza. **No se
  añade la guarda**: habría sido una línea que no protegía de nada.
- **Corpus de prompts adversariales** (§2.D): la maquinaria ya existía desde
  `adapters/claude/evals/`. Lo que queda es poblarlo, y eso se hace calibrando, no diseñando.

## [0.17.0] - 2026-09-06

## [0.16.0] - 2026-09-06

### Añadido

- **Paquete de revisión por fichero en `/review`** — era el pendiente prioritario del backlog
  (§2.B) y el mayor ahorro de contexto disponible. El diff ya no viaja dentro de los prompts: la
  Fase 2 lo escribe con `git diff -U10 develop...HEAD > /tmp/review-<taskId>.diff` y a los cinco
  agentes se les pasa **la ruta**. En contexto se quedan solo `--stat` y los commits, que es lo
  que hace falta para repartir dimensiones. El principio que lo justifica queda escrito en el
  workflow: todo lo que se pega en un prompt **queda residente el resto de la sesión y se relee
  en cada turno**, así que un diff pegado a cuatro subagentes se paga cinco veces.
- **Contrato de entrada por rutas** en los cuatro revisores y en `verificador-hallazgos`:
  `Read` es lo primero que hacen. Su allowlist de herramientas **no cambia** — `Read` ya bastaba.
- **Cuatro aserciones nuevas** en `check-behavior.mjs` (205 → 209) que encodean el contrato: que
  `/review` genera el paquete, que despacha con rutas, y que los cinco agentes lo esperan por
  ruta. Es una regresión fácil de introducir sin darse cuenta —basta con volver a redactar
  «pásale el diff»— y que no rompe nada visible: solo multiplica el gasto en silencio.
- **Bandera roja nueva** en `/review`: «le pego el diff al subagente, que así lo tiene seguro».

- **Bucket `core/guides/in-progress/`** — el único sitio donde una guía puede existir sin
  enviarse. Hasta ahora las 21 se publicaban todas, así que la única forma de no publicar algo
  era no escribirlo y el trabajo a medias se perdía entre sesiones. Con su README: para qué
  sirve, el contrato de cuatro puntos, y cómo se promueve y se retira.
- **Dos aserciones nuevas en `check-behavior.mjs`** (202 → 204 con un borrador presente): un
  borrador **no genera skill**, y no colisiona con una guía publicada del mismo nombre. El otro
  lado del contrato ya era ruidoso —promover sin mover el fichero revienta `sync.mjs`—; este era
  el lado silencioso. Verificado creando la violación y comprobando que el check falla.

- **`grafo-conocimiento`: sección «Índice antes que detalle»** — el patrón de *progressive
  disclosure* que el backlog tenía en 🟡 desde §1, generalizado a las tres fuentes de volumen:
  el grafo (`query` acota, `explain` solo de los supervivientes), ClickUp (buscar devuelve ids y
  títulos; la tarea completa solo de la que se va a trabajar) y los ficheros (`grep` acota,
  `Read` confirma). Con las tres capas —índice, filtro, detalle—, sus dos anti-patrones y su
  «cuándo NO aplica». El argumento que lo justifica: ese gasto no lo paga el repositorio, lo
  paga la ventana de contexto de quien trabaja, y no se nota hasta que se agota a mitad de tarea.

- **Ocho casos en la checklist manual del eval** (§1, casos 1.24–1.31): las dos guías nuevas
  (`coste-y-estructuras`, `consultas-correctas`), el hallazgo de la clave foránea sin índice de
  `rendimiento` y las tres transferencias de método. Tapaba un hueco propio — ninguna de las dos
  guías nuevas tenía verificación de activación, ni siquiera manual — con una nota que remite a
  los candidatos automatizados de §0 y avisa de que siguen sin calibrar.
- **`experimental.evals` en el manifiesto del plugin**, para que `claude plugin eval` encuentre
  `adapters/claude/evals/` cuando se habilite el early access. Verificado con las dos órdenes
  exactas que corre `manifest-check.yml`: `validate adapters/claude --strict` y `validate . --strict`.

## [0.15.0] - 2026-09-06

Cierra el hueco que el eval determinista dejaba abierto: `check-behavior.mjs` asevera **la
forma** del disparador de cada guía, no que dispare. Ahora hay un tercer nivel de eval que sí lo
comprueba, con la regla que lo hace útil: **que una guía se active no demuestra que sirva**.

### Añadido

- **`scripts/check-activation.mjs`** — eval de activación semi-automático. Lanza sesiones reales
  aisladas (`claude -p --plugin-dir`, que carga el plugin **solo para esa sesión** y no instala
  nada) y comprueba en la traza `stream-json` qué guía se invocó y si la respuesta contiene lo
  que la guía aporta. Con `--baseline` corre además el brazo **sin** plugin y marca como
  **⚠ SIN DELTA** los casos que la línea base también acierta: son un bug **del caso**, no del
  plugin — el mismo defecto que `niveles-y-tipos-de-prueba` llama *detector de cambios*.
- **Siete casos candidatos** en `adapters/claude/evals/`, en el formato que espera
  `claude plugin eval` (`prompt.md` + `graders/criteria.md`), más un `expect.json` legible por
  el script. Cubren las dos guías nuevas, las tres transferencias de método y el hallazgo de la
  clave foránea sin índice.
- **`docs/eval-comportamiento.md` §0** — cómo se corre, qué consume (medido: 0,32–0,49 USD
  equivalentes por sesión; con sesión OAuth eso no se factura, consume límite de uso) y por qué
  no está en CI: allí haría falta una clave de API y sí se facturaría.

### Cambiado

- **`docs/eval-comportamiento.md`: corregida una imprecisión propia** — decía que
  `check-behavior.mjs` asevera «auto-activación de guías». Asevera la **forma** del disparador;
  que dispare exige un modelo y no lo comprobaba nadie.

### Pendiente (declarado a propósito)

- **Los siete casos van `"calibrado": false`.** Se eligieron por síntomas que parecen difíciles
  para la línea base, pero **no se ha comprobado**: la calibración son dos sesiones por caso y se
  detuvo para no gastar cuota fuera de la sesión de trabajo. Hasta correrlos con `--baseline`
  son candidatos, no verificación.
- **Lo que sí está medido:** `consultas-correctas` y `coste-y-estructuras` se activan solas ante
  sus síntomas (verificado). Y un dato incómodo que quedó registrado: para el `LEFT JOIN` con la
  condición en el `WHERE`, **la línea base acierta igual** — de ahí que ningún caso use ese
  síntoma.

## [0.14.0] - 2026-09-06

El catálogo pasa de 20 a 21 guías con `consultas-correctas`, a partir del estudio de tres
fuentes sobre SQL (§17 de `docs/referencias.md`). Cubre el hueco de la **corrección** de una
consulta: defectos que no son lentos ni inseguros —son válidos, pasan los tests con datos de
ejemplo y devuelven otro número—. Ninguna afirmación de semántica se importó de las fuentes: se
contrastaron con la documentación de PostgreSQL y de MySQL, que es lo que la guía cita.

### Añadido

- **Guía `consultas-correctas`** — cinco secciones sobre lo que ninguna guía cubría: la lógica
  de tres valores y el `NULL` que no es un valor (`WHERE` descarta lo desconocido igual que lo
  falso); los joins por su modo de fallo (el `LEFT JOIN` que un `WHERE` sobre la tabla derecha
  convierte en `INNER`, con la excepción deliberada del *anti-join*; la multiplicación de filas
  de un uno-a-muchos que rompe los totales); las trampas de la agregación (`COUNT(*)` ≠
  `COUNT(columna)`, `SUM` de cero filas es `NULL`, las agregaciones ignoran nulos, `GROUP BY`
  con columnas sueltas y resultados no deterministas); la transacción como **frontera de la
  operación de negocio** con nada irreversible dentro; y la lógica en la base de datos
  —restricciones sí, triggers con listón alto— encuadrada con `arquitectura`.
- **`consultas-correctas`: `NOT EXISTS` frente a `NOT IN`** — contra una subconsulta que admite
  nulos, `NOT IN` devuelve nulo (no verdadero) y por tanto **cero filas, sin fallar**. Verificado
  en la documentación de PostgreSQL.
- **`consultas-correctas`: el nivel de aislamiento por defecto difiere entre motores** —
  PostgreSQL `READ COMMITTED`, MySQL/InnoDB `REPEATABLE READ`. Si la lógica depende de que dos
  lecturas coincidan, es un requisito y se escribe.
- **`consultas-correctas`: cuatro casos de prueba que atrapan estos defectos** — la fila sin
  relación, la columna nula, el conjunto vacío y el lado muchos con dos filas. Enganchado con
  `niveles-y-tipos-de-prueba`.
- **`rendimiento`: clave foránea sin índice** como defecto visible en código. `PRIMARY KEY` y
  `UNIQUE` crean su índice solos; **`FOREIGN KEY` no** («the declaration of a foreign key
  constraint does not automatically create an index on the referencing columns», PostgreSQL).
  Corrige lo que las fuentes daban a entender.

## [0.13.0] - 2026-09-06

El catálogo pasa de 19 a 20 guías con `coste-y-estructuras`, a partir del estudio de los 54
manuales de algoritmia de la OIE (§16 de `docs/referencias.md`). Cierra el **primer movimiento**
de una regla que solo tenía el segundo: `rendimiento` sabía decir «no sustituyas una estructura
sin medir», pero no «cuál eliges cuando todavía no hay código y no hay nada que medir». Y trae
tres transferencias de método —el oráculo, el contraejemplo, la pregunta online/offline— que
viajan entre dominios mejor que las técnicas de las que salen.

### Añadido

- **Guía `coste-y-estructuras`** — la decisión anterior a la medición: derivar del volumen la
  clase de complejidad admisible, leer la clase de coste de un código (bucles anidados, el
  `j = i+1` que no cambia la clase, recursión por niveles, peor caso, coste amortizado) y elegir
  el contenedor por las operaciones que necesita. Trae el repertorio de estructuras avanzadas con
  su condición de uso y, sobre todo, con el aviso de cuándo **no** escribirlas: en un repo de
  aplicación, lo que aquí es un árbol de segmentos allí es un índice.
- **`coste-y-estructuras`: firma nueva para `/review`** — bucle anidado, explícito o escondido en
  una búsqueda lineal, sobre dos colecciones que crecen sin techo cuando una podía indexarse por
  clave. Mismo perfil que el N+1: correcto hoy, roto con volumen, evitable mientras escribes.
- **`niveles-y-tipos-de-prueba`: el oráculo lento** — qué hacer cuando el valor esperado no se
  puede derivar a mano: escribir a propósito la versión lenta y obviamente correcta y comparar
  ambas sobre entradas pequeñas. Es la puerta a las pruebas basadas en propiedades y la técnica
  con la que se comprueba una heurística antes de fiarse de ella.
- **`evidencia-y-preguntas`: buscar el contraejemplo** — una regla deducida no se comprueba
  acumulando casos a favor; no basta con no tener contraejemplo, hay que haberlo buscado. Con su
  bandera roja («he probado cinco casos y sale bien»).
- **`arquitectura`: sección «¿Síncrono o por lotes?»** — la pregunta que casi nadie plantea en
  diseño y que se ve en la interfaz, con su anti-patrón: quedarse en síncrono por inercia, que es
  el modo más caro y el que menos soluciones admite.

### Cambiado

- **`rendimiento`: frontera explícita** con `coste-y-estructuras` en «Lo que NO se juzga sin
  medir» — sustituir una estructura escrita exige medición; elegirla la primera vez, no.

## [0.12.0] - 2026-09-04

El catálogo de guías pasa de 18 a 19 con `evidencia-y-preguntas`, la primera guía **transversal**
del plugin. Y se cierra el **segundo movimiento** de tres reglas que solo tenían el primero
—sabíamos decir «no metas una caché a la ligera» pero no «qué revisar cuando alguien la mete»;
«toda colección se pagina» pero no «con qué estrategia»; «que haya índice» pero no «del tipo que
sirve»— a partir del análisis de ByteByteGo (§15 de `docs/referencias.md`).

### Añadido

- **Guía `evidencia-y-preguntas`** — principio transversal: todo dato escrito es hecho
  comprobado, asunción declarada o dato del usuario, y lo que no cae en las tres no se escribe.
  Trae el **test de los tres escalones** para decidir entre verificar, asumir declarándolo y
  preguntar, con el desempate («si la respuesta fuera la otra, ¿cambiaría lo que voy a
  construir?»), y ataca también el fallo contrario: no se pregunta lo que está en el repo.
  Enganchada en las banderas rojas de los cuatro workflows.
- **`rendimiento`: sección «Cuando el cambio SÍ mete una caché»** — la guía frenaba la caché
  como primera respuesta, pero no decía qué revisar cuando el diff sí la introduce. Cubre
  estampida, penetración, invalidación ausente, caché tratada como fuente de verdad y clave que
  no distingue lo que la respuesta distingue.
- **`rendimiento`: sección «Perseguir una ruta lenta»** — orden red → código → datos → terceros
  → entorno, midiendo antes de bajar de escalón; enganchada con `depuracion-sistematica`.
- **`rendimiento`: latencia vs. throughput** con la ley de Little dentro del criterio de
  rendimiento, más el aviso sobre la fórmula invertida que circula en material divulgativo.
- **`rendimiento`: paginación por desplazamiento** como defecto visible en código cuando la
  colección crece sin techo (el coste crece con la profundidad de la página, no con su tamaño).
- **`arquitectura`: idempotencia por método HTTP** (RFC 9110) y clave de idempotencia para
  `POST`/`PATCH`, donde antes había una sola línea.
- **`revisor-bugs-seguridad`: XSS basado en DOM** en A03 — recorrido origen→sumidero en el
  código de cliente, con la razón de por qué ninguna defensa de servidor lo detecta.
- **`revisor-bugs-seguridad`: respuesta autenticada declarada cacheable en caché compartida** en
  A02 (`private` / `no-store`, RFC 9111), con la regla que evita el falso positivo inverso.
- **`arquitectura`: sección «Dos patrones que se pagan caro»** — event sourcing y CQRS,
  redactados **por su coste** y fuera del catálogo de estilos (no lo son, igual que DDD).
  Recoge que **no se implican**, que el disparador más frecuente de event sourcing —querer
  auditoría— es justo su «cuándo NO», y el límite de CQRS al bounded context. El PDF los
  describe en neutro; todo el freno viene de contrastar con Fowler, la fuente que la guía ya
  citaba.
- **§15 de `docs/referencias.md`** — ByteByteGo *Big Archive: System Design 2025*, con lo
  adoptado, lo descartado y **los cuatro errores detectados en la fuente**, para que no se
  reimporten.

### Cambiado

- **`arquitectura`: la forma de paginar pasa a ser parte del contrato de API** — elegir entre
  desplazamiento y cursor se decide al planificar, porque cambiarlo después rompe a todos los
  consumidores de golpe.
- **`rendimiento`: «índice ausente» pasa a «ausente o de un tipo que no sirve para esa
  consulta»** — un índice hash solo resuelve igualdad, así que se comprueba la correspondencia
  con la forma de la consulta, no solo la presencia.

### Corregido

- **`check-behavior.mjs` no cubría las guías recién añadidas** — su lista `GUIDES` se mantenía a
  mano, así que una guía nueva se generaba y **se enviaba sin que ninguna aserción la
  comprobara**. Se detectó porque el contador de aserciones seguía en 177 después de añadir una
  guía. Arreglado derivando la lista del **disco** (`core/guides/*.md`) — no de `sync.mjs`: la
  cabecera del script declara que re-declara sus expectativas a propósito, y derivarlas del
  registro lo volvería tautológico (borrar una guía de `sync.mjs` haría que el check la siguiera
  y diera verde). El disco es una fuente independiente del registro, así que ahora una guía
  presente en `core/guides/` y ausente del registro **hace fallar el check** — verificado
  creando una guía huérfana y comprobando que salta. 186 aserciones.

## [0.11.0] - 2026-08-03

Versión de consolidación: **el catálogo de guías pasa de 12 a 18**, llega el primer hook
determinista del plugin y se corrige un fallo silencioso de frontmatter que arrastraba la 0.6.0
ya publicada.

> **Sobre el salto 0.6.0 → 0.11.0.** Los tags `v0.7.0`, `v0.8.0`, `v0.9.0` y `v.0.10.0` se
> publicaron con los manifiestos todavía en 0.6.0, así que esta entrada **reconcilia la versión
> declarada con la ya etiquetada** en vez de reutilizar números ocupados. `check-version.mjs`
> compara `plugin.json` ↔ `marketplace.json` ↔ CHANGELOG, pero **no** contra los tags de git:
> ese es el hueco que permitió la deriva.

Siete análisis externos catalogados en `docs/referencias.md`: re-análisis a fondo de
**superpowers v6.2.0** (§2, ampliada con §2.A–§2.D), **mattpocock/skills** (§9, la familia
`grill` y la arquitectura de una librería de skills), **obra/superpowers-skills** (§10, skills de
pensamiento), el **ecosistema de agregadores** skillsmp/mcpmarket (§11, sin cambios de código),
**worktrees** (§12), **QA exploratoria** (§13) y **frontera pública y cambios irreversibles**
(§14: rendimiento, migraciones, SEO/i18n y contrato de API).

### Corregido

- **El frontmatter de las skills y agentes no parseaba como YAML** — fallo silencioso presente
  ya en la **v0.6.0 publicada** (10 ficheros afectados; verificado extrayendo el HEAD commiteado
  y validándolo aparte). `sync.mjs` emitía `description:` como escalar YAML **plano**, y un
  escalar plano no puede contener «: », que nuestras descripciones llevan de forma natural
  («GoF: catálogo de estilos…»). Consecuencia, en palabras del validador oficial: *«at runtime
  this skill loads with empty metadata (all frontmatter fields silently dropped)»* — se perdían
  `name`, `description` y `user-invocable`, así que **las guías dejaban de auto-activarse sin
  que nada lo indicara**. Arreglado con un helper `yamlString()` que entrecomilla y escapa todo
  escalar de `description` y `argument-hint` (7 puntos de emisión + el agente primario de
  OpenCode). Detectado al adoptar `claude plugin validate --strict` de mattpocock/skills (§9.C).

### Añadido

- **Guía nueva `rendimiento`** (§14 de `docs/referencias.md`): cierra el hueco autodeclarado de
  ISO 25010 — «eficiencia de desempeño» era la única característica que `calidad-producto`
  nombraba sin guía detrás. Sostiene **dos filos a la vez**: no optimizar lo que no se ha medido
  (una optimización sin medición es complejidad gratis, la misma disciplina que
  `patrones-diseno` aplica a las abstracciones) **y** reportar los defectos que sí se ven en el
  diff, porque no son «lento» sino errores de diseño conocidos que empeoran con el volumen
  (consulta dentro de un bucle, trabajo cuadrático, llamadas independientes en serie, listado
  sin paginar, filtrado en memoria de lo que haría el motor de datos). Añade el **criterio de
  cuatro piezas** —qué se mide, con qué volumen, en qué entorno, cuál es el límite— y el **juego
  de escalas** (1000× más / 1000× menos) para *derivar* el volumen en vez de inventarlo, lo que
  cierra un 🔜 pendiente de §10. Cableada en «Requisitos no funcionales» de `/plan`, en el paso
  de refactor de `/implement` (que es de diseño, no de velocidad) y en la dimensión 4 de
  `/review` vía `revisor-convenciones`.

- **Guía nueva `migraciones-de-datos`** (fuentes: Fowler *ParallelChange*; Sadalage & Ambler,
  *Refactoring Databases*): el flujo no tenía **nada** sobre el único cambio que un `git revert`
  no deshace. Diez reglas duras —reverso obligatorio escrito a la vez que la ida, ninguna
  operación destructiva sin aprobación explícita, nunca un borrado o actualización sin
  condición, columna obligatoria nueva en tres pasos, renombrar no es borrar+crear,
  **compatibilidad hacia atrás durante el despliegue** (expandir/contraer: mientras despliegas,
  el código anterior sigue vivo contra el esquema nuevo), claves foráneas con comportamiento
  explícito al borrar, índices con nombre y sin bloquear, una migración aplicada se corrige con
  otra nueva, y se prueba **aplicando y revirtiendo** sobre datos con forma y volumen
  realistas—. Cableada como decisión de diseño en `/plan`, **gate propio** en `/implement`
  (aprobación explícita para lo destructivo o irreversible y para cualquier entorno ajeno) y
  check de severidad **Alta** en la dimensión 2 de `/review`: el impacto no es un fallo, es
  pérdida de datos.

- **Hook `PreToolUse` `destructive-guard.js`** — el primer gate **determinista** del plugin.
  Los gates de aprobación viven en la prosa de los comandos: gobiernan al agente cuando razona,
  no cuando se salta el paso. Este hook devuelve la decisión al usuario antes de ejecutar lo
  irreversible: `ask` por defecto (push forzado, `reset --hard`, `clean -f`, borrado forzado de
  rama, `rm -rf` acotado, `DROP TABLE`/`TRUNCATE`, `DELETE`/`UPDATE` sin `WHERE`, reinicio de
  migraciones, escritura sobre `.env*` y edición de una migración ya existente) y `deny` solo
  donde no hay uso legítimo iniciado por un agente (push forzado a `main`/`master`/`develop`,
  `DROP DATABASE`, `rm -rf` sobre `/`, `~` o un comodín sin acotar). Se ajusta por entorno con
  `CUSTOM_IA_PROTECTED_PATHS` y `CUSTOM_IA_GUARD=off`. Documentado con su límite: es una **red
  para accidentes, no un sandbox** —un agente decidido puede reformular el comando—; el bloqueo
  duro de solo-lectura sigue siendo el campo `tools` de los agentes revisores.

- **`examples/CLAUDE.md.example`** — plantilla de contexto permanente para el repo consumidor.
  Teníamos `AGENTS.md.example`, que describe **el flujo**, y nada que describiera **el repo**:
  stack, comandos exactos, convenciones que no detecta el linter, patrones del proyecto, reglas
  de negocio, ficheros intocables y una lista explícita de «qué NO hacer». Alimenta las
  «convenciones del repo detectadas» de `/plan` y la lista de rutas protegidas del hook nuevo.
  `examples/repo-settings.json` incorpora el bloque `env` para configurarlo y **recetas
  comentadas** (formateo post-edición, aviso remoto al terminar) que el plugin deliberadamente
  no empaqueta: dependen del stack de cada equipo.

- **SEO técnico e internacionalización en `usabilidad-accesibilidad`** — absorbidos como
  secciones de la guía existente, no como guías nuevas, para no inflar el catálogo ni añadir un
  agente. **Corrige un descarte previo:** habíamos agrupado el SEO con la operación («es del
  repo objetivo»), y es falso para lo que vive en el código — metadatos propios de cada ruta,
  canónica, marcado estructurado válido *solo si el contenido es de ese tipo*, indexabilidad
  generada desde las rutas reales, y **redirección permanente al mover una URL ya publicada**
  (severidad Alta: rompe enlaces externos). En i18n, con el gate «solo si el repo YA la tiene»:
  un literal en duro en un repo traducido es un hallazgo objetivo, pero proponer internacionalizar
  de paso es cambiar el alcance. La dimensión 6 de `/review` pasa a **«Usabilidad, accesibilidad
  y SEO»** y su gate se amplía a «UI **o rutas públicas**», con la regla que evita el ruido:
  encabezados, `alt` e idioma sirven a los dos frentes y se reportan **una** vez.

- **Contrato de API en `arquitectura`** — un endpoint es una frontera arquitectónica publicada,
  así que su contrato se decide al planificar y no se descubre al integrar: coherencia con los
  endpoints vecinos antes que con el libro, validación de la entrada por esquema **en la
  frontera**, códigos de estado que distingan los casos, forma del error consistente y sin
  filtraciones, paginación en toda colección, cambios aditivos o versionados, e idempotencia
  donde el cliente puede reintentar. Se juzga en la dimensión 4, dejando autorización y
  exposición de datos a la 5 para no reportar dos veces lo mismo.

- **Guía nueva `depuracion-sistematica`** (fuente: `obra/superpowers`, `systematic-debugging`):
  cuatro fases con la ley «ningún arreglo sin investigación de causa raíz primero»,
  instrumentación por frontera en sistemas multi-componente, trazado del dato hacia atrás hasta
  su origen, la **regla de los tres arreglos fallidos** (tres fallos no son una hipótesis
  equivocada sino un diseño equivocado: parar y consultar) y una tabla de **señales del usuario**
  de que se está adivinando en vez de investigar. Añade sobre la fuente la **petición de datos
  al usuario como paso de investigación** (fase 1.6): si la evidencia vive en un sistema que
  solo el usuario conoce (un MCP suyo, un servicio externo, el dominio del negocio), pedir el
  dato real es investigar; suponerlo es adivinar. Cableada en los pasos 2 y 3 del ciclo TDD de
  `/implement` (ante un fallo inesperado o una regresión) y en el modo CORRECCIÓN. Cubre el
  mayor hueco de contenido que tenía el plugin: hasta ahora la corrección saltaba directa a
  «test que reproduce → arregla» sin exigir entender la causa.
- **Guía nueva `recepcion-de-revision`** (fuente: `obra/superpowers`, `receiving-code-review` +
  el bucle de corrección de `subagent-driven-development`): el lado **receptor** de la revisión,
  que faltaba frente al emisor (`/review`). Prohíbe el acuerdo performativo («tienes toda la
  razón», cualquier agradecimiento), exige **verificar cada hallazgo contra el código antes de
  aplicarlo** y **aclarar todo lo dudoso antes de corregir nada** (entender a medias produce la
  corrección equivocada), añade el filtro YAGNI sobre la sugerencia del revisor —si nada lo
  llama, la respuesta es eliminarlo, no construirlo bien— y cierra el bucle con **tope de 3
  rondas**, re-verificación acotada al cambio hecho y **adjudicación por escrito**: ningún
  hallazgo desaparece en silencio. Cableada en el modo CORRECCIÓN de `/implement`.
- **Guía nueva `qa-exploratoria`** (fuentes: `NousResearch/hermes-agent` `dogfood` y
  `openclaw/auto-qa`): cubre lo que solo aparece **ejecutando el producto**, frente a
  `historias-usuario` (diseña casos desde el criterio) y `niveles-y-tipos-de-prueba` (decide
  dónde automatizarlos), que cubren lo anticipado. Cinco fases —planificar el recorrido,
  explorar, recoger evidencia, clasificar, informar—, con la consola revisada tras **cada**
  navegación e interacción (los errores silenciosos de JavaScript son los hallazgos de más valor
  y los únicos que no se ven mirando), evidencia en el momento con pasos de reproducción («un
  hallazgo sin pasos no es un hallazgo, es una impresión»), deduplicación **por invariante roto,
  no por síntoma**, estados que nadie mira (vacío, error, sin permisos) y declaración explícita
  de **lo no probado**. Severidad mapeada a la escala que ya existe en `revision-hallazgos`, sin
  introducir una paralela. Cableada en `/implement` antes de abrir la PR y en la dimensión 6 de
  `/review`, que hasta ahora declaraba lo estético «evaluación manual» sin decir cómo se hace.
  Degrada a pasada manual si no hay automatización de navegador.
- **Guía nueva `espacio-de-trabajo-aislado`** (fuente: `obra/superpowers` `using-git-worktrees` +
  `Significant-Gravitas/AutoGPT`): worktrees de git como **opción** en `/start`, degradando
  siempre a rama normal. Detección previa del aislamiento **con guarda de submódulo**
  (`GIT_DIR != GIT_COMMON` también es cierto dentro de un submódulo: sin esa guarda, la lógica
  se equivoca), preferencia por la herramienta nativa del entorno sobre `git worktree add` (que
  deja estado que el harness no sabe limpiar), **verificación de que el directorio está ignorado
  antes de crearlo** (si no, se commitea el árbol entero del segundo checkout), aprovisionamiento
  del espacio (config no versionada —`.env`, `.mcp.json`—, dependencias, puertos que chocan con
  el checkout principal), línea base de tests en verde y limpieza solo de lo creado por uno
  mismo.
- **Sección «Tests honestos»** en `niveles-y-tipos-de-prueba` (fuente: `writing-good-tests`;
  §2.C): «cada test nombra la rotura que atrapa» y «cada test ejercita lo real» — aserciones
  espejo, detectores de cambios, probar la frontera propia y no el framework, mockear al nivel
  correcto, mocks parciales que fallan en silencio, y la **comprobación de mutación** antes de
  cerrar. Cableada en la dimensión de tests de `revisor-spec-tests`.
- **Deduplicación por causa, no por síntoma** en `revision-hallazgos` (fuente:
  `openclaw/auto-qa`; §13): deduplicábamos por `fichero:línea`, así que un mismo defecto que
  aflora en cuatro sitios contaba como cuatro hallazgos. Ahora se agrupan bajo la causa común
  enumerando dónde se manifiesta — contar síntomas provoca que se parchee cada aparición y la
  causa siga viva.
- **Tres reglas de independencia del revisor** en `revision-hallazgos` (fuente: SDD; §2.B):
  (1) lo que cuentan `progress.md` y las justificaciones de diseño son **afirmaciones, no
  hechos** — una justificación nunca baja por sí sola la severidad; (2) etiqueta
  **`exigido-por-spec`** para hallazgos que la propia spec manda (se reportan y **decide el
  usuario**: la autoría de la spec no califica su propio trabajo); (3) veredicto **⚠️ «no
  verificable desde el diff»** para requisitos que viven en código no tocado — el revisor lo
  declara en vez de rastrear el repo, y `/review` los resuelve todos en la Fase 4.1.
- **Gate de verificación con evidencia** en `/implement` (fuente:
  `verification-before-completion`; §2.C): paso 0 de la Fase 4 — ejecutar la suite, lint y
  type-check **ahora** (no vale una ejecución anterior de la sesión) y repasar `spec.md`
  criterio a criterio antes de afirmar que la tarea está lista.
- **2-3 enfoques con recomendación** y **auto-revisión de la spec** en `/plan` (fuente:
  `brainstorming`; §2.C), y bloque **«Restricciones globales»** en `spec.md` (fuente:
  `writing-plans`): las condiciones con valor exacto que vinculan a todos los criterios, juntas
  y explícitas, porque `/implement` trabaja criterio a criterio y una restricción escondida en
  la prosa de uno no alcanza a los demás.
- **Disciplina de entrevista en la Fase 4 de `/plan`** (fuente: familia `grill` de
  mattpocock/skills; §9.A): una pregunta cada vez —un bloque de preguntas desconcierta y cada
  respuesta cambia cuáles son las siguientes—, **cada pregunta con la respuesta recomendada**
  (el usuario reacciona a una propuesta, no a un hueco en blanco), en **orden de dependencia**,
  y sobre todo la regla **hechos-vs-decisiones**: los hechos que se pueden averiguar explorando
  el repo (framework, versión, runner existente, nombre de un campo) **los busca el agente**;
  solo se preguntan las decisiones, que son del usuario.
- **Sección «Cascadas de simplificación» en `codigo-limpio`** (fuente:
  `obra/superpowers-skills`; §10): el refactor de 10x que se le escapa al recorrido olor a olor
  — buscar el principio unificador que hace innecesarios varios componentes a la vez, medido en
  **cuánto código puedes borrar**. Con su límite explícito, que es lo que la hace compatible con
  el filtro anti-sobre-ingeniería: es legítima porque la duplicación **ya existe** y la
  abstracción la **elimina**; si no borra código es _Generalidad especulativa_ y manda
  `patrones-diseno`.
- **Tensiones abiertas en «Decisiones tomadas» de `/plan`** (fuente:
  `preserving-productive-tensions`; §10): cuando ambas opciones son válidas y la mejor depende
  del contexto de despliegue, la disyuntiva se **registra como tensión abierta** en vez de
  forzar un ganador para dejar la sección limpia. Se fuerza solo si es una puerta de un solo
  sentido o si mantener ambas cuesta más que elegir.
- **CI nuevo `manifest-check.yml`** (fuente: mattpocock/skills; §9.B): ejecuta
  `claude plugin validate --strict` sobre el plugin y sobre el marketplace en cada push y PR.
  Teníamos tres capas de CI (drift, versión, comportamiento) y ninguna comprobaba que el
  artefacto publicado fuese **cargable**. `check-behavior.mjs` asevera además que la
  `description` va entrecomillada. Añadida también la `description` del marketplace, que
  `--strict` reclamaba.

### Cambiado

- **Gate de verificación de `/implement` (Fase 4) ampliado con lo que la suite no cubre**:
  build de producción si el repo lo tiene (hay errores que solo aparecen al compilar para
  producción), deriva entre las variables de entorno nuevas y el fichero de ejemplo del repo
  (una variable que solo existe en tu máquina es un despliegue roto para el resto) y migraciones
  aplicadas **y probadas en reverso**.

- **Disciplina de commit en `/implement` (Fase 3, paso 6)**: si los cambios abarcan módulos
  distintos que se entienden por separado, se propone dividirlos —un commit que mezcla tres
  asuntos no se puede revertir ni leer después—; y si el cambio rompe algo que otros consumen
  (contrato de API, firma pública, formato de dato), se dice explícitamente en el pie del
  mensaje, no solo en el cuerpo.

- **OWASP A09 leído del revés en `revisor-bugs-seguridad`**: de una advertencia («con cuidado de
  no loguear secretos ni PII») a un **hallazgo propio** — registrar contraseñas, tokens,
  cabeceras de autorización, cuerpos completos de petición/respuesta o datos personales es un
  defecto en sí mismo, porque un log es otro almacén, casi siempre con menos control de acceso y
  más retención que la propia base de datos.

- **Las `description` de las guías reescritas como disparador puro** (fuente:
  `writing-skills`; §2.A). Hallazgo medido de superpowers: si la `description` **resume el
  contenido**, el agente sigue el resumen y **no llega a abrir la guía**. Las nuestras lo hacían
  de forma sistemática (hasta 925 caracteres enumerando catálogos enteros; `arquitectura` al
  94 % del techo de 1024 del frontmatter). Ahora abren con «Úsala cuando/al/en…» y nombran
  **síntomas buscables**, sin resumir el contenido: 203–360 caracteres. (Las guías nuevas de esta tanda viajan en sus propias ramas y ya nacen con ese formato.)
- **`revisor-convenciones` pasa de haiku a sonnet** (fuente: SDD, «el número de turnos pesa más
  que el precio por token»; §2.B): deducir el patrón vigente exige leer ficheros vecinos —es
  trabajo multi-turno, no transcripción— y el tier más barato gasta más turnos de los que
  ahorra. `/review` incorpora además la regla de **indicar siempre el modelo al despachar** (si
  se omite, se hereda el de la sesión y el tiering se anula en silencio) y la prohibición de
  **pre-juzgar por el revisor** (nada de «no marques X» en el prompt de despacho; la rúbrica
  general vive en `revision-hallazgos` y la aplica el propio revisor).
- **`check-behavior.mjs` asevera ahora la forma de las `description`**, no solo su presencia:
  ≤ 500 caracteres, redactadas como disparador («Úsala») y frontmatter dentro del techo de
  1024. Es lo que impide que la regla se degrade con el tiempo. 129 aserciones (antes 92).

## [0.6.0] - 2026-07-30

### Añadido

- **Guía nueva `calidad-producto`** (fuente: ISO/IEC 25010:2023, familia SQuaRE; ver §8 de
  `docs/referencias.md`): skill auto-activable en ambos adaptadores con el modelo de calidad de
  producto como **taxonomía compartida** — las 9 características con subcaracterísticas, el
  mapeo a las dimensiones de `/review` y la disciplina anti-inventario (una característica se
  marca solo ante una fuerza real, con criterio verificable). Cableada en `/plan` (nueva
  sección «Requisitos no funcionales» del enfoque técnico) y en el informe de `/review` (cada
  hallazgo se etiqueta con su característica ISO 25010). Registrada en `sync.mjs` y aseverada
  en `check-behavior.mjs`.
- **Guía nueva `usabilidad-accesibilidad` + dimensión 6 de `/review`** (fuente: 10 heurísticas
  de Nielsen, WCAG 2.2 y lista de chequeo de usabilidad de laboratorio de pruebas UCI,
  destiladas; §8 de `docs/referencias.md`): cubre la característica «capacidad de interacción»
  de ISO 25010 con la frontera dura **verificable en código vs evaluación manual** (títulos/
  estados, lenguaje del usuario, validación cliente+servidor, mensajes de error útiles,
  alt/labels/semántica/teclado/foco; lo estético se nombra, no se intenta). Nuevo subagente
  read-only `revisor-usabilidad-accesibilidad` (sonnet) con **gate de aplicabilidad**: se
  despacha solo si el diff toca UI. Cableada además en los CA de UI de `/plan` y en el paso 1
  del TDD de `/implement`.
- **Checks de gestión de sesión y autenticación en `revisor-bugs-seguridad`** (fuente: lista de
  chequeo de seguridad UCI destilada y modernizada a criterio OWASP/NIST actual; §8 de
  `docs/referencias.md`): A07 amplía con mensajes de login que revelan cuál credencial falló,
  sesión no invalidada en el servidor tras logout (botón «Atrás»/URL copiada), ID de sesión sin
  rotar/predecible/en URL, expiración por inactividad y política de contraseñas (mínimo ≥ 8,
  lockout/rate limit, historial); A01 añade operaciones peligrosas sobre la propia cuenta
  (admin que se auto-elimina, degradar al último admin) y propagación inmediata de cambios de
  rol; A05 añade errores que filtran internals (consulta a BD, versiones).

### Cambiado

- **Core agnóstico de stack** (primer paso de la visión «perfiles de stack», §7 de
  `docs/referencias.md`): los defaults duros de Next.js en `core/` se sustituyen por la
  instrucción de **detectar el stack del repo** (manifiesto, framework, paradigma de render) y
  adaptar los checks, conservando los casos concretos como ejemplos ilustrativos multi-stack
  (p. ej. `NEXT_PUBLIC_`/`VITE_`, `dangerouslySetInnerHTML`/`v-html`). Afecta a `plan`,
  `review`, `implement`, `explorador-repo`, `revisor-bugs-seguridad`,
  `niveles-y-tipos-de-prueba` (tabla de herramientas «según el stack»), las descripciones de
  `sync.mjs`, el workflow reusable de CI y `plugin.json`.
- **`/review` pasa de 5 a 6 dimensiones** (usabilidad/accesibilidad) y el informe etiqueta cada
  hallazgo con su característica ISO 25010 además de la severidad.

## [0.5.0] - 2026-07-24

### Añadido

- **Guía nueva `arquitectura`** (fuente: Martin Fowler, Richards & Ford —*Fundamentals of Software
  Architecture* y *The Hard Parts*— y DDD de Vlad Khononov; ver §7 de `docs/referencias.md`): skill
  auto-activable en ambos adaptadores, un piso por encima de `patrones-diseno`, para decidir y
  respetar la arquitectura a nivel de módulo/sistema. **Crítica-first**: la arquitectura responde a
  fuerzas reales, no al prestigio. Catálogo de estilos (monolito en capas, monolito modular,
  hexagonal, event-driven, service-based, microservicios) con la fuerza que justifica cada uno y su
  coste; DDD transversal (táctico solo en el *core*); criterios de decisión; y el default conservador
  (monolito modular + hexagonal solo donde haya un adaptador real + DDD táctico solo en el *core*),
  con migración StranglerFig cuando una fuerza aparezca. Dos **modos** —recomendar (pregunta las
  fuerzas y propone el estilo más simple que sirva) o elegir (presenta el catálogo y valida la
  elección del usuario)— y dos **situaciones** —conformar la arquitectura de un repo existente vs
  elegir el estilo de arranque de uno nuevo—. Cableada en el «Enfoque técnico» de `/plan` y en la
  dimensión 4 de `/review` (`revisor-convenciones`), con una bandera roja nueva en `/plan` («de paso
  reorganizo la arquitectura del repo»). Registrada en `sync.mjs` y aseverada en `check-behavior.mjs`.

## [0.4.0] - 2026-07-24

### Añadido

- **Técnicas de diseño de casos de prueba en `historias-usuario`** (fuente: ISTQB Foundation
  Level + ISO/IEC/IEEE 29119-4, ver §6 de `docs/referencias.md`): nueva sección que formaliza la
  matriz V/I/N/A ya existente como lo que es —partición de equivalencia y tabla de decisión— y
  añade **valores límite (BVA)**, **transición de estados** y **pruebas por pares**, con una tabla
  técnica→cuándo→cobertura mínima y una regla práctica. Fija el límite de alcance: la cobertura de
  caja blanca es del runner en `/implement`, no del diseño de la spec. Tres anti-patrones nuevos
  (límites sin probar, combinaciones a fuerza bruta, no nombrar la técnica) y una pregunta de
  autocrítica.
- **Guía nueva `niveles-y-tipos-de-prueba`** (fuente: ISTQB, Jest + Testing Library, Playwright):
  skill auto-activable en ambos adaptadores con la **pirámide de pruebas** (unidad / componente /
  integración / E2E / aceptación → qué verifica, cuándo elegirla y herramienta por defecto en
  Next.js) y un checklist de **tipos no-funcionales a nombrar, no integrar** (rendimiento→JMeter/k6,
  seguridad→OWASP, API→Postman/Newman, accesibilidad, regresión). Cableada en `/plan` (estrategia de
  tests) e `/implement` (elección de nivel/runner en el paso 1 del TDD). Registrada en `sync.mjs` y
  aseverada en `check-behavior.mjs`.
- **Checklist OWASP Top 10 (2021) adaptado a Next.js en la dimensión de seguridad** (fuente: OWASP
  Juice Shop, §6 de `docs/referencias.md`): `revisor-bugs-seguridad` y la dimensión 5 de `/review`
  recorren A01–A10 con casos propios de Next.js (control de acceso en route handlers/server actions,
  IDOR, exposición `NEXT_PUBLIC_`/Server→Client, inyección/XSS/SSRF, mala configuración, dependencias
  vulnerables) en lugar de una lista suelta de ejemplos.

### Cambiado

- **Paso 1 del ciclo TDD de `/implement`: «comportamiento, no implementación»** (fuente: Testing
  Library): el test se escribe contra el comportamiento observable, no contra detalles internos
  (estado, métodos privados, estructura del DOM), citando el principio de Testing Library y
  ligándolo a que el test sobreviva al refactor del paso 4. Bandera roja nueva.
- **`docs/referencias.md`**: nueva §6 «Bibliografía de testing» (ISTQB, ISO 29119, Playwright,
  Selenium, Jest/Testing Library, JMeter, Postman, OWASP Juice Shop, Ministry of Testing, Test
  Automation University) con tabla por fuente y estados; leyenda ampliada con `📖 referencia`;
  registro de lo adoptado y backlog actualizados (queda 🔜 el testing basado en riesgo de 29119-2 en
  la sección «Riesgos» de `/plan`).

## [0.3.0] - 2026-07-24

### Añadido

- **Guías `codigo-limpio` y `patrones-diseno`** (fuente: refactoring.guru, ver §5 de
  `docs/referencias.md`): dos guías nuevas en `core/guides/` (skills auto-activables en ambos
  adaptadores). `codigo-limpio` define los cinco rasgos del código limpio, la deuda técnica, la
  disciplina de refactorización segura (pasos pequeños, tests verdes antes y después, sin mezclar
  con funcionalidad nueva) y un catálogo condensado de los 21 olores de código con la
  refactorización que cura cada uno. `patrones-diseno` es una referencia **crítica-first** de los
  23 patrones GoF: mapa olor→patrón, la crítica al uso de patrones (síndrome del martillo) y
  Singleton documentado como anti-patrón — un patrón se justifica solo cuando su problema ya
  existe, reforzando el anti-objetivo «sobre-ingeniería».
- **Paso de refactor en el ciclo TDD de `/implement`** (red-green-**refactor**): la Fase 3 gana un
  paso 4 «Refactor (con la suite en verde)» que mejora el diseño del código recién escrito sin
  cambiar su comportamiento, guiado por `{{guide:codigo-limpio}}`, antes de registrar el criterio.
  Dos banderas rojas nuevas: «funciona, ya está» (saltarse el refactor) y «meto una abstracción
  por si acaso» (sobre-ingeniería). El modo corrección también incorpora el paso.

### Cambiado

- **Dimensión 4 de `/review` pasa a «Convenciones y deuda técnica»**: además de la coherencia con
  los patrones del repo, `/review` y el subagente `revisor-convenciones` detectan **olores de
  código** que el diff introduzca o empeore (según `{{guide:codigo-limpio}}`) y los reportan como
  deuda técnica, respetando la disciplina de `revision-hallazgos` (umbral ≥ 75, nada preexistente,
  ni nitpicks, ni trabajo del linter).
- **Enfoque técnico de `/plan` referencia `patrones-diseno`**: al proponer una abstracción o
  patrón, se justifica solo ante el problema real (un olor ya presente), no de forma especulativa
  — coherente con «empezar pequeño». Bandera roja nueva en `/plan`.
- **`scripts/check-behavior.mjs`**: la lista de guías con contrato de auto-activación aseverado en
  CI incluye ahora `codigo-limpio` y `patrones-diseno`, y se corrige de paso un olvido de la
  v0.2.0 añadiendo `historias-usuario` (que había quedado fuera del check). El checklist manual
  `docs/eval-comportamiento.md` gana dos casos para las guías nuevas (refactor tras test en verde
  y freno a los patrones especulativos).

## [0.2.0] - 2026-07-20

### Añadido

- **Guía `historias-usuario` cableada en `/plan`**: nueva guía en `core/guides/historias-usuario.md`
  (skill auto-activable en ambos adaptadores) que define cómo redactar cada requisito como Historia
  de Usuario en `spec.md`: historia (rol + valor), contexto de proceso de negocio, comportamientos
  válidos/no válidos, criterios de aceptación en formato Given/When/Then y su diseño de casos de
  prueba derivado, con tabla de trazabilidad Proceso→RF→HU→CA→EC y molde CRUD reutilizable. La Fase 4
  de `/plan` la referencia vía `{{guide:historias-usuario}}`, así los criterios de aceptación nacen
  verificables y con su escenario de prueba (EC). Mantiene una sola fuente de verdad del
  comportamiento y deja los datos de gestión (programador, iteración, tiempos, riesgo) en ClickUp.

- **Recomendación del add-on `frontend-design`** (backlog #7): para tareas de UI en Next.js, el
  README y el workflow `/implement` recomiendan la skill oficial de Anthropic `frontend-design`
  como add-on **opcional**. NO se redistribuye — es software propietario de Anthropic
  (© Anthropic PBC, todos los derechos reservados), así que se compone por **recomendación**: el
  usuario la instala aparte y `/implement` la aprovecha para diseñar UI si está instalada,
  degradando sin problema si no.

### Cambiado

- **`bump-version`/`check-version` cubren también `examples/repo-settings.json`**: el `ref` (tag
  pineado que copian los repos consumidores) se sube y se verifica junto a `plugin.json`,
  `marketplace.json` y el CHANGELOG, para que no quede desfasado tras publicar. README
  actualizado: árbol de arquitectura con `agents/`, los scripts y los CI; el pin del ejemplo
  apunta al último tag publicado.

## [0.1.2] - 2026-06-19

### Añadido

- **Eval de comportamiento híbrido** (backlog #6, patrón de `superpowers` §2): verifica que los
  prompts producen el comportamiento esperado del agente, no solo que los ficheros son
  correctos. Dos mitades: (a) **determinista** — `scripts/check-behavior.mjs` asevera los
  contratos estructurales (read-only de `/review`, `tools`/modelo de cada agente,
  auto-activación de guías, banderas rojas presentes) sobre los artefactos shipped, como test
  INDEPENDIENTE de `sync.mjs`; corre en el nuevo CI `behavior-check.yml`. (b) **manual** —
  `docs/eval-comportamiento.md`, una checklist de prompts → comportamiento esperado
  (auto-activación, routing por estado, respeto de gates, tiering, degradación) para ejecutar
  antes de publicar.

## [0.1.1] - 2026-06-19

### Añadido

- **Hook `SessionStart` de continuidad entre sesiones** (`adapters/claude/hooks/session-context.js`,
  exclusivo de Claude Code): al iniciar/limpiar/compactar una sesión sobre una rama de tarea
  (`<tipo>/<taskId>_<slug>`), inyecta automáticamente el "Estado actual" de `progress.md` y
  los criterios de aceptación pendientes de `spec.md`. Degradación silenciosa total (no es
  repo git, git ausente, rama sin patrón de tarea, ficheros inexistentes) — un hook nunca
  rompe la sesión. Resuelve la rama vía `git symbolic-ref` para soportar ramas sin commits.
- **Bootstrap de auto-conducción en el hook SessionStart**: además del estado, el hook
  inyecta un "Próximo paso" derivado del estado de `spec.md` (placeholders → `/plan`;
  criterios pendientes → `/implement`; todos marcados → `/review`) y un recordatorio de
  gates. Fuera de una rama de tarea, si el repo ya usa el flujo (existe `tasks/`), añade un
  recordatorio mínimo de una línea; sin `tasks/` no inyecta nada (cero ruido). Tono suave:
  sugiere, no impone, coherente con los gates humanos del plugin.
- **Tablas de "Banderas rojas" en los 4 workflows** (`core/workflows/*.md`): catálogo de
  racionalizaciones prohibidas por comando (p. ej. en `/implement`: "es trivial, no hace
  falta test"; en `/review`: "corrijo este bug de paso") para que el agente no se
  autoconvenza de saltarse un gate. Se propagan a ambos adaptadores vía `sync.mjs`.
- **CI de sincronización core↔adaptadores** (`.github/workflows/sync-check.yml`): en cada
  push/PR que toque `core/`, `scripts/sync.mjs` o `adapters/`, regenera con `sync.mjs` y
  falla si los adaptadores divergen (drift por edición manual de un generado o por cambiar
  `core/` sin regenerar). Blinda la regla de mantenimiento "editar solo en `core/`".
- **`.mcp.json` empaquetado en el plugin** (`adapters/claude/.mcp.json`, generado por
  `sync.mjs`): Claude Code auto-registra el MCP de ClickUp al instalar el plugin, leyendo
  `CLICKUP_API_KEY`/`CLICKUP_TEAM_ID` de variables de entorno. Elimina el paso manual de
  copiar un fichero con credenciales por repo consumidor. `MCP_SERVERS` queda como fuente
  única en `sync.mjs`. La plantilla `examples/mcp.json.example` se mantiene como alternativa
  para credenciales por proyecto.
- **`/review` endurecido con técnicas del plugin oficial `code-review`** (referencia §3 de
  `docs/referencias.md`): `allowed-tools` read-only en el frontmatter de Claude (`Bash` acotado
  a git de lectura y consultas de grafo) que pre-autoriza solo herramientas de lectura
  (privilegio mínimo); auto-refutación de cada hallazgo antes de reportarlo; scoring de
  confianza 0-100 con umbral ≥ 75; y lista explícita de "qué NO reportar" (falsos positivos).
  `allowedTools` se declara por comando en `sync.mjs` y solo el adaptador Claude lo emite.
- **Tiering de modelos en `/review` vía 3 agentes de plugin read-only** (referencia §3 de
  `docs/referencias.md`; backlog #2): `/review` despacha en paralelo, en lugar de analizar
  las cinco dimensiones en el agente principal, tres subagentes especializados con el modelo
  adecuado a su coste/complejidad — `revisor-bugs-seguridad` (opus: bugs + seguridad),
  `revisor-spec-tests` (sonnet: cumplimiento de spec + tests) y `revisor-convenciones`
  (haiku: convenciones). Cada agente declara `tools: Read, Grep, Glob`, una **allowlist
  DURA**: es el bloqueo de solo-lectura real (no pueden modificar nada ni despachar más
  agentes). La validación adversarial pasa así a subagentes independientes por dimensión. La
  disciplina de validación (auto-refutación + confianza + no-flag + severidad) se extrae a la
  guía `revision-hallazgos` como fuente única, referenciada por `/review` y por los agentes.
  Los agentes son exclusivos del adaptador Claude (los genera `sync.mjs`); en OpenCode
  `/review` degrada al análisis en línea de las cinco dimensiones.
- **Corrección sobre `allowed-tools`**: se rectifica la afirmación de que `allowed-tools` de
  un slash command "hace cumplir el solo-lectura a nivel de herramienta". En realidad es
  **pre-aprobación de permisos** (no un sandbox): refuerza el contrato junto con la prosa y
  las banderas rojas, pero el bloqueo DURO de solo-lectura lo dan los agentes revisores (su
  campo `tools`). Prosa de `core/workflows/review.md` y de `docs/referencias.md` actualizada.
- **Validación adversarial independiente en `/review`** (`core/agents/verificador-hallazgos.md`,
  opus, read-only): tras sintetizar los hallazgos de los agentes por dimensión, `/review`
  despacha un verificador independiente que intenta REFUTAR cada hallazgo con contexto fresco
  (¿preexistente?, ¿correcto en su contexto?, ¿ya cubierto por un test?, contradicciones
  cruzadas) y devuelve un veredicto por hallazgo; el orquestador solo reporta los `confirmado`.
  Completa el patrón de validación adversarial del plugin oficial `code-review` (Fase 4.2).
  Degrada a una segunda pasada escéptica en línea en OpenCode.
- **Tiering en la exploración de `/plan`** (`core/agents/explorador-repo.md`, sonnet,
  read-only): `/plan` conserva graphify como acelerador (lo ejecuta el orquestador) y delega la
  reconnaissance estructural del repo a un explorador que devuelve un mapa en TOON (estructura
  Next.js, convenciones, ficheros candidatos, riesgos), liberando al planificador para razonar
  el enfoque y dialogarlo con el usuario. Degrada a exploración en línea en OpenCode.
- **Scripts de versión** (`scripts/bump-version.mjs`, `scripts/check-version.mjs`):
  `bump-version <patch|minor|major|X.Y.Z>` sube la versión de forma SINCRONIZADA en los tres
  sitios donde vive (`plugin.json`, la entrada de `marketplace.json` y el CHANGELOG, que mueve
  "[No publicado]" a la versión con fecha y abre uno nuevo vacío). `check-version` es el
  "doctor" que falla si esas tres versiones divergen. Nuevo CI `version-check.yml` ejecuta el
  doctor en cada push/PR que toque la versión.

### Cambiado

- **Guías reescritas con la plantilla de skill** (`core/guides/*.md`, patrón de
  `frontend-design`): cada guía gana un **rol** explícito, **anti-patrones nombrados** (que
  generalizan las banderas rojas), un **proceso** claro y, en las procedurales, una
  **autocrítica** de cierre. Se aplica al nivel que encaja con cada guía sin inflar el texto:
  las tres procedurales (`registro-progreso`, `grafo-conocimiento`, `revision-hallazgos`) con
  la plantilla completa; las dos de referencia (`estados-tareas`, `formato-toon`) con el
  espíritu (rol + anti-patrones), sin forzar una persona sobre una tabla de consulta.
- **Auto-activación de las guías (skills) documentada y afinada**: se aclara que
  `user-invocable: false` solo oculta la skill del menú `/` y **no** bloquea la auto-activación
  del modelo (eso sería `disable-model-invocation: true`, que no usamos). Las guías ya se
  auto-activan por su `description`; se afinaron las descripciones de `grafo-conocimiento` y
  `registro-progreso` (antes "command-scoped") para que disparen de forma ambiental, y se
  documentó la intención en `sync.mjs`. `revision-hallazgos` se mantiene acotada a `/review` a
  propósito (subrutina interna). No se cambió ningún flag: el estado deseado ya existía.
- **Manifiestos completados**: `plugin.json` y `marketplace.json` con autor, email, homepage
  y repositorio reales (`leiniercy/custom-ia-plugin`). La entrada del plugin en
  `marketplace.json` declara ahora `"version": "0.1.0"`, coherente con el pin por tag.
- **Contrato de `/review` ahora 100 % solo-lectura**: se elimina la antigua excepción por la
  que `/review` podía escribir hallazgos en `progress.md`. La persistencia de hallazgos pasa
  a `/implement`: al entrar en modo corrección desde un informe de `/review` presente en la
  conversación, registra los hallazgos en `progress.md` antes de trabajarlos, garantizando la
  recuperación en sesiones limpias futuras.

## [0.1.0] - 2026-06-12

### Añadido

- **Arquitectura core + adaptadores (multi-agente)**:
  - `core/` como **única fuente de verdad**: 4 workflows (`start`, `plan`, `implement`,
    `review`) y 4 guías (`estados-tareas`, `registro-progreso`, `grafo-conocimiento`,
    `formato-toon`) agnósticos de herramienta, con tokens `{{guide:nombre}}` para las
    referencias cruzadas.
  - `scripts/sync.mjs`: generador que produce ambos adaptadores desde `core/`
    (sustituye tokens por la ruta propia de cada herramienta y antepone su frontmatter).
    Los ficheros generados no se editan a mano.
  - **Adaptador Claude Code** (`adapters/claude/`): plugin nativo con manifiesto
    (`plugin.json`), comandos con `description`/`argument-hint`, skills con
    `user-invocable: false`, y hook `Stop` de notificación sonora multiplataforma
    (`hooks/notify.js`, win32/darwin/linux con degradación silenciosa) — el hook es
    exclusivo de este adaptador.
  - **Adaptador OpenCode** (`adapters/opencode/.opencode/`): comandos en
    `.opencode/command/*.md` (frontmatter `description`, hint de uso embebido) y guías
    en `.opencode/guides/*.md`, listo para copiar al repo consumidor. Formato basado en
    conocimiento de enero 2026 — verificar contra https://opencode.ai/docs.
- **Marketplace `biomas`** (`.claude-plugin/marketplace.json`) con el plugin referenciado
  por ruta relativa (`./adapters/claude`) para que herede el tag de descarga.
- **Flujo de 4 comandos** con: fases numeradas, `$ARGUMENTS` con fallback por inferencia
  de rama, pre-flight checks, gates de aprobación humana para acciones visibles o
  irreversibles, detección de modo por contexto y cierre orientativo.
- **Integración graphify** (grafo de conocimiento del repo): detección de la CLI,
  construcción/actualización con gate de aprobación, patrones de consulta
  (`query`/`explain`/`path`), aristas INFERRED/AMBIGUOUS tratadas como hipótesis a
  verificar, fallback a exploración manual.
- **Convención TOON** para salidas con listas largas y uniformes (resultados del grafo,
  esquemas de BD, tablas de hallazgos), con sintaxis canónica y límites de uso.
- **CI agnóstica**: workflow reusable `.github/workflows/review.yml` (revisor
  independiente con lectura de `tasks/<taskId>/spec.md`, severidades y veredicto; solo
  comenta) + caller de ejemplo `examples/pr-review.yml` con `permissions` declarados.
- **Plantillas para repos consumidores** (`examples/`): `repo-settings.json` (pin por tag,
  `autoUpdate: false`), `mcp.json.example` (ClickUp para Claude Code),
  `opencode.json.example` (ClickUp para OpenCode) y `AGENTS.md.example` (contexto del
  flujo para OpenCode y otros agentes compatibles con AGENTS.md).
- README con arquitectura, instalación por herramienta, CI, publicación y troubleshooting.

### Decisiones de diseño

- **Core como fuente única**: los workflows se escriben una sola vez; cada adaptador es
  un artefacto generado. Se descartó mantener copias paralelas por herramienta para
  evitar drift entre Claude Code y OpenCode.
- **Soporte limitado a Claude Code y OpenCode**: el formato de OpenCode se construyó con
  conocimiento local (sin verificación web); otros agentes podrán añadirse como nuevos
  adaptadores en `scripts/sync.mjs`.
- **Hook sonoro solo en Claude Code**: OpenCode usa un sistema de plugins JS distinto;
  se pospone su equivalente hasta verificar la API real.
- **ClickUp como gestor de tareas** vía MCP, con estados estándar (`to do / in progress /
  review / complete`). Todos los comandos degradan a modo manual si el MCP no está
  configurado.
- **Responsabilidad única sobre transiciones**: `/start` mueve a `in progress`,
  `/implement` mueve a `review` al crear la PR, el cierre a `complete` es siempre humano.
  Se descartó que `/review` cerrara tareas para mantener al humano en el gate final.
- **`/review` es solo-lectura** con una única excepción documentada: registrar hallazgos
  en `progress.md` bajo petición explícita, para habilitar el modo corrección de
  `/implement` en sesiones limpias. Coherente con ello, `/review` consulta el grafo de
  graphify solo si ya existe — nunca lo construye ni actualiza.
- **graphify como acelerador, no como requisito**: `/plan` y `/review` lo usan si está
  disponible y degradan a exploración manual si no. El grafo orienta dónde mirar; las
  decisiones de diseño se confirman siempre en el código fuente.
- **TOON solo como formato de presentación**: prohibido en ficheros parseables
  (manifiestos JSON, configs de CI) y no altera el contrato Markdown de
  `spec.md`/`progress.md`.
- **Sin agente "experto en el repo"**: el conocimiento vive en el código y en `docs/` del
  repo consumidor, evitando el drift de un experto desactualizado.
- **Solo 4 comandos**: se descartaron `/debug` y un `/validate-pr` local; la validación de
  PRs vive en CI (workflow reusable), siguiendo la pauta de empezar pequeño.
- **Fuera de alcance en 0.1.0**: worktrees con script de copia de ficheros no versionados
  y soporte de IDs personalizados de ClickUp.
