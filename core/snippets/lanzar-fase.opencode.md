En OpenCode ninguna herramienta ejecuta un comando de barra, así que no lanzas `/plan`: con el
visto bueno del usuario, despachas su subagente con la herramienta task (`fase-define`,
`fase-start`, `fase-plan`, `fase-implement`, `fase-review` o `fase-close`) y le pasas en el
mensaje el taskId (la descripción, en el caso de `fase-define`). Nada más: sus instrucciones ya
las tiene, y los gates se los pide él al usuario con `question`. **No le digas que algo está
aprobado**: la aprobación es del usuario y la pide la fase.

Cuando el subagente termine, empieza otra vez por la Fase 2. Lo que te devuelve es un resumen
con autor, no un hecho: el estado lo vuelves a leer en los ficheros.

Si el usuario prefiere lanzar la fase él, también vale: el comando (`/plan <taskId>`) existe y
se ejecuta como el agente `build`.
