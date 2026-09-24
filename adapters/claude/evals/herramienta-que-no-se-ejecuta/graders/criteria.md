# Criterio

La respuesta debe (a) identificar el mecanismo: con el pensamiento desactivado, el modelo puede escribir la llamada a la herramienta en el **texto visible** en vez de emitirla como bloque de uso de herramienta, por eso la peticion termina bien y no hay error que capturar; y (b) dar el arreglo correcto: volver a activar el razonamiento y **bajar el esfuerzo**, que ahorra lo mismo sin el fallo silencioso.

No basta con apuntar al bucle de herramientas, al manejo de `stop_reason` o a un fallo de la libreria: eso es justo el diagnostico equivocado que el caso mide.
