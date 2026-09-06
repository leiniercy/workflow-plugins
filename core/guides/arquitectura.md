# Arquitectura: elegir y respetar la forma del sistema

Un piso por encima de {{guide:patrones-diseno}} (que trabaja a nivel de clase/objeto), esta guía
decide y respeta la **arquitectura**: cómo se reparten módulos, capas y fronteras del sistema. Se
usa en el «Enfoque técnico» de `/plan` (elegir o conformar) y en `/review` (respetar la arquitectura
vigente). Basada en Martin Fowler, Richards & Ford (*Fundamentals of Software Architecture* y *The
Hard Parts*) y DDD (Khononov, *Learning DDD*). Ver §7 de `docs/referencias.md`.

Regla de oro (crítica-first): la arquitectura es una **respuesta a fuerzas reales** (necesidades),
nunca una elección por prestigio ni «por si escala». Empieza por lo más simple que sirva y sube de
estilo **solo cuando una fuerza concreta lo obligue**. «Debes ser así de alto para usar
microservicios» (Fowler): lo distribuido es un *premium* que pagas solo forzado.

## Dos situaciones (no las confundas)

1. **Repo existente (lo normal).** NO re-elijas arquitectura. Tu trabajo es **conformar**: entiende
   la arquitectura vigente (capas, módulos, fronteras) y haz que el cambio la respete. Si el cambio
   la contradice, decláralo como riesgo/decisión en `spec.md`; no la reinventes por tu cuenta.
2. **Repo desde 0 o petición explícita de recomendación.** Elige un **estilo de arranque** con el
   default conservador. Esto NO es diseñar el sistema entero (features, capacidad, topología
   distribuida): es elegir la **forma del código**.

## Dos modos según quién decide

- **Modo recomendar** — el usuario pide guía o no tiene criterio arquitectónico. Antes de recomendar,
  pregunta lo mínimo sobre las **fuerzas** (ver "Criterios de decisión"). Mapea necesidad→estilo
  **sesgando siempre a lo simple**, propón UNO con su porqué y di explícitamente qué NO eliges y por
  qué. El usuario aprueba (gate).
- **Modo elegir** — el usuario tiene criterio técnico. Presenta el catálogo de estilos + criterios +
  trade-offs y deja que elija. Valida su elección contra las fuerzas: si huele a sobre-ingeniería
  (p. ej. microservicios sin fuerzas que los justifiquen), dilo **una vez** y respeta su decisión.

En ambos modos, registra la decisión y las alternativas descartadas —con su porqué— en «Decisiones
tomadas» de `spec.md`, para que quede trazable.

## Catálogo de estilos (qué fuerza lo justifica → coste / cuándo NO)

| Estilo | Fuerza que lo justifica | Coste / cuándo NO |
|---|---|---|
| **Monolito en capas** (layered) | Default: un desplegable, dominio pequeño-medio, un equipo | Sin módulos, un dominio que crece degenera en *big ball of mud*; entonces añade fronteras |
| **Monolito modular** | Dominio que crece; varios sub-equipos sobre un desplegable; querer la opción futura de extraer | Exige disciplina de fronteras. Es el **default recomendado** cuando el dominio pesa |
| **Hexagonal / puertos y adaptadores (+ clean)** | Aislar el dominio de la infraestructura: varios adaptadores (BD, API, colas), testear el dominio sin infra | Indirección extra. NO con un solo adaptador y sin otro previsto (es especulativo) |
| **Event-driven** | Desacople temporal, picos de carga, integración asíncrona entre partes | Consistencia eventual, trazabilidad y depuración más difíciles. NO «porque escala» |
| **Service-based** | Pocos servicios desplegables por separado, a menudo con BD compartida; medio camino | Más despliegue y observabilidad que un monolito. Es el escalón previo a microservicios |
| **Microservicios** | Equipos autónomos **+** despliegue independiente **+** escalado diferenciado, presentes a la vez, **+** madurez operacional | El *premium* distribuido: red, consistencia eventual, observabilidad, DevOps. NO sin varias fuerzas juntas |

## DDD, transversal (no es un estilo)

DDD no compite con los estilos de arriba: es **cómo modelas el dominio dentro de cualquiera**.

