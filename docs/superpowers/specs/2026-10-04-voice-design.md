# voice · diseño del flujo de un entregable

> Spec de diseño, 4 de octubre de 2026. Salida del brainstorming con el usuario.
> Siguiente paso: plan de implementación. Estado y decisiones en movimiento:
> `plugins/voice/MEMORY.md`. Lo estable ya escrito: `plugins/voice/README.md`.

## 1. Qué es y para quién

`voice` es el segundo plugin del marketplace `biomas`, hermano de `backbone` bajo
`plugins/` (ADR-0012; un ADR, *architecture decision record*, es el registro de una decisión de
arquitectura, y los de este repo están en `docs/adr/`). Sirve para hacer **entregables de
cliente**: manuales de usuario, presentaciones e informes técnicos. Aplica la misma disciplina
que backbone aplica al código: lo que se afirma está comprobado, lo que se decide queda escrito
y lo que sale fuera lo firma una persona.

La frontera con backbone es el lector. Si el documento lo lee alguien de fuera del equipo, es
de voice. Si lo lee el equipo y vive en el repo (la documentación de un módulo, un ADR, el
`CLAUDE.md`), es de backbone.

### Los dos puntos de partida

- **Proyecto nuevo.** Solo hay encargo: lo que pidió el cliente, las reuniones y, a veces, una
  tarea de ClickUp. No hay código del que sacar nada.
- **Proyecto con trayectoria.** Encargo más repo. El encargo dice qué contar y el código dice
  qué es verdad.

Por eso **el repo es una fuente opcional, no un requisito**. Si está, se usa. Si no, el flujo
sigue igual, como backbone sigue sin ClickUp o sin graphify.

### Lo que se sabe del uso real

- **El formato final depende del cliente**: ficheros de Office (`.docx`, `.pptx`), PDF o un
  documento vivo (Google Docs o Slides, o un documento de Claude). Se apunta al empezar y se
  aplica al final. Mientras tanto, se escribe en markdown neutro.
- **Un entregable no siempre es una tarea de ClickUp.** Si la hay, se enlaza y se mueve con
  aprobación. Si no, se trabaja igual.
- **Un entregable puede descartarse a mitad** porque llega trabajo nuevo. Descartar tiene que
  ser barato y explícito, y no se adelanta trabajo caro antes de que se apruebe.

## 2. Dónde vive el trabajo

En una carpeta del repo donde estés. En un proyecto nuevo puede ser un repo creado solo para
eso.

```
entregables/<slug>/        <slug> = <taskId>_<nombre> si hay tarea de ClickUp; <nombre> si no
  encargo.md               el qué, para quién y para qué. La fuente de verdad
  plan.md                  el cómo, sección a sección
  borrador.md              el contenido, en markdown neutro
  afirmaciones.md          cada afirmación sobre el producto o el cliente → su respaldo
  progress.md              historial y estado actual, mismo formato que en backbone
  salida/                  lo exportado, solo tras la firma (salida/v1/, salida/v2/…)
```

### Qué contiene cada fichero

**`encargo.md`**: cliente, lector, qué decisión tiene que poder tomar el lector tras leerlo,
formato de salida, fuentes disponibles (repo sí o no, documentos, reuniones), tarea de ClickUp
si la hay, y qué queda fuera de alcance.

**`plan.md`**: el índice y, por cada sección, qué cuenta, de qué fuente sale, qué afirmaciones
hará y cómo se respaldan, y si lleva diagrama o tabla, con qué y por qué. No es prosa, son
decisiones. Marca de antemano lo que va a ser difícil de respaldar.

**`afirmaciones.md`**: una línea por afirmación, con su respaldo, que es de uno de tres tipos:

- en el código: fichero y línea del repo
- en el encargo: cita de lo que dijo el cliente, con dónde y cuándo
- **compromiso sin respaldo**: algo que el documento promete y que ninguna fuente confirma.
  No se oculta, se marca, y lo ves tú antes de firmar.

Va aparte del borrador por dos razones. El verificador necesita una lista cerrada que intentar
tumbar, no prosa en la que buscar qué se afirma. Y si va mezclado en el borrador, acaba
colándose en lo que se exporta.

**`progress.md`**: el formato de la guía `registro-progreso` de backbone. Historial que no se
reescribe y estado actual, para poder retomar en otra conversación.

**`salida/`**: solo existe tras la firma. Un documento vivo (Docs, Slides, documento de
Claude) no se guarda aquí: se publica, y el enlace se apunta en `progress.md`.

### Identificadores de sección

