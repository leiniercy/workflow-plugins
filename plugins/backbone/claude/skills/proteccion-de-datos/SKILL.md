---
name: proteccion-de-datos
description: "Úsala al decidir qué dato personal se recoge, cuánto se retiene, quién lo consulta y qué queda auditado, y en cuanto alguien pegue datos personales, financieros o de contratos en la conversación: stop-the-line con plantilla de anonimización. Síntomas: un «observaciones» donde puede acabar una alergia; nadie sabe cuántos meses se guarda; salud o discapacidad de por medio; un volcado de producción en el portátil; el correo del cliente en un log; un contrato o una nómina pegados en el chat."
user-invocable: false
license: MIT
---
# Protección de datos (decidirlo al planificar, no al revisar)

Hoy los datos personales aparecen en el flujo una sola vez: como hallazgo de la dimensión de
seguridad de `/review`, cuando el código ya está escrito. Eso llega tarde para lo único que
importa de verdad aquí, que es **qué se recoge y qué no**: un campo que no existe no se filtra,
no hay que retenerlo, no hay que borrarlo y no hay que auditar quién lo mira.

Esta guía es de ingeniería, no de derecho. Trata lo que decide quien construye: qué entra, a
dónde va, quién lo ve, cuánto dura y qué queda registrado. **La valoración legal es del
usuario**, y cuando algo dependa de ella se pregunta en lugar de suponerse
(`evidencia-y-preguntas` (`${CLAUDE_PLUGIN_ROOT}/skills/evidencia-y-preguntas/SKILL.md`)) — un agente afirmando qué exige el RGPD en un caso concreto
es exactamente el tipo de dato inventado que el plugin prohíbe escribir.

## Lo primero: acota el inventario al cambio

No hagas un censo del sistema. **Qué dato personal entra, sale o cambia de sitio por culpa de
esta tarea.** Un campo nuevo, una exportación nueva, una integración que manda algo fuera, un
rol que ahora ve lo que antes no veía. Si la respuesta es «ninguno», dilo en una línea y sigue.

Y ojo con el que casi siempre se cuela sin declararse: **el campo de texto libre**. «Notas»,
«observaciones», «comentario» — ahí acaba escrito cualquier cosa, incluida la de categoría
especial. Un textarea es un dato personal de tipo desconocido, y eso es peor que uno conocido.

## Las categorías que cambian la conversación

Salud, origen étnico, creencias, afiliación sindical, vida u orientación sexual, biometría y
genética **no son «datos personales un poco más delicados»**: son otra categoría, con otro
listón. Si el cambio toca una de ellas, deja de ser una decisión técnica tuya y pasa a ser una
decisión del usuario, explícita y registrada.

El caso que más aparece y menos se reconoce: **una alergia alimentaria es un dato de salud**.
También el «necesita silla de ruedas» de un formulario de reserva, o el parte de baja adjunto
en una herramienta interna.

## Reglas duras

1. **Minimiza en el diseño, no en la revisión.** Para cada campo: ¿qué decisión del negocio se
   toma con esto? Si no hay respuesta, sobra. Es la misma pregunta que
   `historias-usuario` (`${CLAUDE_PLUGIN_ROOT}/skills/historias-usuario/SKILL.md`) hace al criterio, aplicada al dato.
2. **Todo dato personal tiene un plazo.** Si nadie sabe cuánto se guarda, la respuesta de facto
   es «para siempre», y eso no lo ha decidido nadie. El plazo se escribe aunque sea largo.
3. **Ni en registros ni en errores.** Un identificador, sí; el contenido, no — regla 3 de
   `observabilidad` (`${CLAUDE_PLUGIN_ROOT}/skills/observabilidad/SKILL.md`). Los registros se exportan, se replican y los ve gente sin acceso a
   la base de datos. Cuidado con el volcado del objeto entero y con el mensaje de excepción que
   arrastra la fila.
4. **Quien lo ve es una decisión, no una consecuencia.** Un rol nuevo, un panel interno, un
   informe que ahora incluye una columna más: eso amplía quién accede, y se decide.
5. **Sobre dato sensible, acceso auditado.** Si no queda registro de quién lo consultó, no se
   puede responder a la única pregunta que se hará si algo pasa.
