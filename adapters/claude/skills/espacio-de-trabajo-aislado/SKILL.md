---
name: espacio-de-trabajo-aislado
description: "Úsala al empezar una tarea que conviene aislar del trabajo en curso, o antes de crear un worktree de git. Síntomas: el usuario tiene cambios abiertos en otra rama, quieres revisar una PR sin abandonar lo que implementas, o vas a escribir `git worktree add` sin haber comprobado si ya estás dentro de un worktree."
user-invocable: false
---
# Espacio de trabajo aislado (git worktrees)

El objetivo no es «usar worktrees»: es **trabajar sin pisar lo que el usuario tiene abierto**.
Un worktree es un segundo directorio de trabajo del mismo repo, con su propia rama y sus
propios ficheros, compartiendo un solo `.git`. Sirve para llevar una tarea sin tocar la rama en
la que el usuario está, y para revisar una PR sin abandonar lo que estás implementando.

**Principio rector:** detecta si ya estás aislado → usa la herramienta nativa del entorno →
solo entonces cae a `git` a mano. **Nunca pelees con el harness.**

## Paso 0 — ¿Ya estás aislado? (compruébalo antes de crear nada)

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

Si `GIT_DIR != GIT_COMMON`, estás en un worktree enlazado… **o en un submódulo**. Es la trampa
clásica: la comprobación no distingue los dos casos. Descártalo antes de concluir:

```bash
git rev-parse --show-superproject-working-tree 2>/dev/null   # devuelve ruta → es un SUBMÓDULO
```

- **Worktree enlazado** → ya estás aislado: **NO crees otro**. Salta al paso 3.
- **Submódulo o `GIT_DIR == GIT_COMMON`** → es un checkout normal: sigue.

## Paso 1 — Crear el espacio

### 1a. La herramienta nativa del entorno, primero

Si tu entorno ofrece una herramienta propia para worktrees (un `EnterWorktree`, un comando
`/worktree`, un flag `--worktree`), **úsala**. Gestiona por su cuenta dónde va el directorio,
la creación de la rama y la limpieza al terminar.

Usar `git worktree add` teniendo una herramienta nativa es **el error más común**: crea estado
que el harness no ve ni sabe limpiar, y acabas con directorios huérfanos.

### 1b. Fallback con git (solo si no hay herramienta nativa)

**Dónde**, por orden de prioridad — una preferencia explícita del usuario gana siempre:

1. Lo que el usuario haya indicado.
2. Un directorio que ya exista: `.worktrees/` (preferido) o `worktrees/`. Si están los dos,
   gana `.worktrees/`.
3. Por defecto, `.worktrees/` en la raíz del repo.

**Verificación obligatoria antes de crear** (si el directorio va dentro del repo):

```bash
git check-ignore -q .worktrees || echo "NO IGNORADO"
```

Si no está ignorado, **añádelo al `.gitignore` y commitea ese cambio antes de continuar**. Un
directorio de worktrees sin ignorar mete el árbol entero del segundo checkout dentro del repo.

```bash
git worktree add "<ruta>/<rama>" -b "<rama>" develop
```

Si `git worktree add` falla por permisos (sandbox), **no insistas**: dilo y trabaja en el
directorio actual.

## Paso 2 — Preparar el espacio

Un worktree recién creado tiene los ficheros versionados y **nada más**. Lo que no está en git
no viaja, y sin ello el proyecto no arranca:

- **Copia la configuración local no versionada** del checkout principal: `.env` y sus variantes
  (con `.env.example`/`.env.default` como respaldo), `.mcp.json`, credenciales de desarrollo.
- **Instala dependencias** con el gestor que use el repo (detecta por el manifiesto:
  `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`…) y ejecuta el paso de generación si
  lo hay (cliente de ORM, tipos, protobuf).
- Si el proyecto levanta servidores, **los puertos del worktree chocan con los del checkout
  principal**: usa puertos distintos o no levantes los dos a la vez.

**Hazlo idempotente:** comprueba si la rama o el directorio ya existen y sáltatelos en vez de
fallar. Un `/start` que se reanuda no debe romperse por lo que ya hizo.

## Paso 3 — Línea base en verde

Ejecuta la suite **antes** de escribir nada. Si arranca en rojo, cualquier fallo posterior será
ambiguo: no sabrás si lo rompiste tú. Si falla, repórtalo y **pregunta** si continuar o
investigar — no lo decidas tú.

## Limpieza: solo lo que creaste

Al terminar la tarea, retira el worktree **solo si lo creaste tú** y está bajo `.worktrees/` o
`worktrees/`. Cualquier otro directorio pertenece al entorno del usuario: déjalo en paz.

```bash
git worktree remove "<ruta>"
git worktree prune          # limpia registros obsoletos
```

La eliminación se ejecuta **desde fuera** del worktree, y como todo lo visible, **con
aprobación**.

## Anti-patrones

| Pensamiento | Realidad |
|---|---|
| «Se ve que no estoy en un worktree, no hace falta comprobarlo» | Ejecuta el paso 0. Ni el aislamiento creado por el harness ni un submódulo se distinguen a ojo. |
| «`git worktree add` es más rápido que buscar la herramienta nativa» | La nativa gestiona ubicación, rama y limpieza. Saltártela deja estado fantasma que el harness no puede limpiar. |
| «El directorio de worktrees seguro que ya está ignorado» | Compruébalo con `git check-ignore`. Si no lo está, commiteas el árbol entero del segundo checkout. |
| «Copio el `.env` luego, primero que arranque» | Sin la configuración no versionada el proyecto no arranca, y depurarás un fallo de entorno creyendo que es de código. |
| «El espacio es nuevo, la línea base puede esperar» | Una base en rojo hace ambiguo cualquier fallo posterior. Ejecútala antes de tocar nada. |
| «Ese worktree parece viejo, lo borro de paso» | Solo retiras lo que creaste tú bajo `.worktrees/`. Lo demás es del usuario. |

## Autocrítica antes de empezar a trabajar

Pregúntate: **¿comprobé que no estaba ya aislado (y que no era un submódulo)? ¿usé la
herramienta nativa si la había? ¿el directorio está ignorado? ¿copié la configuración no
versionada? ¿la suite arranca en verde?** Si alguna falla, resuélvela antes de escribir código.
