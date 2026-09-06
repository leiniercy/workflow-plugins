# Borradores (`in-progress/`)

El único sitio del repo donde una guía puede existir **sin enviarse**. Todo `.md` que esté en
`core/guides/` a primer nivel se publica: se registra en `GUIDES` de `sync.mjs`, se genera como
skill en los dos adaptadores y viaja en el paquete. Aquí no.

## Para qué sirve

- **Una guía a medio escribir** que quieres versionar sin que llegue al usuario.
- **Una guía retirada** que no quieres borrar todavía, por si el material sirve después.
- **Una guía que depende de algo que aún no existe** — una herramienta en early access, una
  decisión sin tomar.

El caso que justifica el bucket es el tercero, y es real: sin él, la única forma de no publicar
algo es no escribirlo, así que el trabajo a medias se pierde entre sesiones.

## El contrato

1. **Un borrador NO se registra en `GUIDES`** de `scripts/sync.mjs`. Si lo registras sin
   moverlo, `sync.mjs` falla al no encontrar `core/guides/<nombre>.md` — y ese fallo ruidoso es
   deliberado, porque el silencioso sería publicar un borrador.
2. **Un borrador NO genera skill.** `check-behavior.mjs` lo asevera: si aparece una skill con el
   nombre de un borrador, el check falla.
3. **Nadie lo referencia.** Un `{{guide:<borrador>}}` desde una guía publicada revienta `sync.mjs`
   con «Guía desconocida en token». También deliberado: una referencia a algo que el usuario no
   tiene es peor que no tener la referencia.
4. **No hace falta que esté terminado.** Es un borrador: puede no tener `description`, ni
   anti-patrones, ni autocrítica. Nada de eso se le exige hasta que se promueve.

## Cómo se promueve

1. Termínala con la plantilla del resto de guías: rol, cuerpo, «Cómo aplicarla»,
   «Anti-patrones» y «Autocrítica antes de cerrar».
2. **Muévela** a `core/guides/`.
3. Regístrala en `GUIDES` de `scripts/sync.mjs` con su `description` — disparador, no resumen:
   abre con «Úsala cuando/al/en…», nombra síntomas buscables y no pasa de 500 caracteres.
4. `node scripts/sync.mjs` y `node scripts/check-behavior.mjs`.
5. Añádela al catálogo del `README.md` y al `CHANGELOG.md`.

## Cómo se retira

El camino inverso, y con una advertencia: mover una guía aquí **la quita del paquete**, así que
cualquier `{{guide:...}}` que apunte a ella deja de resolver y `sync.mjs` lo dirá. Quita esas
referencias antes de mover, no después.