Cada sección lleva un identificador estable (por ejemplo `s-instalacion`) que se repite en
`plan.md`, `borrador.md` y `afirmaciones.md`. Así se sabe qué afecta a qué aunque el índice se
reordene, y es lo que permite volver atrás sin tirar trabajo (§5).

## 3. Los comandos

Nombres en inglés y descripciones en español. Al instalarse quedan como `voice:brief`, etc.,
así que no chocan con los de backbone.

| Comando | Escribe | Punto de control |
|---|---|---|
| `/lead [slug \| descripción]` | nada | lleva el flujo; cada salto entre fases, con tu visto bueno |
| `/brief [descripción \| taskId]` | `encargo.md`, crea la carpeta | aprobación del encargo |
| `/outline [slug]` | `plan.md` | **punto de control 1**: aprobación del plan |
| `/draft [slug]` | `borrador.md`, `afirmaciones.md` | ninguno propio; para si el plan ya no sirve |
| `/deliver [slug]` | `salida/`, sello en `progress.md` | **punto de control 2**: tu firma antes de exportar |

Todas las fases escriben su entrada en `progress.md`. Las cuatro fases siguen sirviendo sueltas,
sin pasar por `/lead`.

### `/brief`

1. Si llega un taskId y ClickUp está disponible, lee la tarea. Si no, parte de la descripción.
2. Detecta las fuentes. Si hay repo con código del producto, lanza `explorador-repo` (el
   subagente que ya existe en backbone) para saber qué hace el sistema. Si no lo hay, lo dice
   en una línea y sigue.
3. Pregunta solo lo que cambia el documento y no está en ninguna fuente: quién lo lee, qué
   decisión tiene que poder tomar y en qué formato lo quiere el cliente. Lo que se puede mirar,
   no se pregunta (guía `evidencia-y-preguntas`).
4. Enseña el encargo y, con tu aprobación, crea `entregables/<slug>/` con `encargo.md` y
   `progress.md`. Si hay tarea de ClickUp, propone moverla a «in progress».

### `/outline`

- Lee `encargo.md` y las fuentes, y escribe `plan.md` sección a sección.
- **Diagramas solo cuando hacen falta**, con la guía `diagramas`: un flujo de usuario en un
  manual sí, una lista de requisitos no. Por cada uno dice qué muestra y a qué altura. No se
  dibuja todavía: dibujar es redacción.
- Termina con tu aprobación del plan (punto de control 1).

### `/draft`

- Escribe sección a sección contra el plan, despachando un subagente `redactor` por sección,
  **de uno en uno**: dos redactores a la vez chocarían en `borrador.md` y romperían la
  continuidad del tono. Aplica la guía `escritura-natural` con el registro del lector del encargo.
- Cada afirmación sobre el producto o el cliente va a `afirmaciones.md` con su respaldo. Si no
  lo encuentra, **no lo inventa**: la marca como compromiso sin respaldo y lo dice.
- Se puede retomar a medias: `progress.md` dice qué secciones están hechas.
- Si en mitad de la redacción el plan ya no sirve, para y lo dice. No reescribe el plan.

### `/deliver`, dos modos

**Entregar.**
1. Pasa `check-siglas.mjs` (§6).
2. Despacha `verificador-afirmaciones`, que intenta tumbar cada línea de `afirmaciones.md`
   contra su respaldo y comprueba que cada referencia se entiende sin abrir la fuente.
3. Te enseña lo que quedó dudoso, sin respaldo o con siglas sin explicar.
4. Pide tu firma (punto de control 2). Sin firma no se exporta nada.
5. Exporta al formato de `encargo.md`, sella `progress.md` y, si hay tarea, propone moverla.

**Descartar.** Desde cualquier fase. Pide el motivo en una línea, lo sella en `progress.md` y
propone mover la tarea de ClickUp si la hay. No exporta nada y **no borra la carpeta**: git
guarda el historial y borrarla lo decides tú. Así nadie retoma en otra sesión un entregable
muerto creyendo que sigue vivo.

## 4. `/lead`, el coordinador

Su única tarea es coordinar al equipo. Lee y ordena; **no escribe**.

### Por qué es un comando y no un subagente

En Claude Code, un subagente no puede hablar con el usuario ni lanzar otros subagentes. El
coordinador necesita las dos cosas, así que corre en la conversación principal.

Consecuencia que conviene tener presente: que «solo lee» **no lo impone el sistema**. En un
subagente, la lista de herramientas es un límite duro. En un comando, el campo `allowed-tools`
solo pre-aprueba, no prohíbe (ADR-0008). La regla va en sus instrucciones y en sus banderas
rojas, como el «solo informa» de `/review` en backbone. Para que no se cuele por accidente,
`/lead` no declara Write ni Edit, y una comprobación automática lo vigila (§7).

