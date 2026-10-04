#!/usr/bin/env node
/**
 * sync.mjs — genera los adaptadores (Claude Code y OpenCode) desde core/.
 *
 * core/ es la ÚNICA fuente de verdad de workflows y guías. Este script:
 *   - sustituye los tokens {{guide:nombre}} por la referencia correcta de cada herramienta
 *   - expande los tokens {{snippet:nombre}} con la prosa canónica de core/snippets/
 *   - antepone el frontmatter propio de cada adaptador
 *   - escribe los ficheros generados (NO editar a mano: se sobrescriben)
 *
 * Uso:  node scripts/sync.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Paquetes del marketplace. Cada entrada de COMMANDS, AGENTS, GUIDES y SCRIPTS declara en
// `packages` a cuáles pertenece; sin el campo, solo a backbone, para que lo que ya existía no
// cambie. voice no se genera para OpenCode: sus comandos despachan subagentes, que OpenCode
// no tiene (spec de voice, §8).
// ---------------------------------------------------------------------------
const PACKAGES = {
  backbone: { adapters: ["claude", "opencode"] },
  voice: { adapters: ["claude"] },
};
const pkgsOf = (meta) => (meta && meta.packages) || ["backbone"];

// ---------------------------------------------------------------------------
// Metadatos por comando (frontmatter)
// ---------------------------------------------------------------------------
const COMMANDS = {
  // Corre ANTES de que exista un taskId —es quien lo crea—, así que es el único comando que no
  // persiste nada en el repo: no hay `tasks/<taskId>/` todavía y no se inventa uno. Su
  // artefacto son las tareas, y las tareas viven en ClickUp.
  define: {
    description:
      "Convierte una intención en tareas que alguien puede tomar. Dos modos por contexto: redacta UNA tarea bien formada (historia, criterios en Given/When/Then, alcance y fuera de alcance), o descompone un problema grande en varias priorizadas por valor y coste, con las dependencias marcadas y lo descartado dicho en voz alta. Crea las tareas en ClickUp solo tras aprobación. NO escribe en el repo ni estima ni asigna: eso es gestión.",
    argumentHint: "[descripción de lo que se quiere construir, o el problema a resolver]",
  },
  start: {
    description:
      'Toma una tarea de ClickUp, crea la rama de trabajo desde develop y el esqueleto de estado tasks/<taskId>/ (spec.md + progress.md). Mueve la tarea a "in progress". NO planifica en detalle ni implementa código.',
    argumentHint:
      "[taskId de ClickUp (opcional: si se omite, lista las tareas en 'to do' para elegir)]",
  },
  plan: {
    description:
      "Completa tasks/<taskId>/spec.md con criterios de aceptación, alcance y enfoque técnico tras explorar el repo (vía grafo de conocimiento si graphify está disponible). Requiere aprobación antes de guardar. NO modifica código ni el estado de ClickUp.",
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
  },
  implement: {
    description:
      'Implementa la tarea siguiendo spec.md con TDD, criterio a criterio, y actualiza progress.md. Commits, push y PR solo con aprobación explícita. Mueve la tarea de ClickUp a "review" al crear la PR.',
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
  },
  review: {
    description:
      "Diagnóstico de los cambios de la rama frente a spec.md - cumplimiento de criterios, bugs, tests, convenciones, seguridad y usabilidad/accesibilidad/SEO (taxonomía ISO 25010), con análisis de impacto vía grafo de conocimiento si existe. SOLO informa - nunca modifica código, ficheros de estado ni ClickUp.",
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
    // OpenCode: ejecuta /review bajo el agente primario read-only `revisor` (su
    // `permission` BLOQUEA edición y todo bash salvo git/graphify de lectura). Es el
    // refuerzo equivalente —y más fuerte— al `allowed-tools` de Claude de abajo.
    opencodeAgent: "revisor",
    // Lista blanca de herramientas (solo Claude Code). OJO: `allowed-tools` en un
    // slash command NO es un sandbox duro — es PRE-APROBACIÓN de permisos (esas tools
    // corren sin prompt; otras seguirían el flujo normal de permisos). Aquí pre-autoriza
    // solo herramientas de lectura (privilegio mínimo), reforzando el contrato junto con
    // la prosa y las banderas rojas. El bloqueo DURO de solo-lectura lo dan los agentes
    // revisores (su campo `tools` SÍ es allowlist hard). `Agent` pre-autoriza despachar
    // esos subagentes; Bash queda acotado a git de lectura y consultas de grafo.
    allowedTools: [
      "Read",
      "Glob",
      "Grep",
      "Agent",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(git blame:*)",
      "Bash(git status:*)",
      "Bash(graphify query:*)",
      "Bash(graphify explain:*)",
      "Bash(graphify path:*)",
      "Bash(graphify --version:*)",
    ],
  },
  close: {
    description:
      'Valida el cumplimiento de los criterios de aceptación contra spec.md y, si están en verde, sella la salida de la tarea en progress.md y propone moverla a "complete" en ClickUp. Admite cierre por abandono. Solo escribe progress.md - nunca código ni spec.md.',
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
    // Pre-autoriza lectura y el despacho del subagente del gate. **Write/Edit quedan FUERA a
    // propósito.** `allowed-tools` no es un sandbox: es pre-aprobación, y lo que se lista corre
    // sin prompt. Listar Write aquí haría del comando que CIERRA el único del paquete que
    // escribe sin gate —más suelto que /implement, que toca código de producción y ni siquiera
    // declara el campo—. El sello de `progress.md` pasa por el permiso normal; el ámbito «solo
    // ese fichero» lo sostienen la prosa del comando y sus banderas rojas.
    allowedTools: [
      "Read",
      "Glob",
      "Grep",
      "Agent",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git status:*)",
      "Bash(gh pr view:*)",
    ],
  },
  // A petición y sin `allowed-tools` A PROPÓSITO. /review y /close lo declaran para
  // PRE-APROBAR lectura; todo lo que /setup escribe —CLAUDE.md, AGENTS.md, .gitignore— es
  // configuración compartida, y pre-aprobárselo le quitaría el prompt al único paso que lo
  // necesita. Sin el campo, cada escritura pasa por el flujo normal de permisos. Ningún otro comando lo sugiere: el
  // usuario eligió (01/10/2026) que no hubiera avisos automáticos.
  setup: {
    description:
      "Prepara un repo para trabajar con IA: comprueba si faltan CLAUDE.md (o AGENTS.md en OpenCode) y MEMORY.md, explica para qué sirve cada uno y los crea solo con aprobación. CLAUDE.md sale de lo verificado en el repo, no de una plantilla vacía; MEMORY.md es personal y se añade al .gitignore. Commit propio, aparte del código. NO toca código, tasks/ ni ClickUp.",
    argumentHint: "[sin argumentos]",
  },

  // voice. Sin allowed-tools: escriben ficheros de estado y pasan por el permiso normal.
  brief: {
    description:
      "Fija el encargo de un entregable de cliente: quién lo lee, qué decisión tiene que poder tomar, formato de salida, fuentes (repo opcional, documentos, reuniones) y qué queda fuera. Pregunta solo lo que no está en ninguna fuente y, con aprobación, crea entregables/<slug>/ con encargo.md y progress.md. NO escribe el plan ni redacta.",
    argumentHint: "[descripción del encargo, o taskId de ClickUp]",
    packages: ["voice"],
  },
  outline: {
    description:
      "Escribe plan.md de un entregable: índice y, por sección, qué cuenta, de qué fuente sale, qué afirmaciones hará y cómo se respaldan, y si lleva diagrama o tabla y por qué. Termina con la aprobación del plan (punto de control 1). NO redacta prosa.",
    argumentHint: "[slug del entregable (opcional: se infiere si solo hay uno vivo)]",
    packages: ["voice"],
  },
  draft: {
    description:
      "Redacta un entregable sección a sección contra plan.md, despachando un redactor por sección de uno en uno. Cada afirmación sobre el producto o el cliente va a afirmaciones.md con su respaldo; lo que no tiene respaldo se marca, no se inventa. Se retoma a medias. Si el plan ya no sirve, para y lo dice: NO reescribe el plan.",
    argumentHint: "[slug del entregable (opcional)] [identificador de sección para redactar solo esa]",
    packages: ["voice"],
  },
  deliver: {
    description:
      "Cierra un entregable. Modo entregar: comprueba siglas, despacha verificador-afirmaciones, enseña lo dudoso o sin respaldo, pide la firma del usuario (punto de control 2) y solo entonces exporta al formato del encargo y sella progress.md. Modo descartar: motivo en una línea, sello, nada exportado y la carpeta intacta.",
    argumentHint: "[slug del entregable (opcional)] [descartar]",
    packages: ["voice"],
  },
  // El coordinador. allowed-tools pre-aprueba solo lectura y el lanzamiento de fases; no
  // impide escribir (ADR-0008), así que el «no escribe» lo sostienen la prosa, el snippet
  // coordinador y las banderas rojas, y check-behavior vigila que no se pre-apruebe escritura.
  lead: {
    description:
      "Coordina el flujo de un entregable de voice sin escribir nada: lee entregables/, encargo.md y progress.md, diagnostica en una línea en qué punto está, propone la siguiente fase (/brief, /outline, /draft, /deliver) y la lanza con visto bueno. Entre /outline y /draft revisa el plan contra el encargo. NO redacta, NO edita, NO exporta y NO se salta los puntos de control de las fases.",
    argumentHint: "[slug del entregable, o descripción de un encargo nuevo]",
    allowedTools: ["Read", "Glob", "Grep", "Skill", "Bash(git status:*)", "Bash(git log:*)"],
    packages: ["voice"],
  },
};

// ---------------------------------------------------------------------------
// Agentes de plugin (solo Claude Code). Subagentes de solo-lectura que /review
// despacha por dimensión, cada uno con el modelo adecuado a su coste/complejidad
// (tiering, patrón del plugin oficial code-review). Su campo `tools` es una
// allowlist DURA: Read/Grep/Glob y nada más → no pueden modificar nada ni
// despachar otros agentes. OpenCode no recibe agentes: /review degrada al análisis
// en línea de las siete dimensiones.
// ---------------------------------------------------------------------------
const AGENTS = {
  "revisor-bugs-seguridad": {
    description:
      "Subagente de /review (solo-lectura) para las dimensiones de BUGS y SEGURIDAD. Despáchalo en paralelo desde /review para auditar errores lógicos, edge cases y fallos propios del paradigma del stack, y la seguridad con el marco OWASP Top 10 adaptado al stack detectado (control de acceso, inyección, exposición de datos al cliente, gestión de sesión/autenticación, mala configuración, dependencias vulnerables). Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "opus",
    tools: ["Read", "Grep", "Glob"],
  },
  "revisor-spec-tests": {
    description:
      "Subagente de /review (solo-lectura) para las dimensiones de CUMPLIMIENTO DE SPEC y TESTS. Despáchalo en paralelo desde /review para comprobar criterios de aceptación y la cobertura/calidad de los tests. Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob"],
  },
  // sonnet, no haiku: juzgar convenciones y olores exige LEER ficheros vecinos para deducir
  // el patrón vigente — es trabajo multi-turno, no transcripción. El modelo más barato gasta
  // 2-3× turnos en ese tipo de trabajo y acaba costando más (medición de superpowers/SDD,
  // «el número de turnos pesa más que el precio por token»; §2 de docs/referencias.md).
  "revisor-convenciones": {
    description:
      "Subagente de /review (solo-lectura) para la dimensión de CONVENCIONES y DEUDA TÉCNICA del repo. Despáchalo en paralelo desde /review para detectar desviaciones de patrones y fronteras ya establecidos (estructura, naming, estado, fetching, capas) y olores de código que el diff introduzca. Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob"],
  },
  "revisor-usabilidad-accesibilidad": {
    description:
      "Subagente de /review (solo-lectura) para la dimensión de USABILIDAD, ACCESIBILIDAD y SEO TÉCNICO (la primera es la característica «capacidad de interacción» de ISO 25010). Despáchalo en paralelo desde /review SOLO si el diff toca UI o rutas públicas: verifica lo revisable en código (títulos/estados, lenguaje del usuario, validación de formularios, mensajes de error útiles, alt/labels/semántica/teclado según WCAG; literales en duro si el repo ya tiene i18n; metadatos propios de ruta, canónica y redirección al mover una URL publicada); lo estético/visual y lo que exige rastreo real lo marca como evaluación manual. Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob"],
  },
  "revisor-entrega": {
    description:
      "Subagente de /review (solo-lectura) para la dimensión de ENTREGA Y OPERACIÓN. Despáchalo en paralelo desde /review SOLO si el diff toca esquema, configuración o variables de entorno, tareas programadas, manifiestos de despliegue o de CI, o una frontera que alguien ya consume: busca lo que no arranca en un entorno limpio, el orden que rompe la versión en curso durante el despliegue, el cambio que no vuelve atrás sin declararlo, la bandera sin fecha de retirada, la frontera nueva sin ninguna señal y el dato personal en un registro. Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob"],
  },
  "verificador-hallazgos": {
    description:
      "Verificador adversarial independiente de /review (solo-lectura). Despáchalo UNA vez tras recoger los hallazgos de los agentes por dimensión: intenta REFUTAR cada hallazgo contra el código y devuelve un veredicto (confirmado/refutado/dudoso) por hallazgo. Filtra falsos positivos antes del informe; no emite el veredicto final.",
    model: "opus",
    tools: ["Read", "Grep", "Glob"],
  },
  // opus a propósito: se despacha RARA vez —solo ante decisiones no triviales— y su único
  // trabajo es encontrar lo que el autor no vio. Abaratar el tier aquí es abaratar justo la
  // función por la que existe el agente, y encima sobre el volumen más pequeño del flujo.
  "refutador-decision": {
    description:
      "Revisor adversarial de contexto fresco para /implement (solo-lectura). Despáchalo EN VUELO, antes del gate de commit, cuando un criterio incluyó una decisión no trivial: ramificación nueva, cruce de frontera de módulo o servicio, una invariante que el compilador no puede verificar (orden, idempotencia, concurrencia, unicidad) o un efecto irreversible. Recibe ARTEFACTO (rutas) y CONTRATO (el criterio), NUNCA la conclusión de quien lo despacha. Devuelve solo problemas, con el caso concreto que los dispara; no valida ni emite veredicto.",
    model: "opus",
    tools: ["Read", "Grep", "Glob"],
  },
  "explorador-repo": {
    description:
      "Explorador de repositorio read-only para la Fase 3 de /plan. Despáchalo para mapear la estructura y el stack del proyecto (manifiesto, framework, paradigma), convenciones vigentes, ficheros candidatos y señales de riesgo, y devolver un mapa estructurado (TOON). No propone el plan ni escribe ficheros: el planificador razona el enfoque a partir de su mapa.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob"],
    packages: ["backbone", "voice"],
  },  // voice. sonnet: redactar una sección es multi-turno (leer plan, fuentes, escribir, apuntar
  // afirmaciones) y no es la función adversarial que justifica opus.
  redactor: {
    description:
      "Redactor de UNA sección de un entregable de voice, despachado por /draft de uno en uno. Recibe la carpeta del entregable y el identificador de sección; escribe esa sección en borrador.md siguiendo plan.md y apunta cada afirmación sobre el producto o el cliente en afirmaciones.md con su respaldo. No inventa respaldo: lo que no encuentra lo marca como compromiso sin respaldo. Solo toca borrador.md y afirmaciones.md.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob", "Write", "Edit"],
    packages: ["voice"],
  },
  // opus, como verificador-hallazgos: su única función es encontrar lo que el autor no vio, y
  // lo que tumba aquí es lo que el cliente leería como verdad.
  "verificador-afirmaciones": {
    description:
      "Verificador adversarial de un entregable de voice (solo-lectura), despachado UNA vez por /deliver antes de la firma. Intenta TUMBAR cada línea de afirmaciones.md contra su respaldo (código, cita del encargo) y comprueba que cada referencia del borrador se entiende sin abrir la fuente. Devuelve un veredicto por afirmación (sostenida/tumbada/dudosa); no firma ni exporta.",
    model: "opus",
    tools: ["Read", "Grep", "Glob"],
    packages: ["voice"],
  },

};

// ---------------------------------------------------------------------------
// Servidores MCP (fuente única). Se generan los ficheros de configuración de
// cada adaptador a partir de aquí para evitar drift entre herramientas.
// Las credenciales se leen de variables de entorno: el usuario las exporta una
// vez (CLICKUP_API_KEY, CLICKUP_TEAM_ID) y NO se versiona ningún secreto.
//
// Versión FIJADA a propósito, no `@latest`: `npx -y ...@latest` descarga y ejecuta
// lo último que haya en npm en el momento de arrancar, en la máquina del usuario y
// con su token de ClickUp delante. Si ese paquete se compromete, se ejecuta sin que
// nadie lo haya revisado. Fijar la versión hace que subirla sea una decisión visible
// (un commit), no un efecto silencioso de instalar el plugin.
// ---------------------------------------------------------------------------
const MCP_SERVERS = {
  clickup: {
    command: "npx",
    args: ["-y", "@taazkareem/clickup-mcp-server@0.14.5"],
    env: {
      CLICKUP_API_KEY: "${CLICKUP_API_KEY}",
      CLICKUP_TEAM_ID: "${CLICKUP_TEAM_ID}",
    },
  },
};

// Metadatos por guía. En Claude generan skills con `user-invocable: false`: eso SOLO las
// oculta del menú `/` (no son comandos accionables), pero siguen siendo AUTO-ACTIVABLES por
// el modelo a partir de su `description` — no ponemos `disable-model-invocation`. Por eso el
// `description` = CUÁNDO usar la guía, NUNCA qué contiene. Es el disparador ambiental que
// decide si la guía se carga sin que un comando la referencie — y, si resume el contenido,
// el agente sigue el resumen y NO abre la guía (hallazgo medido de superpowers/writing-skills,
// §2 de docs/referencias.md). Por eso: abrir con "Úsala cuando/al/en…", nombrar SÍNTOMAS
// buscables, y ≤ 500 caracteres (aseverado en check-behavior.mjs).
// (revision-hallazgos se mantiene con disparador acotado a /review a propósito: es una
// subrutina interna, no conocimiento ambiental.)
// core/guides/in-progress/ es el bucket de BORRADORES: lo que vive ahí no se registra
// aquí, no genera skill y no se envía. Promover = mover el fichero Y añadirlo a este
// registro; si se hace solo lo segundo, este script falla al no encontrar el .md — que
// es el fallo que queremos, porque el silencioso sería publicar un borrador.
const GUIDES = {
  "estados-tareas": {
    description:
      "Úsala cuando necesites interpretar en qué punto del ciclo está una tarea de ClickUp, decidir qué comando del flujo sugerir al usuario, o validar una transición de estado antes de proponerla.",
  },
  "registro-progreso": {
    description:
      "Úsala SIEMPRE que vayas a registrar el avance de una tarea, apuntar dónde te has quedado, crear su fichero de estado inicial o actualizar su estado actual — al cerrar cualquier fase del flujo (plan, implement, corrección, review). Es lo que permite que un agente en sesión limpia recupere el contexto.",
    packages: ["backbone", "voice"],
  },
  "escritura-natural": {
    description:
      "Úsala al redactar un texto que va a leer una persona — el cuerpo de una PR, un hilo de code review, el comentario de ClickUp, el resumen de cierre, el changelog o un mensaje de Slack. Síntomas: el borrador arranca con un preámbulo, suena a robot, se alarga sin decidir nada, o junta dos asuntos que se contestan por separado. También al señalar el trabajo de otra persona.",
    packages: ["backbone", "voice"],
  },
  "grafo-conocimiento": {
    description:
      "Úsala cuando necesites entender la estructura de un repo que no conoces, localizar las áreas que una tarea va a tocar, o analizar el impacto de un cambio sobre sus consumidores, antes de ponerte a leer ficheros crudos. Síntoma extra: vas a pedir el contenido completo de una lista (nodos, tareas, ficheros) sin haberla filtrado antes.",
    packages: ["backbone", "voice"],
  },
  "formato-toon": {
    description:
      "Úsala siempre que vayas a devolver listas largas de datos uniformes, varias rutas del grafo, esquemas de base de datos o cualquier salida estructural repetitiva, en lugar de JSON o YAML. Síntomas: vas a volcar decenas de filas o de registros de una tabla; la salida tendría las mismas claves repetidas en cada elemento y gastaría tokens de más.",
    packages: ["backbone", "voice"],
  },
  "evidencia-y-preguntas": {
    description:
      "Úsala siempre que vayas a escribir un dato que no has comprobado —en spec.md, en progress.md o en un informe— y para decidir si un hueco se verifica, se asume declarándolo, o se pregunta al usuario. Síntomas: te oyes decir «seguro que usan X», «debería funcionar» o «ya se corregirá»; vas a preguntar algo que está en el repo; das por bueno lo que afirma progress.md o un subagente sin abrir el código.",
    packages: ["backbone", "voice"],
  },
  "revision-hallazgos": {
    description:
      "Úsala en /review y en los subagentes revisores, antes de reportar cualquier hallazgo. Síntomas de que la necesitas: dudas de si algo es un defecto real o un nitpick, si ya lo pillaría el linter, si ya estaba roto antes de tu cambio, o si merece bloquear una PR.",
  },
  "historias-usuario": {
    description:
      "Úsala al definir los criterios de aceptación de una tarea en /plan, al diseñar sus casos de prueba, y siempre que redactes o revises una historia de usuario o su trazabilidad con el proceso de negocio. Síntomas: criterios vagos o no verificables, casos de prueba elegidos a ojo, un requisito sin rol ni valor claros.",
  },
  "codigo-limpio": {
    description:
      "Úsala en el paso de refactor del ciclo TDD de /implement (con la suite en verde, antes de cerrar el criterio) y al juzgar deuda técnica en /review. Síntomas: método o clase que ha crecido, código duplicado, condicional anidada, nombres que no dicen lo que hacen, números mágicos.",
  },
  "patrones-diseno": {
    description:
      "Úsala al razonar el enfoque técnico en /plan y al valorar si introducir una abstracción durante el refactor de /implement. Síntomas: estás a punto de meter una fábrica, una estrategia o un singleton; te oyes decir «por si escala» o «así queda más extensible».",
  },
  "niveles-y-tipos-de-prueba": {
    description:
      "Úsala al definir la estrategia de pruebas de una tarea en /plan y al elegir a qué nivel y con qué runner escribir cada test en /implement. Síntomas: no sabes si esto es unidad, componente, integración o E2E; el test necesita levantar medio sistema; sospechas que un test pasa sin verificar nada real.",
  },
  "calidad-producto": {
    description:
      "Úsala al fijar los requisitos no funcionales de una tarea en /plan y al etiquetar un hallazgo de /review con vocabulario estándar. Síntomas: un requisito de «rendimiento», «seguridad» o «usabilidad» sin criterio medible, o un hallazgo que no sabes en qué dimensión de calidad cae. Taxonomía ISO/IEC 25010.",
  },
  "rendimiento": {
    description:
      "Úsala al fijar un requisito de rendimiento en /plan y al juzgar el coste de ejecución de un cambio en /implement y /review. Síntomas: una consulta dentro de un bucle, una lista sin paginar sobre una tabla que crece, llamadas en serie que podrían ir a la vez, vas a declarar una clave foránea o a filtrar por una columna sin índice, una pantalla que tarda desde que crecieron los datos, «con los datos de ahora va bien», o te oyes optimizar algo que no has medido.",
  },
  "coste-y-estructuras": {
    description:
      "Úsala al derivar de un volumen la complejidad admisible en /plan, al elegir la estructura de datos de código nuevo en /implement, y al juzgar la clase de coste de un cambio en /review. Síntomas: un bucle dentro de otro sobre dos colecciones que crecen, una búsqueda lineal repetida donde cabía un índice por clave, no sabes cuánto aguanta antes de ponerse lento ni si algo es O(n) o O(n²), vas a escribir a mano una estructura que el motor de datos ya hace, o un umbral sin volumen detrás.",
  },
  "llamadas-a-modelos": {
    description:
      "Úsala cuando el código que escribes o revisas llame a un modelo de lenguaje: qué modelo para cada tarea, cómo ordenar el prompt para que el caché acierte, y si alguien espera la respuesta o puede irse a un lote. Síntomas: la factura de la API sube y no sabes por qué llamada; reenvías el documento en cada pregunta; dudas entre el modelo barato y el bueno; el caché nunca acierta; vas a apagar el pensamiento para ahorrar; vas a escribir de memoria un precio o un nombre de modelo.",
  },
  "ingenieria-de-prompts": {
    description:
      "Úsala al escribir o revisar el prompt que recibe un modelo de lenguaje, en el código del producto o en un agente propio: qué le dices, cómo lo estructuras y qué formato te devuelve. Síntomas: no consigues el formato que quieres; no te hace caso y vas cambiando la redacción a ver si suena; pegas el texto del usuario entre tus instrucciones; media biografía de personaje en el rol; no sabes cuántos ejemplos poner; subes el tono a mayúsculas para que obedezca.",
  },
  "usabilidad-accesibilidad": {
    description:
      "Úsala cuando el trabajo toque interfaz o una ruta pública: criterios de aceptación de UI en /plan, tests de componente en /implement y la dimensión 6 de /review. Síntomas: formularios sin validación o sin mensajes útiles, imágenes sin alt, controles no alcanzables por teclado, texto en duro en un repo traducido, una ruta nueva sin metadatos propios, o una URL publicada que se mueve sin redirección. Nielsen + WCAG 2.2 + SEO técnico.",
    packages: ["backbone", "voice"],
  },
  "arquitectura": {
    description:
      "Úsala al decidir dónde debe vivir el código nuevo y si una frontera está justificada (enfoque técnico de /plan), y al comprobar en /review que un cambio respeta las capas, el bounded context y los contratos de API vigentes. Síntomas: lógica de dominio filtrándose a la UI, un módulo saltándose la frontera de otro, vas a crear o cambiar un endpoint, una operación larga o masiva metida dentro de una petición-respuesta, o la tentación de partir en servicios «por si escala».",
  },
  "consultas-correctas": {
    description:
      "Úsala al escribir o revisar cualquier consulta SQL: al fijar en /plan qué debe pasar con los casos vacíos, al escribirla en /implement y al revisar el diff en /review. Síntomas: un LEFT JOIN con una condición de la tabla derecha en el WHERE, una agregación sobre un join uno-a-muchos, un NOT IN contra una subconsulta que admite nulos, un total que no cuadra entre dos informes o que se duplica, un efecto irreversible dentro de una transacción, o lógica de negocio en un trigger.",
  },
  "migraciones-de-datos": {
    description:
      "Úsala en cuanto una tarea toque el esquema o los datos que ya existen: columnas, tablas, índices, renombrados o rellenos masivos. Síntomas: vas a escribir una migración sin su reverso, un borrado o una actualización sin condición, una columna obligatoria sobre una tabla con filas, o vas a editar una migración ya aplicada. El código se revierte; los datos no.",
  },
  "depuracion-sistematica": {
    description:
      "Úsala ante cualquier bug, test que falla o comportamiento inesperado, ANTES de proponer un arreglo — incluido el modo corrección de /implement. Síntomas de que la necesitas: «pruebo a cambiar esto a ver qué pasa», llevas horas atascado sin avanzar, llevas dos o más arreglos fallidos, cada arreglo destapa un problema nuevo, no sabes explicar por qué falla, o el propio mensaje de error te está sugiriendo un comando que ejecutar.",
  },
  "recepcion-de-revision": {
    description:
      "Úsala al recibir hallazgos de una revisión —informe de /review, comentarios de un humano en la PR, avisos de CI— antes de tocar código. Síntomas: te oyes decir «tienes toda la razón», vas a implementar sin comprobarlo contra el repo, o hay puntos que no entiendes y piensas empezar por los que sí.",
  },
  "qa-exploratoria": {
    description:
      "Úsala tras implementar criterios que tocan interfaz y antes de pedir revisión humana, o cuando el cambio afecte a un flujo de usuario completo. Síntomas: los tests pasan pero nadie ha abierto la aplicación; hay que evaluar estética, contraste o jerarquía visual, que no se verifican desde un diff; o vas a automatizar el navegador y ejecutar JavaScript en la página.",
  },
  "diagramas": {
    description:
      "Úsala cuando vayas a dibujar un diagrama, a enseñar el recorrido de un flujo, o a decidir si hace falta: prueba visual de una pull request, documentación en el repo, una arquitectura. Síntomas: pegaste HTML o SVG en el comentario de una pull request y sale un hueco en blanco, o Mermaid en ClickUp; el dibujo ya no cabe de un vistazo y lo aprietas; no has decidido a qué altura dibujas; no lleva título ni leyenda; destacas seis cosas; o pintas una caja que no has comprobado en el código.",
    packages: ["backbone", "voice"],
  },
  "espacio-de-trabajo-aislado": {
    description:
      "Úsala al empezar una tarea que conviene aislar del trabajo en curso, o antes de crear un worktree de git. Síntomas: el usuario tiene cambios abiertos en otra rama, quieres revisar una PR sin abandonar lo que implementas, o vas a escribir `git worktree add` sin haber comprobado si ya estás dentro de un worktree.",
    packages: ["backbone", "voice"],
  },
  "entrega-y-despliegue": {
    description:
      "Úsala al decidir cómo sale un cambio a producción al mergear o desplegar: el orden respecto a una migración, la bandera de funcionalidad, la vuelta atrás y la ventana de vigilancia posterior. Síntomas: dices «si va mal, revertimos» sin comprobar que el redespliegue deshaga nada; juntas dos cambios en un mismo despliegue; una variable de entorno vive solo en tu máquina; una bandera se queda sin fecha de retirada.",
  },
  "valor-y-prioridad": {
    description:
      "Úsala al elegir qué entra y qué se queda fuera, o cuando el alcance crezca a mitad de algo. Síntomas: en la lista todo es prioritario o urgente; aparece un «ya que estamos»; alguien propone meter más gente para llegar a la fecha; se defiende terminar algo porque ya se empezó; o se llama MVP a un producto hecho con prisa.",
  },
  "modelado-de-negocio": {
    description:
      "Úsala cuando un flujo de negocio tenga estados y transiciones, varios actores, o un término que cada persona llama distinto. Síntomas: no sabes si el pedido se registra antes o después de validarse; un campo «estado» tiene valores sin lista ni transiciones; en sala lo llaman de una forma y en el código de otra.",
  },
  "deuda-tecnica": {
    description:
      "Úsala al decidir si un atajo se contrae a sabiendas, se paga ahora o se aplaza con su señal de cobro. Síntomas: dudas entre hacerlo rápido y sucio o hacerlo bien; te oyes decir «ya lo refactorizamos más adelante»; el arreglo correcto es más grande que la tarea y hay una fecha encima; vas a limpiar de paso un módulo que esta tarea no pedía.",
  },
  "proteccion-de-datos": {
    description:
      "Úsala al decidir qué dato personal se recoge, cuánto se retiene, quién lo consulta y qué queda auditado. Síntomas: vas a añadir un «observaciones» de texto libre donde puede acabar una alergia; nadie ha dicho cuántos meses se guarda; hay salud o discapacidad de por medio; te bajas un volcado de producción al portátil; o el correo del cliente acaba dentro de un log.",
  },
  "incidente-en-produccion": {
    description:
      "Úsala cuando se haya caído algo en producción ahora mismo y haya usuarios sufriéndolo. Síntomas: vas a reiniciar el servidor antes de guardar el error; te piden saltarte un gate porque urge; has apagado la bandera y das el incidente por cerrado; o cambias tres cosas a la vez a ver cuál lo arregla.",
  },
  "observabilidad": {
    description:
      "Úsala al decidir qué log, qué métrica, qué traza o qué alerta acompañan a una frontera nueva —endpoint, tarea programada, integración con un tercero— y con qué umbral. Síntomas: de una caída se entera antes el cliente que vosotros; un catch vacío; un cron o proceso que corre cada noche deja de dispararse sin dar error; una alerta que nadie atiende; un log sin identificador con el que correlacionar la petición que falló.",
  },
};

// ---------------------------------------------------------------------------
// Emisión segura de escalares YAML
// ---------------------------------------------------------------------------
/**
 * Devuelve `value` como escalar YAML entrecomillado.
 *
 * Imprescindible para `description`: un escalar PLANO (sin comillas) no puede
 * contener «: » — YAML lo lee como un mapa anidado y **falla el parseo del
 * frontmatter entero**. Cuando eso pasa, el harness carga la skill con metadatos
 * VACÍOS: se pierden `name`, `description` y `user-invocable` en silencio, así que
 * la guía deja de auto-activarse y nadie se entera. Nuestras descripciones llevan
 * «: » de forma natural («Síntomas: …»), así que van siempre entrecomilladas.
 * Verificado con `claude plugin validate --strict`.
 */
