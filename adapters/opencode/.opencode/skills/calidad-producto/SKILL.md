---
name: calidad-producto
description: "Úsala al fijar los requisitos no funcionales de una tarea en /plan y al etiquetar un hallazgo de /review con vocabulario estándar. Síntomas: un requisito de «rendimiento», «seguridad» o «usabilidad» sin criterio medible, o un hallazgo que no sabes en qué dimensión de calidad cae. Taxonomía ISO/IEC 25010."
---
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
| **Adecuación funcional** | Completitud, corrección, pertinencia | Dim. 1 de `/review` (cumplimiento de spec); CA de `historias-usuario` (skill de OpenCode, auto-activable) |
| **Eficiencia de desempeño** | Comportamiento temporal, uso de recursos, capacidad | Tipo no-funcional a **marcar** en `/plan` (`niveles-y-tipos-de-prueba` (skill de OpenCode, auto-activable)); en `/review`, solo lo evidente en código (p. ej. N+1, trabajo pesado en el hilo/render principal) |
| **Compatibilidad** | Coexistencia, interoperabilidad | Contratos de API (tipo no-funcional API/contrato) |
| **Capacidad de interacción** (antes Usabilidad) | Reconocibilidad, aprendizaje, operabilidad, protección ante errores de usuario, estética, **accesibilidad** | Dim. 6 de `/review` y guía `usabilidad-accesibilidad` (skill de OpenCode, auto-activable) |
| **Fiabilidad** | Madurez, disponibilidad, tolerancia a fallos, recuperabilidad | Dim. 2 de `/review` (bugs, edge cases, manejo de errores) |
| **Seguridad** | Confidencialidad, integridad, no repudio, responsabilidad, autenticidad, resistencia | Dim. 5 de `/review` (OWASP Top 10) |
| **Mantenibilidad** | Modularidad, reusabilidad, analizabilidad, modificabilidad, capacidad de prueba | Dim. 4 de `/review` (`codigo-limpio` (skill de OpenCode, auto-activable), `arquitectura` (skill de OpenCode, auto-activable)); refactor del TDD |
| **Flexibilidad** (antes Portabilidad) | Adaptabilidad, instalabilidad, reemplazabilidad, **escalabilidad** | Decisiones de `arquitectura` (skill de OpenCode, auto-activable) en `/plan` (solo ante fuerza real) |
| **Protección frente a riesgos** (Safety, nueva en 2023) | Restricción operativa, identificación de riesgos, a prueba de fallos | Solo si el dominio lo exige (sistemas que afectan a personas/bienes); normalmente fuera de alcance |

## Cómo aplicarla

- **En `/plan` (sección «Requisitos no funcionales» del enfoque técnico):** recorre las 9
  características UNA vez como filtro mental y quédate solo con las que la tarea activa de
  verdad. Cada una que marques debe traer un **criterio verificable** (umbral, condición o
  check concreto) y su nivel/herramienta según `niveles-y-tipos-de-prueba` (skill de OpenCode, auto-activable). Si ninguna
  aplica más allá de lo funcional, dilo en una línea y no rellenes.
- **En `/review` (informe):** etiqueta cada hallazgo con su característica ISO 25010 además de
  la severidad (p. ej. «Seguridad → confidencialidad», «Mantenibilidad → modificabilidad»).
  Da un lenguaje común entre informes y permite ver de un vistazo qué característica concentra
  la deuda.
- **Al dudar del alcance de una dimensión:** la tabla de arriba resuelve solapamientos — un
  error de manejo de estado es *fiabilidad* (dim. 2); su duplicación en tres ficheros es
  *mantenibilidad* (dim. 4); que exponga un token es *seguridad* (dim. 5).

## Anti-patrones (nómbralos para no caer en ellos)

- **Spec-inventario** — listar las 9 características en cada spec.md «para cumplir la norma».
  La norma da el vocabulario; la tarea decide cuáles hablan. Sin fuerza real, no se marca.
- **NFR sin criterio** — «el sistema debe ser eficiente» no es un requisito: sin umbral ni
  check verificable, es ruido. Cada característica marcada lleva su criterio medible.
- **Hallazgo re-etiquetado como relleno** — la etiqueta ISO no sube la severidad ni sustituye
  la disciplina de `revision-hallazgos` (skill de OpenCode, auto-activable): primero el hallazgo sobrevive a la
  auto-refutación, después se clasifica.
- **Confundir Seguridad con Safety** — «Seguridad» (security) protege datos y accesos;
  «Protección frente a riesgos» (safety) protege personas y bienes en la operación. La segunda
  casi nunca aplica a una app de gestión.

## Autocrítica antes de cerrar

Antes de fijar los NFR en `/plan` o de emitir el informe de `/review`, pregúntate: **¿cada
característica marcada responde a una fuerza real de la tarea? ¿tiene criterio verificable?
¿etiqueté los hallazgos con su característica sin inflar severidades? ¿evité el inventario?**
Si algo falla, corrígelo antes de seguir.
