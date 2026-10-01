# Calidad de producto — ISO/IEC 25010 (taxonomía compartida)

El modelo de calidad de producto de **ISO/IEC 25010** (familia SQuaRE, ISO 25000) es la
**taxonomía compartida** del plugin: da nombre estándar a lo que `/plan` especifica como
requisito no funcional y a lo que `/review` reporta como hallazgo. No es una checklist a
rellenar: es un **vocabulario y un mapa de cobertura**. La regla rectora es la misma del
resto del plugin: se marca una característica solo cuando una **fuerza real** de la tarea la
exige, nunca por inventario.

## El modelo: 9 características (edición 2023)

| Característica | Subcaracterísticas (resumen) | Dónde la cubre el plugin |
|---|---|---|
| **Adecuación funcional** | Completitud, corrección, pertinencia | Dim. 1 de `/review` (cumplimiento de spec); CA de {{guide:historias-usuario}} |
| **Eficiencia de desempeño** | Comportamiento temporal, uso de recursos, capacidad | Guía {{guide:rendimiento}}: criterio con las cuatro piezas (qué/cuánto/dónde/límite) en `/plan`; en `/review`, solo lo evidente en código (p. ej. N+1, listado sin paginar, trabajo pesado en el hilo principal) |
| **Compatibilidad** | Coexistencia, interoperabilidad | Contratos de API (tipo no-funcional API/contrato) |
| **Capacidad de interacción** (antes Usabilidad) | Reconocibilidad, aprendizaje, operabilidad, protección ante errores de usuario, estética, **accesibilidad** | Dim. 6 de `/review` y guía {{guide:usabilidad-accesibilidad}} |
| **Fiabilidad** | Madurez, disponibilidad, tolerancia a fallos, recuperabilidad | Dim. 2 de `/review` (bugs, edge cases, manejo de errores); dim. 7 y {{guide:observabilidad}} (enterarse de que se rompió); {{guide:entrega-y-despliegue}} (recuperabilidad: la vuelta atrás) |
| **Seguridad** | Confidencialidad, integridad, no repudio, responsabilidad, autenticidad, resistencia | Dim. 5 de `/review` (OWASP Top 10); confidencialidad de datos personales con {{guide:proteccion-de-datos}}, decidida en `/plan` |
| **Mantenibilidad** | Modularidad, reusabilidad, analizabilidad, modificabilidad, capacidad de prueba | Dim. 4 de `/review` ({{guide:codigo-limpio}}, {{guide:arquitectura}}); refactor del TDD |
| **Flexibilidad** (antes Portabilidad) | Adaptabilidad, instalabilidad, reemplazabilidad, **escalabilidad** | Decisiones de {{guide:arquitectura}} en `/plan` (solo ante fuerza real) |
| **Protección frente a riesgos** (Safety, nueva en 2023) | Restricción operativa, identificación de riesgos, a prueba de fallos | Solo si el dominio lo exige (sistemas que afectan a personas/bienes); normalmente fuera de alcance |

## Cómo aplicarla

- **En `/plan` (sección «Requisitos no funcionales» del enfoque técnico):** recorre las 9
  características UNA vez como filtro mental y quédate solo con las que la tarea activa de
  verdad. Cada una que marques debe traer un **criterio verificable** (umbral, condición o
  check concreto) y su nivel/herramienta según {{guide:niveles-y-tipos-de-prueba}}. Si ninguna
  aplica más allá de lo funcional, dilo en una línea y no rellenes.
- **En `/review` (informe):** etiqueta cada hallazgo con su característica ISO 25010 además de
  la severidad (p. ej. «Seguridad → confidencialidad», «Mantenibilidad → modificabilidad»).
  Da un lenguaje común entre informes y permite ver de un vistazo qué característica concentra
  la deuda.
- **Al dudar del alcance de una dimensión:** la tabla de arriba resuelve solapamientos — un
  error de manejo de estado es *fiabilidad* (dim. 2); su duplicación en tres ficheros es
  *mantenibilidad* (dim. 4); que exponga un token es *seguridad* (dim. 5).

## El contrato de servicio (disponibilidad, capacidad, respuesta, soporte)

Cuatro requisitos no funcionales que casi siempre llegan como adjetivos —«que esté siempre
disponible», «que aguante», «que vaya rápido», «soporte 24/7»— y que así no se pueden verificar
ni defender. Cada uno tiene su forma comprobable, y las cuatro piezas son las mismas que pide
{{guide:rendimiento}}: qué se mide, sobre qué volumen, dónde y cuál es el límite.

| Lo que llega | Lo que se escribe |
|---|---|
| «Siempre disponible» | Porcentaje sobre una ventana —«99,5 % al mes»—, y qué cuenta como caída. 99,9 % son unos 43 minutos al mes; 99,99 %, cuatro. Cada nueve más cuesta un orden de magnitud |
| «Que aguante» | Usuarios concurrentes o peticiones por segundo, con el volumen de datos de producción |
| «Que vaya rápido» | Percentil y umbral —«p95 por debajo de 500 ms en el listado»—, nunca la media |
| «Soporte 24/7» | Horario, tiempo de primera respuesta por severidad, y quién atiende. Es un requisito de organización, no de código: se apunta, pero no lo verifica un test |

Dos avisos. **Un número que nadie ha medido es una expectativa, no un requisito**: si no hay
dato del sistema actual, se dice y se escribe como objetivo a validar. Y **la cifra no la
inventas tú**: el porcentaje de disponibilidad es una decisión de negocio con coste, y se
pregunta ({{guide:evidencia-y-preguntas}}).

## Anti-patrones (nómbralos para no caer en ellos)

- **Spec-inventario** — listar las 9 características en cada spec.md «para cumplir la norma».
  La norma da el vocabulario; la tarea decide cuáles hablan. Sin fuerza real, no se marca.
- **NFR sin criterio** — «el sistema debe ser eficiente» no es un requisito: sin umbral ni
  check verificable, es ruido. Cada característica marcada lleva su criterio medible.
- **Hallazgo re-etiquetado como relleno** — la etiqueta ISO no sube la severidad ni sustituye
  la disciplina de {{guide:revision-hallazgos}}: primero el hallazgo sobrevive a la
  auto-refutación, después se clasifica.
- **Confundir Seguridad con Safety** — «Seguridad» (security) protege datos y accesos;
  «Protección frente a riesgos» (safety) protege personas y bienes en la operación. La segunda
  casi nunca aplica a una app de gestión.

## Autocrítica antes de cerrar

Antes de fijar los NFR en `/plan` o de emitir el informe de `/review`, pregúntate: **¿cada
característica marcada responde a una fuerza real de la tarea? ¿tiene criterio verificable?
¿etiqueté los hallazgos con su característica sin inflar severidades? ¿evité el inventario?**
Si algo falla, corrígelo antes de seguir.