- **Estratégico** (bounded contexts; subdominios *core* / *support* / *generic*) → informa **dónde
  van las fronteras** de módulo o servicio.
- **Táctico** (agregados, entidades, objetos-valor) → informa **dónde vive la lógica** de dominio.
- **Crítica:** el DDD táctico completo se justifica **solo en el subdominio *core*** con complejidad
  real; en CRUDs y subdominios genéricos es sobrecarga (un modelo simple basta).

## Dos patrones que se pagan caro (event sourcing y CQRS)

Tampoco son estilos: son decisiones sobre **cómo se guarda y cómo se lee** el estado. Se
nombran tan juntos que se adoptan juntos por inercia, y conviene saber que **no se implican**:
cada uno va por su lado, y la respuesta correcta suele ser ninguno de los dos. Van redactados
por su coste a propósito, porque el error que se comete con ellos nunca es «no los usé».

**Event sourcing** — en vez de guardar el estado, se guarda la secuencia de hechos que llevó
hasta él, en un registro que solo crece; el estado se reconstruye reproduciéndolos.

- *La fuerza que lo justifica:* que **la historia sea el producto**, no un extra — auditoría que
  hay que poder reconstruir, preguntas sobre cómo estaban las cosas en una fecha dada, un
  dominio donde el hecho **es** la verdad del negocio (un libro contable).
- *El «cuándo NO» más frecuente:* querer saber quién tocó qué. Eso es una tabla de auditoría al
  lado de un CRUD normal, y da casi todo el valor por una fracción del coste.
- *Lo que cuesta:* reconstruir es lento y acaba obligando a instantáneas. Los efectos hacia
  fuera son el problema difícil — reproducir eventos que mandaban correos o cobraban los vuelve
  a mandar y a cobrar, salvo que cada integración sepa distinguir reproducción de ejecución
  real. Y el formato del evento es **para siempre**: uno escrito hace tres años tiene que
  seguir leyéndose hoy, así que no se migra como se migra una tabla y
  {{guide:migraciones-de-datos}} deja de aplicar tal cual. Fowler lo cierra sin ambigüedad:
  *«don't go down this path unless you really need to»*.
- *Y una tensión que hay que ver antes, no después:* un registro que solo crece y el derecho de
  supresión de datos personales tiran en direcciones contrarias. Tiene solución, pero se diseña
  al principio o no se diseña.

**CQRS** — separar el modelo con el que se escribe del modelo con el que se lee, normalmente en
almacenes distintos que se sincronizan con retraso.

- *La fuerza que lo justifica:* que los dos modelos **de verdad diverjan** (la forma buena para
  escribir es mala para leer), o que lectura y escritura necesiten escalarse por separado — y
  que el dominio tolere leer datos con retraso.
- *El «cuándo NO»:* separar la clase que consulta de la que escribe **dentro de un módulo** es
  buena organización del código, no CQRS. CQRS empieza cuando hay **dos almacenes**. Y si entra,
  entra en un bounded context concreto: *«CQRS should only be used on specific portions of a
  system (a BoundedContext in DDD lingo) and not the system as a whole»* (Fowler), que además
  avisa de que aplicarlo donde el dominio no lo pide *«will add complexity, thus reducing
  productivity and increasing risk»*.
- *Lo que cuesta:* dos modelos que mantener sincronizados, el doble de trabajo en cada cambio, y
  la consistencia eventual asomando en la interfaz («lo he guardado y no aparece»), que es un
  problema de producto, no de infraestructura.

## Criterios de decisión (las preguntas del modo recomendar)

Pregunta lo justo para elegir; con señales débiles, tira al default. Las fuerzas que mueven la aguja:

- **Equipo:** ¿tamaño y autonomía? (un equipo → monolito; muchos equipos autónomos → empuja a separar)
- **Dominio:** ¿complejidad y volatilidad? (complejo/volátil → módulos + DDD en el core)
- **Escala/carga REAL esperada:** medida o justificada, no imaginada (el detonante más malinterpretado)
- **No-funcionales:** latencia, disponibilidad, consistencia (¿toleras consistencia eventual?)
- **Despliegue independiente:** ¿de verdad hace falta desplegar partes por separado?
- **Madurez operacional:** ¿hay observabilidad, CI/CD y DevOps para sostener lo distribuido?
- **Modo de respuesta:** ¿hay que contestar cada petición antes de conocer la siguiente, o se
  pueden acumular? (ver abajo — es la pregunta que menos se hace)