6. **Lo que sale del sistema se declara.** Exportaciones, copias a otro entorno, integraciones
   con terceros, modelos de lenguaje. **Mandar datos personales a un tercero es una decisión
   del usuario**, siempre, y va escrita.
7. **Si no puedes borrar a una persona, es un problema de diseño, no de operaciones.** Datos
   desperdigados en texto libre, en copias, en registros y en informes generados no se borran
   con un `DELETE`. Se piensa antes de desperdigarlos.
8. **Nunca datos reales en desarrollo o en pruebas.** El entorno de pruebas tiene menos control
   de acceso, más copias y más gente. Datos de mentira, o datos reales anonimizados de verdad
   —no «sin el nombre»—.
9. **La conversación también es un canal de salida.** Cuando el usuario pegue datos personales,
   financieros o de contratos en el chat, es la regla 6 ocurriendo en vivo: **stop-the-line**.
   No te limites a avisar: muestra el texto con la plantilla de anonimización ya aplicada
   (`Cliente-1`, `MONTO-1`, `Fecha-1`) y advierte de que la reidentificación puede ocurrir por
   **combinación** de valores (pueblo + puesto + edad + monto), no solo por nombres. Sé honesto
   sobre lo que protege: el dato pegado ya lo ha leído el modelo; la anonimización evita que
   siga viajando —a ficheros, tareas, PRs, herramientas externas o a la respuesta—. Se sigue con
   la versión anonimizada o con autorización explícita del usuario para usar la original.

## Cómo aplicarla

- **En `/plan`:** si el inventario del cambio no está vacío, entra en los requisitos no
  funcionales como característica de **confidencialidad** de ISO 25010
  (`calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`)), con criterio verificable: qué se guarda, cuánto, quién lo ve,
  qué queda auditado. Lo que toque categoría especial o salga a un tercero se registra en
  «Decisiones tomadas» y **lo aprueba el usuario**.
- **En `/implement`:** el campo se crea con su plazo y su control de acceso, no «y luego lo
  restringimos». Si vas a escribir un `console.log` sobre una entidad de persona, para.
- **En `/review` (dimensión 5):** dato personal en un registro, campo nuevo sin decisión de
  retención, exportación que amplía quién lo ve, y datos reales en fixtures o semillas. Los
  cuatro son severidad **Alta**.
- **Si el cambio manda datos a un modelo de lenguaje**, cruza con
  `llamadas-a-modelos` (`${CLAUDE_PLUGIN_ROOT}/skills/llamadas-a-modelos/SKILL.md`): el prompt viaja a un tercero y a veces se conserva.

## Anti-patrones (nómbralos para no caer en ellos)

- **El campo «observaciones»** — el mayor recolector no declarado de datos de categoría
  especial que existe. Antes de añadirlo, pregunta qué van a escribir dentro.
- **«Lo guardamos por si acaso»** — no es previsión: es recoger sin propósito, que es justo lo
  que la regla 1 prohíbe. Y lo que no se recoge no se filtra.
- **Anonimizar quitando el nombre** — con fecha de nacimiento, código postal y sexo se
  reidentifica a casi cualquiera. Quitar el nombre no es anonimizar, es disimular.
- **La copia de producción para depurar** — «solo un momento, en local». Esa copia sobrevive
  al momento, y vive en un portátil.
- **Pedirlo todo en el formulario** — el teléfono que nadie llama, la fecha de nacimiento que
  nadie usa. Cada campo de más es riesgo permanente a cambio de nada.
- **Decidir tú lo legal** — «esto con consentimiento vale». No lo sabes, y afirmarlo con tono
  de hecho es peor que no decir nada. Es pregunta al usuario.

## Autocrítica antes de cerrar

Antes de dar por buena una tarea que toca datos de personas, pregúntate: **¿sé exactamente qué
dato personal entra, sale o cambia de sitio por este cambio? ¿hay algún campo que no sirva para
tomar ninguna decisión? ¿hay texto libre donde puede acabar un dato de salud? ¿está escrito
cuánto se guarda y quién lo ve? ¿sale algo hacia un tercero, y lo ha aprobado el usuario? ¿he
escrito contenido personal en algún registro o mensaje de error? ¿estoy usando datos reales
donde no debería?** Si algo falla, corrígelo antes de seguir.
