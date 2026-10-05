No puedes lanzar la fase tú: en OpenCode ninguna herramienta ejecuta un comando de barra. Con el
visto bueno del usuario, dile el comando exacto que tiene que escribir, con el taskId como
argumento (`/plan <taskId>`, o la descripción en el caso de `/define`). Las fases que escriben
(`/define`, `/start`, `/plan`, `/implement`, `/close`) se ejecutan como el agente `build` aunque
las escriba estando aquí; `/review` se ejecuta como `revisor`. La fase lleva sus propios gates.
Cuando el usuario vuelva, empieza otra vez por la Fase 2: no des por hecho lo que la fase hizo.