### Qué hace en cada vuelta

1. **Lee** `entregables/` (qué hay vivo), el `encargo.md` y el `progress.md` del elegido, y la
   tarea de ClickUp si la hay.
2. **Diagnostica en una línea** en qué punto está: sin encargo, encargo sin plan, plan sin
   aprobar, redacción a medias (cuántas secciones de cuántas), listo para entregar, entregado o
   descartado.
3. **Propone el siguiente paso** con su motivo y espera tu visto bueno.
4. **Lanza la fase.** Cuando termina, vuelve al paso 1.

### La revisión entre `/outline` y `/draft`

Antes de proponer `/draft`, lee `plan.md` contra `encargo.md` y comprueba que:

1. cada objetivo del encargo tiene al menos una sección que lo cubre
2. ninguna sección queda fuera del alcance del encargo
3. cada afirmación prevista tiene una fuente nombrada
4. el formato de salida admite lo que el plan propone (un diagrama interactivo no cabe en un PDF)

Si algo falla, lo dice y propone volver a `/outline`. No corrige el plan. Si todo cuadra, te
lo resume y propone `/draft`.

### Lo que no hace

- No redacta, no edita ficheros y no exporta.
- No se salta los puntos de control de las fases: un «sigue» dicho a `/lead` no es la firma de
  `/deliver`.
- No encadena fases sin preguntar. Entre fase y fase es justo cuando decides descartar.
- No vuelve atrás por su cuenta (§5): lo propone.

### Casos límite

- **Sin argumentos y varios entregables vivos:** los lista con su estado y te pide elegir.
- **El estado no cuadra** (por ejemplo, `progress.md` dice entregado y `salida/` está vacía): lo
  dice y pregunta. No lo arregla, porque arreglarlo sería escribir.
- **Entregable descartado:** lo dice y termina. No propone retomarlo.

### Lo que comparte con backbone

backbone tendrá su propio `/lead` (subproyecto aparte, con su spec). Lo común de los dos va a un
snippet, `core/snippets/coordinador.md`: leer estado, proponer, lanzar con visto bueno, no
escribir nunca y no saltarse puntos de control. Cada `/lead` lo inserta con
`{{snippet:coordinador}}` y añade su propio mapa de fases.

## 5. Volver a una fase anterior

Cualquier fase se puede volver a lanzar sobre un entregable vivo, para reorganizar lo que haga
falta.

| Vuelves a… | Qué se conserva | Qué queda pendiente de revisar |
|---|---|---|
| `/brief` (cambia el encargo) | todo | `plan.md` entero: `/lead` lo revisa contra el encargo nuevo y señala qué secciones ya no cuadran |
| `/outline` (cambia el plan) | las secciones del borrador que el cambio no toca | las secciones afectadas y sus afirmaciones |
| `/draft` tras haber entregado | la salida anterior, en `salida/v1/` | se abre una versión nueva: lo enviado al cliente no se pisa |

Reglas:

- **No se borra trabajo hecho.** Una sección afectada se marca como pendiente de revisar en
  `progress.md`. Puede que solo cambie de sitio.
- **Cada vuelta atrás queda en el historial**, con qué cambió y por qué.
- **El punto de control se repite.** Si el plan cambia, se vuelve a aprobar.
- **La disparas tú** en cualquier momento, o **la propone `/lead`** cuando lo detecta: `/draft`
  paró porque el plan no sirve, o el verificador encontró una sección entera apoyada en algo
  que el cliente nunca dijo.

## 6. Texto autocontenido

El lector del entregable es de fuera y no tiene acceso a vuestros documentos. Dos reglas:

1. **Cada referencia se entiende sin abrir la fuente.** Si el texto cita otro documento, una
   reunión o un ticket, dice en la misma frase lo que hace falta saber de él. No vale «según el
   documento de requisitos v2», sino «según los requisitos acordados en marzo, que fijan un
   máximo de 50 usuarios simultáneos». La referencia queda como respaldo, pero no hace falta.
2. **Toda sigla se explica la primera vez que aparece** en el documento: «ERP (sistema de
   gestión empresarial)». En una presentación, la primera vez en cada diapositiva donde
   aparezca, porque una diapositiva se proyecta suelta. Un glosario ayuda si hay muchas, pero no
   exime de explicarlas la primera vez.

Se aplica también a `encargo.md` y `plan.md`: el coordinador, y tú al retomar dentro de un
mes, sois lectores sin contexto igual que el cliente.

**Dónde vive:** un snippet, `core/snippets/texto-autocontenido.md`, insertado en `/outline`,
`/draft` y el verificador, para que la regla diga lo mismo en los tres sitios.

