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

## Criterios de decisión (las preguntas del modo recomendar)

Pregunta lo justo para elegir; con señales débiles, tira al default. Las fuerzas que mueven la aguja:

- **Equipo:** ¿tamaño y autonomía? (un equipo → monolito; muchos equipos autónomos → empuja a separar)
- **Dominio:** ¿complejidad y volatilidad? (complejo/volátil → módulos + DDD en el core)
- **Escala/carga REAL esperada:** medida o justificada, no imaginada (el detonante más malinterpretado)
- **No-funcionales:** latencia, disponibilidad, consistencia (¿toleras consistencia eventual?)
- **Despliegue independiente:** ¿de verdad hace falta desplegar partes por separado?
- **Madurez operacional:** ¿hay observabilidad, CI/CD y DevOps para sostener lo distribuido?

## El default (para casi todo proyecto nuevo)

**Monolito modular en capas**; dominio aislado con **hexagonal solo donde haya un adaptador real**;
**DDD táctico solo en el *core***. Si algún día aparece una fuerza, **migra con StranglerFig** (extrae
un módulo por su costura), no reescribas de cero. Este default cubre la inmensa mayoría de los casos,
Next.js o NestJS por igual.

## Anti-patrones (nómbralos para no caer en ellos)

- **Microservicios prematuros → monolito distribuido** — toda la complejidad de lo distribuido y
  ninguna de sus ventajas. Necesitas varias fuerzas juntas **y** madurez operacional.
- **Arquitectura resume-driven / «porque mola»** — elegir por prestigio o novedad, no por una fuerza.
- **Hexagonal/puertos por todo con un solo adaptador** — generalidad especulativa a nivel de
  arquitectura: el mismo olor que {{guide:patrones-diseno}} frena a nivel de clase.
- **Event-driven sin asincronía real** — consistencia eventual y trazabilidad difícil a cambio de nada.
- **DDD táctico en CRUDs** — agregados y objetos-valor donde un modelo simple bastaba.
- **Refundar la arquitectura de un repo existente en una tarea** — conforma, no reinventes; una
  migración de estilo es su propia decisión, no un efecto colateral de un criterio de aceptación.

## Autocrítica antes de cerrar

Pregúntate: **¿la arquitectura que propongo responde a una fuerza real y presente, o a una que
imagino? ¿es el estilo más simple que sirve? En un repo existente, ¿estoy conformando en vez de
reinventando? ¿registré la decisión y las alternativas descartadas en «Decisiones tomadas»?** Si algo
falla, corrígelo antes de escribir `spec.md`.