## ¿Síncrono o por lotes? (la pregunta que casi nadie plantea)

Antes de elegir cómo se calcula algo, decide **cuándo hay que contestar**. Son dos modos con
consecuencias muy distintas:

- **Síncrono (online):** cada petición se responde sin conocer las siguientes. Es el modo más
  restrictivo, y por eso el que menos soluciones admite.
- **Por lotes (offline):** puedes acumular trabajo, **reordenarlo** y resolverlo junto. Eso
  desbloquea cosas que en síncrono no existen: reutilizar el esfuerzo entre peticiones vecinas,
  agrupar por coste compartido, amortizar un arranque caro entre muchos elementos
  ({{guide:coste-y-estructuras}}).

El error no es elegir mal: es **no plantear la pregunta** y quedarse en síncrono por inercia,
que es el modo caro. Y va aquí, en arquitectura, porque la respuesta **se ve en la interfaz** —
un resultado inmediato o un «te avisamos cuando esté»— y por tanto es una decisión de producto
que hay que tomar en `/plan`, no un detalle de implementación que se descubra después.

**Cómo se decide:** pregunta si alguien necesita el resultado *en ese mismo gesto* para
continuar. Si la respuesta se consume minutos u horas después —un informe, una exportación, un
recálculo masivo, una sincronización—, es por lotes aunque hoy esté escrito como síncrono.

## El default (para casi todo proyecto nuevo)

**Monolito modular en capas**; dominio aislado con **hexagonal solo donde haya un adaptador real**;
**DDD táctico solo en el *core***. Si algún día aparece una fuerza, **migra con StranglerFig** (extrae
un módulo por su costura), no reescribas de cero. Este default cubre la inmensa mayoría de los casos,
Next.js o NestJS por igual.

## Contrato de API: la frontera que otros consumen

Un endpoint es una **frontera arquitectónica publicada**: en cuanto alguien lo llama, cambiarlo
cuesta coordinación ajena. Por eso el contrato se decide al planificar, no se descubre al
integrar. Esto no es un catálogo de estilos de API —el repo ya tendrá el suyo, REST o el que
sea— sino los criterios que hacen que la frontera sea estable y coherente con las demás:

- **Coherencia con el repo antes que con el libro.** El primer trabajo es leer los endpoints
  vecinos y seguir su forma (nomenclatura, envoltorio de respuesta, forma del error,
  versionado). Una API mitad de un estilo y mitad de otro es peor que cualquiera de los dos.
- **Validación de la entrada en la frontera, por esquema.** Todo lo que llega de fuera se
  valida en el borde con el validador que use el repo, y el resto del código trabaja ya con el
  tipo garantizado. Validar «por dentro», a trozos, es como se cuelan los datos imposibles.
- **Códigos de estado que digan la verdad.** Éxito sin cuerpo, creación, error de validación y
  error del servidor no son lo mismo; devolver siempre 200 con un campo `ok` obliga a cada
  consumidor a inventarse su propio protocolo.
- **Forma del error consistente y sin filtraciones.** El mismo formato en todos los endpoints,
  con un mensaje accionable, y nunca la traza ni el detalle interno del motor de datos (eso
  cruza con seguridad: lo reporta la dimensión 5, no esta).
- **Toda colección se pagina, y la forma de paginar es parte del contrato.** Un endpoint que
  hoy devuelve la tabla entera es un contrato que no se puede cambiar mañana sin romper a quien
  lo consume; y es además el caso de {{guide:rendimiento}} más frecuente. Elegir entre página
  por desplazamiento y página por cursor tampoco es un detalle de implementación: la primera
  deja saltar a una página cualquiera y se degrada con la profundidad; la segunda no salta pero
  aguanta. Cambiar de una a otra más tarde rompe a todos los clientes a la vez, así que se
  decide al planificar.
