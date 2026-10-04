**Entradas de `progress.md` en voice.** Se escriben con {{guide:registro-progreso}} con dos
cambios, porque esa guía nació para las tareas de backbone:

- La ruta es `entregables/<slug>/progress.md`, y `<fase>` es el nombre del comando que escribe:
  `brief`, `outline`, `draft` o `deliver`.
- El **Resultado** de cada entrada empieza por uno de estos títulos, tal cual, y después lo que
  haga falta. `/lead` decide el estado del entregable leyendo estos títulos, así que uno inventado
  o reescrito («Encargo actualizado» en vez de «Encargo cambiado») lo deja ciego.

| Título | Lo escribe | Cuándo |
|---|---|---|
| «Encargo fijado» | `/brief` | primera vez que se aprueba el encargo |
| «Encargo cambiado» | `/brief` | vuelta atrás: el encargo aprobado cambia |
| «Plan aprobado» | `/outline` | primera vez que se aprueba el plan |
| «Plan cambiado» | `/outline` | vuelta atrás: el plan aprobado cambia (con las secciones pendientes de revisar) |
| «Plan revisado sin cambios» | `/outline` | el encargo cambió y el plan sigue valiendo |
| «Sección redactada: s-<nombre>» | `/draft` | una sección queda escrita, nueva o reescrita |
| «Redacción parada» | `/draft` | el plan no sirve para una sección |
| «Versión nueva abierta tras vN» | `/draft` | se vuelve a redactar algo ya entregado |
| «Entregado vN» | `/deliver` | firma y exportación hechas |
| «Descartado» | `/deliver` | descarte, con su motivo |

**Entregable vivo**, para listar sin argumentos: no tiene «Descartado» y, o no tiene ninguna
«Entregado vN», o tiene alguna entrada de `/brief`, `/outline` o `/draft` después de la última.
Un entregable entregado al que le cambian el encargo o le abren una versión nueva vuelve a estar
vivo, y las fases lo ofrecen igual que uno sin entregar.