**Cómo se comprueba:**

- **Siglas, con un script.** `core/scripts/check-siglas.mjs` busca palabras en mayúsculas de dos
  o más letras y avisa de las que no se explican en su primera aparición. Es determinista y
  barato, y `/deliver` lo pasa antes de pedir la firma. Lo que avisa lo decides tú: una marca o
  un código de producto no es una sigla que haya que explicar.
- **Referencias, con el verificador**, porque si una frase se entiende sin la fuente no lo puede
  decidir una expresión regular.

## 7. Equipo, guías y pruebas

### Subagentes (solo Claude Code)

| Subagente | Herramientas | Lo despacha | Qué hace |
|---|---|---|---|
| `explorador-repo` | Read, Grep, Glob | `/brief` | reutilizado de backbone: qué hace el sistema |
| `redactor` | Read, Grep, Glob, Write, Edit | `/draft` | escribe una sección con su respaldo; solo toca `borrador.md` y `afirmaciones.md` |
| `verificador-afirmaciones` | Read, Grep, Glob | `/deliver` | intenta tumbar cada afirmación y comprueba que las referencias se entienden solas |

En los subagentes, la lista de herramientas **sí** es un límite duro: el verificador no puede
escribir aunque quiera.

### Guías

- **Ocho compartidas con backbone**, que pasan a llevar `packages: ["backbone", "voice"]` en el
  registro `GUIDES` de `scripts/sync.mjs`: `evidencia-y-preguntas`, `escritura-natural`,
  `diagramas`, `usabilidad-accesibilidad`, `registro-progreso`, `grafo-conocimiento`,
  `formato-toon` y `espacio-de-trabajo-aislado`.
- **`veracidad-tecnica`**, propia de voice. Se escribe solo si su caso de evaluación falla en la
  línea base, es decir, sin el plugin (ADR-0004).
- **Las guías por tipo de entregable** (manual, presentación, informe) no entran en esta spec. Se
  decidirán con datos, cuando se hayan hecho entregables reales.

### Fontanería en `sync.mjs`

- Campo `packages` en `GUIDES`, por defecto `["backbone"]`, para que nada de lo que hoy genera
  backbone cambie.
- `plugins/voice/claude/` como tercer destino en el registro `ADAPTERS`.
- Registro de comandos y agentes por paquete.
- **Borrar salidas huérfanas.** Hoy `sync.mjs` no borra lo que genera cuando se elimina de
  `core/` (pasó al retirar `/ship`), y la comprobación de deriva de la integración continua no lo
  detecta. Con dos paquetes el riesgo se duplica, así que se arregla aquí.
- El manifiesto `plugins/voice/claude/.claude-plugin/plugin.json` se edita a mano, como el de
  backbone.
- Decidir qué hacen `check-version.mjs` y `bump-version.mjs` con dos plugins y dos versiones.
- Segunda entrada en `.claude-plugin/marketplace.json`.

### Pruebas

- **`check-behavior`**: los cinco comandos existen y llevan banderas rojas; `/lead` no declara
  Write ni Edit; los agentes tienen exactamente las herramientas de la tabla de arriba.
- **`check-siglas.mjs`** con sus propios casos: sigla explicada, sigla sin explicar, marca que no
  es sigla, sigla explicada solo en el glosario.
- **Corpus de enrutado** con frases como habla la gente (ADR-0005): «tengo que preparar el manual
  para el cliente X», «sácame la presentación del piloto». Vigilar choques con guías de backbone.
- **Sin evaluación de calidad del texto.** El corrector del eval funciona por subcadena y solo mide
  comportamientos que se dicen de pocas maneras (ADR-0011). Un entregable bien escrito se dice de
  muchas. Esta spec no promete medir la calidad de la prosa.
- **Prueba de humo:** un entregable de ejemplo de punta a punta, con `claude -p`, en un repo de
  prueba, sin y con código del producto.

## 8. Fuera de alcance

- **OpenCode** en esta primera versión: voice depende de subagentes, que OpenCode no tiene.
- **Plantillas visuales por cliente** (logos, colores, maquetación).
- **Detectar documentación desactualizada.** El usuario lo descartó: el dolor es crear, no
  mantener.
- **El `/lead` de backbone**, que tiene su propia spec.

## 9. Orden de trabajo

1. Esta spec → plan de implementación de voice.
2. El `/lead` de backbone, primero en construirse: prueba el patrón del coordinador en un flujo
   real sin necesitar la fontanería de dos plugins, y deja escrito el snippet compartido.
3. Construir voice siguiendo su plan.
