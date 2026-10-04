# voice · segundo plugin del marketplace `biomas`

**Entra un encargo de cliente, sale un entregable que se puede enviar.** Manuales de
usuario, presentaciones e informes técnicos, hechos con la misma disciplina que `backbone`
aplica al código: qué se afirma está comprobado, qué se decide queda escrito y lo que sale
fuera lo firma una persona.

> Estado: **versión 0.1.0** (4 de octubre de 2026). Nombre confirmado el 01/10/2026: `backbone`
> sostiene y `voice` habla hacia fuera, que es lo que hacen sus entregables ante el cliente.

Esta carpeta es la de voice, al mismo nivel que `plugins/backbone/`: los dos plugins son
hermanos en el marketplace y se instalan por separado. Aquí viven el plan, las decisiones y la
memoria de trabajo; la salida generada está en `plugins/voice/claude/`. El contenido del plugin
sigue la regla del repo (ADR-0001, la decisión de que `core/` es la fuente única): se escribe en
`core/` y `scripts/sync.mjs` lo genera.

## Instalar

```
/plugin marketplace add leiniercy/biomas-workflow
/plugin install voice@biomas
/reload-plugins
```

Para exportar a ficheros (docx, pdf) necesita `pandoc`, un conversor de documentos que se
instala aparte. Sin él, `/deliver` deja el markdown firmado y explica cómo convertirlo.
En esta versión funciona solo en Claude Code: OpenCode no está soportado.

## Los cinco comandos

Al instalarse quedan como `voice:brief`, etc., así que no chocan con los de backbone.

| Comando | Escribe | Punto de control |
|---|---|---|
| `/lead [slug \| descripción]` | nada | lleva el flujo; cada salto entre fases, con tu visto bueno |
| `/brief [descripción \| taskId]` | `encargo.md`, crea la carpeta | aprobación del encargo |
| `/outline [slug]` | `plan.md` | **punto de control 1**: aprobación del plan |
| `/draft [slug]` | `borrador.md`, `afirmaciones.md` | ninguno propio; para si el plan ya no sirve |
| `/deliver [slug]` | `salida/`, sello en `progress.md` | **punto de control 2**: tu firma antes de exportar |

Todas las fases escriben su entrada en `progress.md` y sirven sueltas, sin pasar por `/lead`.
`/deliver` también descarta un entregable desde cualquier fase: sella el motivo y no borra la
carpeta. `taskId` es el identificador de la tarea de ClickUp, si la hay.

## Dónde queda el trabajo

En una carpeta del repo donde estés:

```
entregables/<slug>/        <slug> = <taskId>_<nombre> si hay tarea de ClickUp; <nombre> si no
  encargo.md               el qué, para quién y para qué. La fuente de verdad
  plan.md                  el cómo, sección a sección
  borrador.md              el contenido, en markdown neutro
  afirmaciones.md          cada afirmación sobre el producto o el cliente → su respaldo
  progress.md              historial y estado actual
  salida/                  lo exportado, solo tras la firma (salida/v1/, salida/v2/…)
```

## Qué entra y qué no

| Entra en voice | Va a backbone |
|---|---|
| Manual de usuario | Documentación de un módulo o de una API |
| Presentación para cliente | ADR, `CLAUDE.md`, README del repo |
| Informe técnico para cliente | Cualquier texto cuyo lector es el equipo y vive en el repo |

La frontera es el lector: si lo lee alguien de fuera, es voice. (ADR es un registro de decisión
de arquitectura.)

**Descartado:** detectar documentación desactualizada. El dolor es crear, no mantener, así
que no se construye una dimensión de revisión que busque deriva documental.

## Cómo se construye

```
core/guides/<guia>.md              fuente única, compartida o solo de voice
scripts/sync.mjs  GUIDES, AGENTS   cada guía y cada agente declara en qué paquetes sale (packages)
plugins/backbone/claude/            salida generada de backbone (y opencode/ al lado)
plugins/voice/claude/               salida generada de voice, al mismo nivel
plugins/voice/                      este espacio de trabajo: plan, decisiones, memoria
.claude-plugin/marketplace.json     una entrada por plugin
```

El diseño completo, con las decisiones y lo que quedó fuera, está en
[la spec](../../docs/superpowers/specs/2026-10-04-voice-design.md).

## Lo que se reutiliza sin reescribir

`evidencia-y-preguntas`, `escritura-natural`, `diagramas`, `usabilidad-accesibilidad`,
`registro-progreso`, `grafo-conocimiento`, `formato-toon` y `espacio-de-trabajo-aislado`
salen en los dos plugins (`packages: ["backbone", "voice"]`).

## Lo que es propio de voice

- **Veracidad técnica.** Es guía propia, no una sección de `evidencia-y-preguntas`: afirmar
  ante un cliente lo que hace un producto falla de otras maneras que escribir un dato para tu
  equipo.
- Una guía por tipo de entregable (manual, presentación, informe), si el eval demuestra que
  hacen falta. Antes de escribir cada una, leer el ADR-0004 (el caso vale solo si la línea
  base falla) y el ADR-0011 (el eval solo mide comportamientos de vocabulario estrecho).

## Memoria de trabajo

`plugins/voice/MEMORY.md` es la memoria de trabajo del plugin: estado, aprendizajes y comandos. No
se versiona, igual que el `MEMORY.md` de la raíz, y cada persona lleva la suya. Para
empezar una, copia la plantilla de la raíz:

```sh
cp core/templates/MEMORY.md.example plugins/voice/MEMORY.md
```

Lo que se decida de forma estable pasa a este README o a un ADR en `docs/adr/`; la memoria
es para lo que todavía se mueve.
