# voice · segundo plugin del marketplace `biomas`

**Entra un encargo de cliente, sale un entregable que se puede enviar.** Manuales de
usuario, presentaciones e informes técnicos, hechos con la misma disciplina que `backbone`
aplica al código: qué se afirma está comprobado, qué se decide queda escrito y lo que sale
fuera lo firma una persona.

> Estado: **decidido, sin empezar** (decisión del 28/09/2026). Nombre confirmado el 01/10/2026: `backbone`
> sostiene y `voice` habla hacia fuera, que es lo que hacen sus entregables ante el cliente.

Esta carpeta es la de voice, al mismo nivel que `plugins/backbone/`: los dos plugins son
hermanos en el marketplace y se instalan por separado. Aquí viven, de momento, el plan, las
decisiones y la memoria de trabajo; la salida generada irá a `plugins/voice/claude/`.
El contenido del plugin sigue la regla del
repo (ADR-0001): se escribe en `core/` y `scripts/sync.mjs` lo genera.

## Qué entra y qué no

| Entra en voice | Va a backbone |
|---|---|
| Manual de usuario | Documentación de un módulo o de una API |
| Presentación para cliente | ADR, `CLAUDE.md`, README del repo |
| Informe técnico para cliente | Cualquier texto cuyo lector es el equipo y vive en el repo |

La frontera es el lector: si lo lee alguien de fuera, es voice.

**Descartado:** detectar documentación desactualizada. El dolor es crear, no mantener, así
que no se construye una dimensión de revisión que busque deriva documental.

## Cómo se construye

```
core/guides/<guia>.md              fuente única, compartida o solo de voice
scripts/sync.mjs  GUIDES           cada guía gana un campo packages (por defecto ["backbone"])
plugins/backbone/claude/            salida generada de backbone (y opencode/ al lado)
plugins/voice/claude/               salida generada de voice, al mismo nivel
plugins/voice/                      este espacio de trabajo: plan, decisiones, memoria
.claude-plugin/marketplace.json     segunda entrada en "plugins" cuando haya algo que instalar
```

`sync.mjs` ya separa el destino de cada fichero por adaptador (`scriptPath`, `commandPath`,
`guidePath`, `agentPath` en el registro `ADAPTERS`). Añadir `plugins/voice/claude/` como tercer
destino es barato y respeta el ADR-0001.

## Lo que se reutiliza sin reescribir

`evidencia-y-preguntas`, `escritura-natural`, `diagramas`, `usabilidad-accesibilidad`,
`registro-progreso`, `grafo-conocimiento`, `formato-toon` y `espacio-de-trabajo-aislado`.
Pasan a llevar `packages: ["backbone", "voice"]`.

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
