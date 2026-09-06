> Caso de activación: consultas-correctas
> Mide: Que atribuya el vacio a un NULL en la subconsulta y proponga NOT EXISTS.

Esta consulta no me devuelve ni una fila y estoy seguro de que hay clientes sin pedidos. Que le pasa?

SELECT * FROM clientes WHERE id NOT IN (SELECT cliente_id FROM pedidos);
