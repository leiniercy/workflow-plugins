# Política de seguridad

## Qué protege este plugin

`backbone` ejecuta código en la máquina de quien lo instala (tres hooks de
Claude Code) y lee credenciales del usuario a través de variables de entorno (los
servidores MCP). Su superficie de riesgo no es de red: es esa. Los fallos que nos
importan son los que hacen que el plugin escriba fuera de su sitio, filtre un secreto
o ejecute algo irreversible sin gate.

## Versiones con soporte

Se da soporte a la última versión publicada en el marketplace. Mira la versión en
`plugins/backbone/claude/.claude-plugin/plugin.json`.

## Cómo reportar un fallo

No abras un issue público para un fallo de seguridad. Escribe a
**leinier.caraballo@rockstardata.ai** con:

- Qué falla y dónde (`fichero:línea` si lo tienes).
- Cómo reproducirlo.
- Qué se rompe y para quién (un secreto expuesto, una escritura fuera de la raíz del
  plugin, una acción destructiva que esquiva el gate).

Respondo en un plazo de 5 días laborables. Si confirmo el fallo, acordamos contigo una
fecha de publicación del arreglo antes de hacerlo público.

## Divulgación

Divulgación coordinada: el arreglo sale antes que el detalle. Te acreditamos en el
CHANGELOG salvo que prefieras quedar anónimo.
