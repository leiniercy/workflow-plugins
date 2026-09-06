# Criterio

La respuesta debe explicar que si cliente_id admite nulos y la subconsulta devuelve alguno, NOT IN evalua a desconocido y WHERE descarta todas las filas, devolviendo vacio sin fallar. Debe proponer NOT EXISTS o excluir explicitamente los nulos.
