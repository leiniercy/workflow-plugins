# ADR 0009 — Las acciones de CI van pineadas por SHA, y los workflows con permisos mínimos

**Status:** aceptada (v0.21.0)

## Context

`actions/checkout@v4` no es una versión: es una etiqueta mutable que apunta a donde el
mantenedor —o quien le robe la cuenta— decida. Un tag movido ejecuta código nuevo en CI sin que
nadie haya aprobado un diff. Y el `GITHUB_TOKEN` por defecto viene con permisos de escritura,
así que ese código llega ya con llaves.

El problema práctico es que un SHA de cuarenta caracteres parece basura. Es de las cosas que
alguien «limpia» de vuelta a `@v4` en un rato de orden, y nada en CI lo impide.

## Decision

Toda acción de terceros va **pineada por SHA completo**, con la versión legible en un comentario
al lado:

```yaml
uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
```

Así están `actions/checkout`, `actions/setup-node` y `github/codeql-action` en los ocho
workflows de `.github/workflows/`. El comentario `# v4` es lo que hace legible el pin: sin él,
nadie sabe qué está actualizando.

Y todo workflow declara `permissions:` explícitamente, para no heredar el token de escritura por
defecto. Lo cumplen siete de los ocho.

**La excepción, declarada:** `review.yml:23` usa `anthropics/claude-code-action@v1` sin pinear, y
es el único workflow sin bloque `permissions`. Es la acción que necesita escribir en la PR que
revisa, así que el pin y el recorte de permisos exigen un repaso aparte. Está reconocida, no
olvidada.

Viene del commit `6245f00`, «feat(seguridad): endurecer la superficie del plugin y su CI», junto
con `SECURITY.md`.

## Consequences

- Actualizar una acción es un commit con diff, no un tag que se mueve solo. Más trabajo y ese es
  el punto.
- Un SHA sin su comentario `# vN` es ilegible: el comentario forma parte del pin, no es adorno.
- Nada en CI comprueba que los pins sigan ahí. Hoy es disciplina; si se pierde una vez, se pierde
  en silencio. Una aserción sobre `.github/workflows/` lo convertiría en política.
- La excepción de `review.yml` queda como deuda con nombre y apellidos. Si aparece una segunda
  excepción, toca escribir por qué antes de añadirla.
