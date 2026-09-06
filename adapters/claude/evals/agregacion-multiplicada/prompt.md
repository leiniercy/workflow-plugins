> Caso de activación: consultas-correctas
> Mide: Que detecte que el join uno-a-muchos multiplica las filas y el SUM cuenta cada factura una vez por linea.

Necesito el total facturado por cliente. Esta consulta me la ha pasado un companero, la doy por buena?

SELECT f.cliente_id, SUM(f.importe) AS total
FROM facturas f
JOIN lineas_factura l ON l.factura_id = f.id
GROUP BY f.cliente_id;