function yamlString(value) {
  return '"' + String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

// ---------------------------------------------------------------------------
// Scripts ejecutables que viajan DENTRO del plugin.
//
// Son la excepción a «scripts/ es del mantenedor»: estos se ejecutan en el repo del
// usuario, así que se copian tal cual a los dos adaptadores y se referencian con el
// token {{script:nombre}}, que cada adaptador resuelve a su ruta.
//
// El motivo de que sean código y no prosa está en la cabecera de cada uno: un patrón
// que el agente reconstruye en cada ejecución no se puede probar, y uno que no casa no
// casca — devuelve cero y eso es indistinguible de un diff limpio.
// ---------------------------------------------------------------------------
const SCRIPTS = {
  "suelo-calidad": {},
  "fusion-hallazgos": {},
  "frescura-revision": {},
  entorno: {},
  // lo ejecuta /deliver de voice antes de pedir la firma
  siglas: { packages: ["voice"] },
};

// ---------------------------------------------------------------------------
// Plantillas: los ficheros que /setup copia al repo del usuario (CLAUDE.md, AGENTS.md y
// MEMORY.md). Quinta clase de generado, con el mismo trato que los scripts: se copian
// BYTE A BYTE, porque su texto va a parar al repo de otra persona tal cual.
//
// Llevan el sufijo .example en todas partes, también en core/: un CLAUDE.md sin sufijo
// dentro de core/templates/ lo cargaría Claude Code como instrucciones al trabajar en esa
// carpeta, y un AGENTS.md lo leería OpenCode. Una plantilla no es una instrucción.
// ---------------------------------------------------------------------------
const TEMPLATES = ["CLAUDE.md", "AGENTS.md", "MEMORY.md"];

// ---------------------------------------------------------------------------
// Snippets: prosa canónica que vive en UN sitio y se renderiza en varios.
//
// {{guide:x}} es una REFERENCIA (apunta a otro fichero); {{snippet:x}} es una
// INSERCIÓN (el texto entra tal cual). La diferencia importa: una regla que los cinco
// comandos tienen que cumplir igual no puede vivir como referencia —el agente tendría
// que ir a buscarla— ni copiada a mano en cinco sitios, que es como empiezan a
// divergir. Se escribe una vez en core/snippets/ y sync.mjs la reparte.
//
// No hay registro explícito porque no hay metadatos que declarar: el fichero existe o
// la generación casca con su nombre. Y el token va SOLO en su línea, sin sangrar: un
// bloque multilínea insertado a media frase o dentro de un `-` rompe el markdown de
// formas que nadie mira hasta que el agente lee mal la regla.
// ---------------------------------------------------------------------------
function snippet(name) {
  const p = join(ROOT, "core/snippets", name + ".md");
  if (!existsSync(p)) throw new Error("Snippet desconocido en token: " + name);
  return readFileSync(p, "utf8").trimEnd();
}

// ---------------------------------------------------------------------------
// Resolución de referencias {{guide:x}} por adaptador
// ---------------------------------------------------------------------------
const ADAPTERS = {
  claude: (pkg) => ({
    managedDirs: ["commands", "skills", "agents", "scripts", "templates"].map((d) =>
      join(ROOT, "plugins", pkg, "claude", d),
    ),
    guideRef: (name) =>
      "`" + name + "` (`${CLAUDE_PLUGIN_ROOT}/skills/" + name + "/SKILL.md`)",
    // Referencia a una guía de otro paquete, desde una guía compartida: se nombra sin ruta,
    // porque la ruta no existiría en este plugin.
    foreignGuideRef: (name, owner) =>
      "`" + name + "` (guía de " + owner + ", no incluida en este plugin)",
    // Claude Code expande ${CLAUDE_PLUGIN_ROOT} al ejecutar el comando.
    scriptRef: (name) => "${CLAUDE_PLUGIN_ROOT}/scripts/" + name + ".mjs",
    scriptPath: (name) => join(ROOT, "plugins", pkg, "claude/scripts", name + ".mjs"),
    templateRef: (name) => "${CLAUDE_PLUGIN_ROOT}/templates/" + name + ".example",
    templatePath: (name) => join(ROOT, "plugins", pkg, "claude/templates", name + ".example"),
    commandPath: (name) => join(ROOT, "plugins", pkg, "claude/commands", name + ".md"),
    guidePath: (name) => join(ROOT, "plugins", pkg, "claude/skills", name, "SKILL.md"),
    agentPath: (name) => join(ROOT, "plugins", pkg, "claude/agents", name + ".md"),
    commandFrontmatter: (meta) => {
      const lines = [
        "---",
        "description: " + yamlString(meta.description),
        "argument-hint: " + yamlString(meta.argumentHint),
      ];
      // allowed-tools es frontmatter propio de Claude Code; solo se emite si el
      // comando lo declara (p. ej. /review, que es solo-lectura).
      if (meta.allowedTools && meta.allowedTools.length) {
        lines.push("allowed-tools: " + meta.allowedTools.join(", "));
      }
      lines.push("---", "");
      return lines.join("\n");
    },
    guideFrontmatter: (name, meta) =>
      [
        "---",
        "name: " + name,
        "description: " + yamlString(meta.description),
        "user-invocable: false",
        // §4 de docs/referencias.md: declarar la licencia a nivel de skill. El paquete es
        // MIT; sin este campo, una skill extraída del plugin viaja sin licencia.
        "license: MIT",
        "---",
        "",
      ].join("\n"),
    // Agentes: solo el adaptador Claude los define. `tools` es la allowlist DURA
    // (read-only) y `model` fija el tier (opus/sonnet/haiku).
    agentFrontmatter: (name, meta) =>
      [
        "---",
        "name: " + name,
        "description: " + yamlString(meta.description),
        "tools: " + meta.tools.join(", "),
        "model: " + meta.model,
        "---",
        "",
      ].join("\n"),
  }),
  opencode: (pkg) => ({
    managedDirs: ["command", "skills", "agent", "scripts", "templates"].map((d) =>
      join(ROOT, "plugins", pkg, "opencode/.opencode", d),
    ),
    // Las guías se generan como SKILL.md (skills de OpenCode): el modelo las
    // auto-activa por su `description` vía la herramienta `skill`, igual que en
    // Claude. Por eso la referencia cruzada es por NOMBRE, no por ruta.
    guideRef: (name) => "`" + name + "` (skill de OpenCode, auto-activable)",
    // Referencia a una guía de otro paquete, desde una guía compartida: se nombra sin ruta,
    // porque la ruta no existiría en este plugin.
    foreignGuideRef: (name, owner) =>
      "`" + name + "` (guía de " + owner + ", no incluida en este plugin)",
    // El consumidor copia `.opencode/` a la raíz del repo, que es su cwd.
    scriptRef: (name) => ".opencode/scripts/" + name + ".mjs",
    templateRef: (name) => ".opencode/templates/" + name + ".example",
    templatePath: (name) =>
      join(ROOT, "plugins", pkg, "opencode/.opencode/templates", name + ".example"),
    scriptPath: (name) =>
      join(ROOT, "plugins", pkg, "opencode/.opencode/scripts", name + ".mjs"),
    commandPath: (name) =>
      join(ROOT, "plugins", pkg, "opencode/.opencode/command", name + ".md"),
    // Skills: <repo>/.opencode/skills/<name>/SKILL.md (OpenCode requiere el plural).
    guidePath: (name) =>
      join(ROOT, "plugins", pkg, "opencode/.opencode/skills", name, "SKILL.md"),
    // Subagentes: <repo>/.opencode/agent/<name>.md (el loader acepta singular y plural).
    agentPath: (name) =>
      join(ROOT, "plugins", pkg, "opencode/.opencode/agent", name + ".md"),
    commandFrontmatter: (meta) => {
      const lines = [
        "---",
        "description: " + yamlString(meta.description + " Uso: " + meta.argumentHint),
      ];
      // Comandos read-only (p. ej. /review) se ejecutan bajo un agente primario
      // cuyo `permission` bloquea de verdad la escritura (ver agente `revisor`).
      if (meta.opencodeAgent) lines.push("agent: " + meta.opencodeAgent);
      lines.push("---", "");
      return lines.join("\n");
    },
    // Guías → skills: frontmatter mínimo (name + description). El `name` debe
    // casar el nombre del directorio y el patrón ^[a-z0-9]+(-[a-z0-9]+)*$.
    guideFrontmatter: (name, meta) =>
      [
        "---",
        "name: " + name,
        "description: " + yamlString(meta.description),
        "---",
        "",
      ].join("\n"),
    // Subagentes read-only DURO: en OpenCode `permission` es un bloqueo real (no
    // pre-aprobación). edit/bash/webfetch/websearch/task = deny equivale al
    // `tools: [Read, Grep, Glob]` de Claude (read/grep/glob/list siguen permitidos
    // por defecto). `model` se omite a propósito: hereda el de la sesión (portable
    // entre proveedores; el tiering opcional se documenta en docs/opencode-integracion.md).
    agentFrontmatter: (name, meta) =>
      [
        "---",
        "description: " + yamlString(meta.description),
        "mode: subagent",
        "permission:",
        "  edit: deny",
        "  bash: deny",
        "  webfetch: deny",
        "  websearch: deny",
        "  task: deny",
        "---",
        "",
      ].join("\n"),
  }),
};

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------
function substitute(text, A, pkg, { strict }) {
  // Los snippets se expanden ANTES que guide/script: así un snippet puede referenciar
  // una guía y el token de dentro se resuelve en la misma pasada.
  const conSnippets = text.replace(/^\{\{snippet:([a-z-]+)\}\}$/gm, (_, name) =>
    snippet(name),
  );
  // Lo que quede es un token mal colocado (sangrado, o a media línea). Casca aquí en vez
  // de publicar una llave doble donde el agente esperaba una regla.
  const suelto = /\{\{snippet:([a-z-]+)\}\}/.exec(conSnippets);
  if (suelto) {
    throw new Error(
      "Token {{snippet:" + suelto[1] + "}} mal colocado: va solo en su línea y sin sangrar.",
    );
  }
  return conSnippets
    .replace(/\{\{guide:([a-z-]+)\}\}/g, (_, name) => {
      if (!GUIDES[name]) throw new Error("Guía desconocida en token: " + name);
      if (pkgsOf(GUIDES[name]).includes(pkg)) return A.guideRef(name);
      // Un comando o un agente de este paquete no puede depender de una guía que no viaja con
      // él: es un error de quien lo escribe. Una guía compartida sí puede mencionarla.
      if (strict) throw new Error(`La guía ${name} no está en el paquete ${pkg}`);
      return A.foreignGuideRef(name, pkgsOf(GUIDES[name])[0]);
    })
    .replace(/\{\{script:([a-z-]+)\}\}/g, (_, name) => {
      if (!SCRIPTS[name]) throw new Error("Script desconocido en token: " + name);
      if (!pkgsOf(SCRIPTS[name]).includes(pkg)) {
        throw new Error(`El script ${name} no está en el paquete ${pkg}`);
      }
      return A.scriptRef(name);
    })
    .replace(/\{\{template:([A-Za-z.-]+)\}\}/g, (_, name) => {
      if (!TEMPLATES.includes(name)) throw new Error("Plantilla desconocida en token: " + name);
      if (pkg !== "backbone") throw new Error(`Las plantillas solo existen en backbone`);
      return A.templateRef(name);
    });
}

// Toda escritura pasa por emit(): así sync.mjs sabe qué ha generado en esta pasada y, al
// final, puede borrar lo que hay en sus directorios y ya no sale de core/. Sin esto, un
// comando retirado deja su fichero generado para siempre y sync-check no lo ve, porque solo
// compara ficheros que existen (pasó al retirar /ship).
let written = 0;
const generated = new Set();
function emit(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  generated.add(resolve(path));
  written++;
}
const adapters = [];
for (const [pkg, P] of Object.entries(PACKAGES)) {
  for (const adapterName of P.adapters) {
    const A = ADAPTERS[adapterName](pkg);
    adapters.push(A);
    const inPkg = (meta) => pkgsOf(meta).includes(pkg);

    for (const [name, meta] of Object.entries(COMMANDS)) {
      if (!inPkg(meta)) continue;
      const body = readFileSync(join(ROOT, "core/workflows", name + ".md"), "utf8");
      const out = A.commandFrontmatter(meta) + substitute(body, A, pkg, { strict: true });
      emit(A.commandPath(name), out);
    }

    // Los scripts se copian BYTE A BYTE: no llevan tokens ni frontmatter, y una
    // sustitución sobre código sería una forma nueva de romperlo en silencio.
    for (const [name, meta] of Object.entries(SCRIPTS)) {
      if (!inPkg(meta)) continue;
      const body = readFileSync(join(ROOT, "core/scripts", name + ".mjs"), "utf8");
      emit(A.scriptPath(name), body);
    }

    if (pkg === "backbone") {
      for (const name of TEMPLATES) {
        const body = readFileSync(join(ROOT, "core/templates", name + ".example"), "utf8");
        emit(A.templatePath(name), body);
      }
    }

    for (const [name, meta] of Object.entries(GUIDES)) {
      if (!inPkg(meta)) continue;
      const body = readFileSync(join(ROOT, "core/guides", name + ".md"), "utf8");
      const out = A.guideFrontmatter(name, meta) + substitute(body, A, pkg, { strict: false });
      emit(A.guidePath(name), out);
    }

    // Agentes: solo los adaptadores que los soporten (hoy, Claude Code). OpenCode no
    // define agentPath → se omite y /review degrada al análisis en línea.
    if (A.agentPath) {
      for (const [name, meta] of Object.entries(AGENTS)) {
        if (!inPkg(meta)) continue;
        const body = readFileSync(join(ROOT, "core/agents", name + ".md"), "utf8");
        const out = A.agentFrontmatter(name, meta) + substitute(body, A, pkg, { strict: true });
        emit(A.agentPath(name), out);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// .mcp.json del adaptador Claude: se sirve EN LA RAÍZ DEL PLUGIN para que Claude
// Code lo auto-registre al instalarlo (no hay que copiar nada a mano por repo).
// Claude Code expande ${VAR} desde el entorno al cargar el fichero.
// ---------------------------------------------------------------------------
const claudeMcp = JSON.stringify({ mcpServers: MCP_SERVERS }, null, 2) + "\n";
const claudeMcpPath = join(ROOT, "plugins/backbone/claude/.mcp.json");
emit(claudeMcpPath, claudeMcp);

// ---------------------------------------------------------------------------
// OpenCode: artefactos que NO salen de core/ (glue específico del adaptador).
// ---------------------------------------------------------------------------

// (a) Agente primario `revisor`: ejecuta /review en modo read-only DURO. A
// diferencia de Claude (donde `allowed-tools` es pre-aprobación, no sandbox), aquí
// `permission` BLOQUEA de verdad: deny a edición y a todo bash salvo git y graphify
// de LECTURA (mismo perímetro que el allowed-tools de /review en Claude). En
// `permission.bash` gana la última regla que coincide, así que el catch-all "*": deny
// va primero y las excepciones de lectura después.
const opencodeRevisor =
  [
    "---",
    "description: " +
      yamlString(
        "Agente de revisión read-only del flujo. Ejecuta /review: solo diagnostica, nunca modifica código, ficheros de estado ni ClickUp."
      ),
    "mode: primary",
    "permission:",
    "  edit: deny",
    "  webfetch: deny",
    "  websearch: deny",
    "  bash:",
    '    "*": deny',
    '    "git diff*": allow',
    '    "git log*": allow',
    '    "git show*": allow',
    '    "git blame*": allow',
    '    "git status*": allow',
    '    "graphify query*": allow',
    '    "graphify explain*": allow',
    '    "graphify path*": allow',
    '    "graphify --version*": allow',
    // Los scripts del plugin que /review ejecuta (Fase 2 el escaneo del suelo, Fase 4.1
    // la fusión de hallazgos) son deterministas y de solo lectura. Aquí el permiso SÍ
    // puede acotarse al script exacto, cosa que el `allowed-tools` de Claude no sabe
    // expresar (ADR 0008): allí el comando lo ejecuta y el usuario aprueba una vez, como
    // con el sello de /close.
    //
    // Se emiten las dos formas —con y sin comillas— porque la prosa del comando invoca
    // `node "<ruta>"` (las comillas hacen falta en Claude, donde CLAUDE_PLUGIN_ROOT puede
    // llevar espacios) y un glob sin ellas no casaría con el comando real. Un permiso que
    // no casa no falla ruidosamente: cae al catch-all `"*": deny` y el script no corre.
    ...Object.keys(SCRIPTS).filter((n) => pkgsOf(SCRIPTS[n]).includes("backbone")).flatMap((name) => [
      `    "node .opencode/scripts/${name}.mjs*": allow`,
      `    'node ".opencode/scripts/${name}.mjs"*': allow`,
    ]),
    "---",
    "",
    "Eres el agente de **revisión read-only** del flujo de desarrollo. Tu única función es",
    "ejecutar el comando `/review`: diagnosticar los cambios frente a `spec.md` y reportar.",
    "Tu contrato es estricto: **solo informas**. No editas ficheros, no commiteas, no haces",
    "push, no cambias estados en ClickUp. Solo puedes leer y ejecutar git/graphify de lectura;",
    "el resto de bash está bloqueado por tu `permission`.",
    "",
    "Despacha en paralelo los subagentes revisores read-only (`revisor-bugs-seguridad`,",
    "`revisor-spec-tests`, `revisor-convenciones`) y, tras sintetizar, el `verificador-hallazgos`,",
    "tal como detalla el comando `/review`. Si el usuario quiere corregir algo tras tu informe,",
    "lo pedirá explícitamente con `/implement` (que detecta el modo corrección).",
    "",
  ].join("\n");
const opencodeRevisorPath = join(ROOT, "plugins/backbone/opencode/.opencode/agent/revisor.md");
emit(opencodeRevisorPath, opencodeRevisor);

// (b) opencode.json del adaptador, desde la MISMA fuente MCP_SERVERS (evita drift con
// el .mcp.json de Claude). OpenCode lee `<repo>/.opencode/opencode.json`, así que el
// consumidor solo copia la carpeta `.opencode/` y queda configurado. Sin secretos
// versionados: se traduce `${VAR}` (Claude) → `{env:VAR}` (sustitución de OpenCode).
const opencodeMcp = Object.fromEntries(
  Object.entries(MCP_SERVERS).map(([name, s]) => [
    name,
    {
      type: "local",
      command: [s.command, ...s.args],
      environment: Object.fromEntries(
        Object.entries(s.env).map(([k, v]) => [
          k,
          v.replace(/^\$\{(\w+)\}$/, "{env:$1}"),
        ])
      ),
    },
  ])
);
const opencodeConfig =
  JSON.stringify(
    { $schema: "https://opencode.ai/config.json", mcp: opencodeMcp },
    null,
    2
  ) + "\n";
const opencodeConfigPath = join(ROOT, "plugins/backbone/opencode/.opencode/opencode.json");
emit(opencodeConfigPath, opencodeConfig);

// (c) Limpieza: las guías ahora son skills (.opencode/skills/). Borra el directorio
// antiguo de Markdown plano si quedó de una generación previa, para no dejar copias
// obsoletas que el consumidor pudiera arrastrar.
const legacyGuidesDir = join(ROOT, "plugins/backbone/opencode/.opencode/guides");
if (existsSync(legacyGuidesDir)) rmSync(legacyGuidesDir, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// Poda: lo que hay en un directorio poseído y no se ha generado en esta pasada es un
// huérfano de algo que salió de core/. Solo se poda dentro de managedDirs: hooks/, evals/ y
// el manifiesto se editan a mano y quedan fuera por construcción.
// ---------------------------------------------------------------------------
function prune(dir) {
  if (!existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of readdirSync(dir)) {
    const p = resolve(join(dir, entry));
    if (statSync(p).isDirectory()) {
      removed += prune(p);
      if (readdirSync(p).length === 0) rmSync(p, { recursive: true });
    } else if (!generated.has(p)) {
      rmSync(p);
      removed++;
    }
  }
  return removed;
}
let pruned = 0;
for (const A of adapters) for (const d of A.managedDirs) pruned += prune(d);

console.log("sync.mjs: " + written + " ficheros generados desde core/" + (pruned ? ", " + pruned + " huérfanos borrados." : "."));
