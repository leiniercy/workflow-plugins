---
description: "Al trabajar en voice, su memoria de trabajo es plugins/voice/MEMORY.md, no la de la raíz."
paths:
  - "plugins/voice/**"
---

# Estás trabajando en voice

`voice` es el segundo plugin del marketplace `biomas`. Tiene **su propia memoria de
trabajo** en `plugins/voice/MEMORY.md`, separada de la de backbone (`/MEMORY.md`).

1. Lee `plugins/voice/MEMORY.md` antes de seguir: ahí están el estado de las tareas y lo que se
   aprendió. Si no existe, créala con `cp MEMORY.md.example plugins/voice/MEMORY.md`.
2. Lo que avances, aprendas o decidas sobre voice va a `plugins/voice/MEMORY.md`, con fecha. No lo
   mezcles en `/MEMORY.md`.
3. Lo que quede decidido y estable sube a `plugins/voice/README.md` o a un ADR en `docs/adr/`.

El contenido del plugin no se escribe en `plugins/voice/`: se escribe en `core/` y lo genera
`scripts/sync.mjs` (ADR-0001). `plugins/voice/` es el sitio del plan y de la memoria.