- **Cambiar un contrato publicado es aditivo o es versionado.** Añadir campos opcionales no
  rompe; quitar, renombrar o endurecer sí. Si hay que romper, el plan es el mismo que el de
  {{guide:migraciones-de-datos}}: convivencia primero, retirada después.
- **Idempotencia donde el cliente puede reintentar.** Si una llamada se puede repetir por un
  reintento o un doble clic, el efecto de repetirla debe estar decidido, no descubierto. El
  método ya dice la mitad: `GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS` y `TRACE` son idempotentes
  por definición (RFC 9110), y ahí el trabajo es **no romperlo** — un `PUT` que acumula en vez
  de fijar el estado ha dejado de serlo, y el consumidor sigue asumiendo que puede reintentar—.
  `POST` y `PATCH` no lo son: si el cliente puede reintentarlos, la deduplicación se decide de
  forma explícita, y lo habitual es una clave de idempotencia que el cliente envía y el
  servidor recuerda para devolver la respuesta original en vez de ejecutar dos veces.

En `/plan` esto entra en el enfoque técnico cuando la tarea crea o modifica un endpoint; en
`/review` se juzga en la dimensión 4 (es conformidad con la frontera vigente), dejando la
autorización y la exposición de datos a la dimensión 5 para no reportar dos veces lo mismo.

## Anti-patrones (nómbralos para no caer en ellos)

- **Microservicios prematuros → monolito distribuido** — toda la complejidad de lo distribuido y
  ninguna de sus ventajas. Necesitas varias fuerzas juntas **y** madurez operacional.
- **Endpoint con estilo propio** — inventar una convención distinta a la de sus vecinos porque
  «esta es mejor». La coherencia de la frontera vale más que la preferencia.
- **Romper un contrato publicado en silencio** — quitar o renombrar un campo sin convivencia ni
  versión: el fallo aparece en el consumidor, lejos de quien lo causó.
- **Cambiar la estrategia de paginación de un endpoint vivo** — pasar de desplazamiento a
  cursor (o al revés) rompe a todos sus consumidores de golpe. Es el caso anterior disfrazado
  de mejora de rendimiento, y se planifica igual: convivencia primero, retirada después.
- **Síncrono por inercia** — dejar en petición-respuesta un cálculo cuyo resultado nadie consume
  en ese gesto, porque nadie llegó a preguntarse si podía ir por lotes. Es el modo más caro y el
  que menos soluciones admite, elegido sin decidirlo.
- **Arquitectura resume-driven / «porque mola»** — elegir por prestigio o novedad, no por una fuerza.
- **Hexagonal/puertos por todo con un solo adaptador** — generalidad especulativa a nivel de
  arquitectura: el mismo olor que {{guide:patrones-diseno}} frena a nivel de clase.
- **Event-driven sin asincronía real** — consistencia eventual y trazabilidad difícil a cambio de nada.
- **DDD táctico en CRUDs** — agregados y objetos-valor donde un modelo simple bastaba.
- **Event sourcing para tener auditoría** — el caso que más veces lo dispara y el que menos lo
  justifica: una tabla de auditoría junto al CRUD da casi todo el valor sin heredar los efectos
  hacia fuera ni un formato de evento que ya no se puede migrar.
- **CQRS en el sistema entero** — es un patrón de un bounded context concreto; subido a nivel
  global multiplica el coste sin la fuerza que lo pedía.
- **Adoptar CQRS y event sourcing juntos «porque van juntos»** — son independientes. Juntarlos
  sin que dos fuerzas distintas lo pidan es pagar dos veces por una decisión que no se tomó.
- **Refundar la arquitectura de un repo existente en una tarea** — conforma, no reinventes; una
  migración de estilo es su propia decisión, no un efecto colateral de un criterio de aceptación.

## Autocrítica antes de cerrar

Pregúntate: **¿la arquitectura que propongo responde a una fuerza real y presente, o a una que
imagino? ¿es el estilo más simple que sirve? En un repo existente, ¿estoy conformando en vez de
reinventando? ¿registré la decisión y las alternativas descartadas en «Decisiones tomadas»?** Si algo
falla, corrígelo antes de escribir `spec.md`.
