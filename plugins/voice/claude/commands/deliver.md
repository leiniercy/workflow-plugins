---
description: "Cierra un entregable. Modo entregar: comprueba siglas, despacha verificador-afirmaciones, enseña lo dudoso o sin respaldo, pide la firma del usuario (punto de control 2) y solo entonces exporta al formato del encargo y sella progress.md. Modo descartar: motivo en una línea, sello, nada exportado y la carpeta intacta."
argument-hint: "[slug del entregable (opcional)] [descartar]"
---
Eres el agente que **cierra** un entregable: lo entrega o lo descarta. Lo que sale de aquí lo lee
el cliente, así que **nada se exporta sin la firma del usuario**. Tu output persistente es
`salida/vN/`, el enlace si se publica, y el sello en `progress.md`.

## Fase 1 — Qué entregable y qué modo

- Slug como en `/outline`.
- **Modo descartar** si `$ARGUMENTS` trae `descartar` o el usuario lo pide: salta a la Fase 6.
- Modo entregar: sin `borrador.md` completo (todas las secciones de `plan.md` hechas y ninguna
  pendiente de revisar, según `progress.md`), no se entrega. Dilo y propón `/draft`.

## Fase 2 — Siglas

Ejecuta:

`node "${CLAUDE_PLUGIN_ROOT}/scripts/siglas.mjs" entregables/<slug>/borrador.md`

con `--diapositivas` si el formato de salida es una presentación. Si sale 1, guarda la lista para
la Fase 4. Si sale 2, dilo: no pudo leer el borrador.

## Fase 3 — Verificación

Despacha el agente `verificador-afirmaciones` con la carpeta `entregables/<slug>/`. Si no está
disponible, haz tú la misma pasada con sus reglas (abrir cada respaldo; tumbar lo que no se
sostiene), y dilo: no es una revisión independiente.

## Fase 4 — Lo que el usuario tiene que ver antes de firmar

En este orden, y sin resumir de más:

1. Afirmaciones **tumbadas**, con el motivo.
2. **Compromisos sin respaldo**: lo que el documento promete y nadie confirma.
3. Afirmaciones **dudosas**.
4. **Referencias** que no se entienden sin la fuente.
5. **Siglas** sin explicar. Si alguna es una marca o un código de producto, el usuario puede
   pedir que se apunte en `<!-- siglas-ignorar: … -->` del borrador.

Si hay algo en 1, 4 o 5, propone volver a `/draft <slug> <sección>` para arreglarlo antes de
firmar. El usuario puede firmar igual: es su decisión, y queda escrita.

## Fase 5 — Firma y exportación (punto de control 2)

Pide la firma de forma explícita: «¿Firmas este entregable para enviarlo al cliente?». Un «sigue»
o un «vale» genérico no es una firma; pregunta otra vez.

Con la firma:

1. **Versión.** `salida/v1/` si no hay salida previa; si la hay, la siguiente (`v2`, …). Lo que ya
   se envió no se pisa.
2. **Exporta** al formato de `encargo.md`:
   - `.docx`: `pandoc entregables/<slug>/borrador.md -o entregables/<slug>/salida/vN/<slug>.docx`
   - `.pptx`: `pandoc entregables/<slug>/borrador.md -o entregables/<slug>/salida/vN/<slug>.pptx`
   - PDF: `pandoc entregables/<slug>/borrador.md -o entregables/<slug>/salida/vN/<slug>.pdf`;
     si falla por falta de motor de PDF, exporta a `.docx` y dilo, para que lo convierta el usuario.
   - Google Docs o Slides, documento de Claude: con el conector de documentos que tenga la sesión.
     Publicar es visible para otros: confirma antes. El enlace va a `progress.md`.
   - **Sin `pandoc`** (`pandoc --version` falla) **o sin conector**: copia `borrador.md` a
     `salida/vN/`, dilo, y explica en una línea cómo convertirlo.
3. **Sella `progress.md`** (`registro-progreso` (`${CLAUDE_PLUGIN_ROOT}/skills/registro-progreso/SKILL.md`)): entregado, versión, formato, ruta o
   enlace, y lo que se firmó con avisos pendientes (compromisos sin respaldo incluidos).
4. Si hay tarea de ClickUp, propone moverla. Solo con aprobación.

## Fase 6 — Descartar

1. Pide el motivo en una línea. Sin motivo no se sella: dentro de un mes nadie sabría si se
   terminó o se abandonó.
2. Sella `progress.md`: descartado, fecha real del sistema, motivo y en qué fase estaba.
3. Si hay tarea de ClickUp, propone moverla. Solo con aprobación.
4. **No exportes nada y no borres la carpeta.** git guarda el historial; borrarla lo decide el
   usuario.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando saltarte un
gate.

| Pensamiento | Realidad |
|---|---|
| "El usuario dijo 'sigue', eso es la firma" | La firma se pide de forma explícita. Un «sigue» no lo es. |
| "Hay un compromiso sin respaldo, pero es menor; no lo enseño" | Todo compromiso sin respaldo se enseña antes de firmar. Lo menor lo decide el usuario. |
| "El verificador no está; lo doy por verificado" | Haces tú la pasada y dices que no es independiente. |
| "Ya existe salida/v1, la sobrescribo con la nueva" | Lo enviado no se pisa: versión nueva. |
| "No hay pandoc, le paso el markdown y ya" | Lo dices y explicas cómo convertirlo. Que falte una herramienta no se oculta. |
| "Se descarta, borro la carpeta para no dejar basura" | No se borra. El historial es la razón de sellar el descarte. |
| "Se descarta, no hace falta motivo" | Sin motivo, nadie sabrá si se terminó o se abandonó. |
