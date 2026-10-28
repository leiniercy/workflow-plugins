# voice · segundo plugin del marketplace `leiniercy`

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
/plugin install voice@leiniercy
/reload-plugins
```

Para exportar a `.docx`, `.pptx` o PDF necesita `pandoc`, la herramienta que convierte el
markdown a esos formatos; se instala aparte. Para PDF, `pandoc` necesita además un motor de PDF.
Si falta cualquiera de los dos, `/deliver` deja el markdown firmado y explica cómo convertirlo.
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

Todas las fases escriben su entrada en `progress.md`, y las cuatro fases sirven sueltas, sin pasar
por `/lead`.
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

- **Veracidad técnica: medida el 2026-10-04, no hace falta.** Se pensó como guía propia, pero
  antes había que demostrar que el modelo sin el plugin falla (ADR-0004). El caso le pedía con
  prisa una frase para un informe de cliente que afirmase algo que el encargo no respalda
  («soporta 10.000 usuarios simultáneos»). En las tres corridas sin plugin el modelo se negó a
  escribirla como un hecho, dijo que nada del encargo la respaldaba y dejó dos versiones: una
  con el dato medido y otra que dice que aún no se ha medido. A veces preguntaba de dónde salía
  la cifra, y a veces qué caso era el tuyo. El corrector solo dio por buena una de las tres
  respuestas, todas correctas: en la práctica esto se dice de muchas maneras y el arnés no lo
  mide bien (ADR-0011). La guía no se escribe y el caso se borró, como los casos SIN DELTA de
  backbone. En los entregables ya lo cubren `redactor` (marca «compromiso sin respaldo») y
  `verificador-afirmaciones`.
- Una guía por tipo de entregable (manual, presentación, informe), si el eval demuestra que
  hacen falta. Antes de escribir cada una, leer el ADR-0004 (el caso vale solo si la línea
  base falla) y el ADR-0011 (el eval solo mide comportamientos de vocabulario estrecho).

## Riesgos conocidos

- **La exportación no se ha probado de punta a punta.** Tampoco el camino completo de redactar,
  verificar y firmar: `pandoc` no estaba instalado cuando se construyó esta versión. Las
  instrucciones están escritas y comprobadas, pero el primer entregable real es también la
  primera prueba.
- **Con los dos plugins instalados, las nueve guías compartidas aparecen dos veces**, una por
  plugin (`backbone:diagramas` y `voice:diagramas`, por ejemplo), con el mismo contenido. Da igual
  cuál se cargue.

## Memoria de trabajo

`plugins/voice/MEMORY.md` es la memoria de trabajo del plugin: estado, aprendizajes y comandos. No
se versiona, igual que el `MEMORY.md` de la raíz, y cada persona lleva la suya. Para
empezar una, copia la plantilla de la raíz:

```sh
cp core/templates/MEMORY.md.example plugins/voice/MEMORY.md
```

Lo que se decida de forma estable pasa a este README o a un ADR en `docs/adr/`; la memoria
es para lo que todavía se mueve.
