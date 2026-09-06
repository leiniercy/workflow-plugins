---
name: niveles-y-tipos-de-prueba
description: "Úsala al definir la estrategia de pruebas de una tarea en /plan y al elegir a qué nivel y con qué runner escribir cada test en /implement. Síntomas: no sabes si esto es unidad, componente, integración o E2E; el test necesita levantar medio sistema; sospechas que un test pasa sin verificar nada real."
---
# Niveles y tipos de prueba (elegir dónde y con qué probar)

Diseñar los casos de prueba (qué comportamiento y con qué técnica) es trabajo de
`historias-usuario` (skill de OpenCode, auto-activable). Esta guía resuelve las dos decisiones siguientes: **a qué nivel**
probar cada criterio y **con qué herramienta**, y **qué tipos no-funcionales** marcar en la
estrategia. Basado en ISTQB (niveles y tipos de prueba), Testing Library, Playwright y Jest.

Regla rectora — la **pirámide de pruebas**: muchos tests baratos y rápidos abajo (unidad),
pocos caros y lentos arriba (E2E). Y un principio de ISTQB: la prueba exhaustiva es imposible y
los defectos se agrupan, así que se cubre **comportamiento y riesgo, no líneas ni cobertura por
cobertura**.

## Niveles: elige el más bajo que verifique de verdad el criterio

| Nivel | Qué verifica | Cuándo elegirlo | Herramienta por defecto (elige la del stack; ejemplos) |
|---|---|---|---|
| **Unidad** | Lógica pura: funciones, utilidades, hooks sin DOM ni red | Una regla de negocio, un cálculo, una validación aislada | El runner del repo (p. ej. Jest/Vitest en JS/TS, pytest en Python, go test en Go) |
| **Componente** | Un componente desde la óptica del usuario: render, interacción, estado visible | Comportamiento de UI que no cruza módulos | La librería de testing de componentes del framework (p. ej. Testing Library + `user-event` sobre Jest/Vitest) |
| **Integración** | Varios módulos juntos: endpoint + BD, handler + validación | El fallo solo aparece al combinar piezas | El runner del repo con entorno/mocks; o test de API |
| **E2E / sistema** | Un flujo de usuario completo en navegador/cliente real | Recorrido multi-página, autenticación, flujos críticos | Playwright si es web (auto-wait, locators por rol, cross-browser). Selenium u otro solo si el repo ya lo usa |
| **Aceptación** | Los CA de la spec de punta a punta | Confirmar el contrato con el usuario | Suele solaparse con E2E; reutiliza sus casos |

**Cómo elegir:** sube al nivel más bajo que verifique el comportamiento real del CA. Una regla
de validación es **unidad**; un flujo de UI multi-página es **E2E**. No subas «por realismo» lo
que la unidad ya cubre (lento y frágil), ni bajes a unidad lo que solo se rompe integrando.

## Tipos: funcional vs no-funcional (nombrar, no integrar)

Los CA cubren lo **funcional** (la mayoría del trabajo). Los tipos **no-funcionales** el plugin
los **marca** en la estrategia para que `/plan` decida y el repo objetivo elija herramienta —no
los ejecuta ni empaqueta su maquinaria (sería sobre-ingeniería). Cada tipo corresponde a una
característica de calidad de ISO 25010 (`calidad-producto` (skill de OpenCode, auto-activable)); usa esa taxonomía al
marcarlos:

- **Rendimiento / carga** (→ eficiencia de desempeño): si un CA tiene umbral (tiempo de
  respuesta, throughput), márcalo; la herramienta es del repo (p. ej. JMeter, k6).
- **Seguridad** (→ seguridad): marco OWASP Top 10; lo cubre `/review` (dimensión de seguridad).
- **API / contrato** (→ compatibilidad): si el cambio toca endpoints, prueba el contrato
  (Postman/Newman, o tests de integración del propio runner).
- **Usabilidad / accesibilidad** (→ capacidad de interacción): en UI, los locators por
  rol/etiqueta (Testing Library, Playwright) ya empujan a ello; lo revisable en código lo
  define `usabilidad-accesibilidad` (skill de OpenCode, auto-activable) (dimensión 6 de `/review`); añade axe u otra
  auditoría del repo si aplica.
- **Regresión:** la suite existente debe seguir verde (ya lo garantiza el ciclo TDD).

## Tests honestos: que el test pueda fallar de verdad

Elegir bien el nivel no sirve de nada si el test no puede detectar una rotura. Dos principios
gobiernan esto: **cada test nombra la rotura que atrapa** y **cada test ejercita lo real**.

**Antes de escribir el cuerpo del test, responde: ¿qué cambio en el código de producción haría
fallar este test, y ese cambio sería un bug o una decisión?**

- Si no sabes nombrar ninguno → el test no verifica nada; rediséñalo sobre un comportamiento
  observable.
- Si solo fallaría ante una **decisión** intencionada (el valor de una constante, la redacción
  exacta de un mensaje, una estructura privada) → es un *detector de cambios*: salta al
  rediseñar y duerme ante los bugs. Prueba el comportamiento que depende de la decisión, no la
  decisión (no `MAX_REINTENTOS === 5`, sino «la quinta llamada reintenta y la sexta no ocurre»).

**Deriva el valor esperado a mano.** Un esperado calculado con el mismo código que estás
probando pasa siempre, haga lo que haga ese código:

```js
// ✗ Aserción espejo: los dos lados salen del mismo constructor — siempre verde
const esperado = construirQuery({ tag: "urgente" });
expect(construirQuery({ tag: "urgente" })).toBe(esperado);

// ✓ Literal derivado a mano
expect(construirQuery({ tag: "urgente" })).toBe('tag:"urgente"');
```

**Cuando no puedes derivarlo a mano: el oráculo lento.** Hay resultados cuyo esperado no se
escribe a mano para un caso realista —un cálculo optimizado, un algoritmo con poda, una
agregación—. La salida no es renunciar ni caer en la aserción espejo: es escribir **a propósito**
la versión lenta y obviamente correcta —la que recorre todo sin optimizar, la que se lee de un
vistazo— y usarla como referencia sobre entradas pequeñas. El test compara las dos
implementaciones; el oráculo vive en utilidades de test y nunca en producción.

Funciona porque las dos versiones fallan de formas distintas: si el oráculo es lo bastante
simple como para darlo por correcto leyéndolo, un desacuerdo señala al código optimizado. Es la
puerta natural a las **pruebas basadas en propiedades** —en vez de casos elegidos a ojo, generas
entradas y aseveras que ambas coinciden— y es la técnica con la que `coste-y-estructuras` (skill de OpenCode, auto-activable)
manda comprobar una heurística antes de fiarse de ella.

**Prueba tu frontera, no el framework.** El contrato que hace tu código (la ruta que registras,
la query que emites, la respuesta que produces) es tuyo; que el router invoque un handler
registrado es el test de sus mantenedores.

**Dobles y mocks:**

- **Un mock no merece aserciones.** Una aserción sobre el mock pasa porque el mock existe y
  falla si lo quitas: no dice nada del componente. Si lo que compruebas es el mock, quítalo o
  borra la aserción.
- **Mockea al nivel correcto.** Aprende los efectos colaterales del método real antes de
  sustituirlo: mockea la operación lenta o externa y **deja real lo que el test necesita**. Un
  mock demasiado alto se traga el efecto que el test iba a comprobar.
- **Espeja la estructura real completa.** Un mock parcial falla en silencio: el test pasa y la
  integración se rompe cuando alguien lee el campo que omitiste.
- **Si el montaje del mock supera al test**, cambia a un test de integración con componentes
  reales.
- **Los métodos que solo usan los tests** viven en utilidades de test, nunca como método de la
  clase de producción.

**Comprobación de mutación, antes de cerrar.** Muta mentalmente el código de producción; al
menos un test debe caer con cada mutación realista: constante o argumento equivocado, rama
equivocada, efecto colateral que falta, retorno vacío o por defecto, validación ausente para
cero / vacío / no autorizado. Una mutación que nadie detecta marca ese comportamiento como
desprotegido — o el test como tautológico.

## Cómo aplicarla

- **En `/plan` (estrategia de tests):** por cada HU, indica el nivel de sus EC y marca los tipos
  no-funcionales relevantes. Nombra la herramienta; no la integres.
- **En `/implement` (paso 1 del ciclo TDD):** elige el nivel más bajo que verifique el criterio y
  el runner que **ya exista** en el repo; si no hay ninguno, propón el de la tabla acorde al
  stack y espera aprobación antes de añadir dependencias.

## Anti-patrones (nómbralos para no caer en ellos)

- **Pirámide invertida** — todo a E2E. Lento, frágil y caro: baja a unidad/componente lo que se
  pueda verificar ahí.
- **Integración disfrazada de unidad** — un «test de unidad» que mockea medio sistema. Si
  necesitas montar varias piezas, es integración: ponlo en su nivel.
- **Perseguir el 100 % de cobertura** — la cobertura es un síntoma, no un objetivo (exhaustivo
  imposible; los defectos se agrupan). Cubre comportamiento y riesgo.
- **Integrar la maquinaria no-funcional en el plugin** — rendimiento, carga o escaneo activo de
  seguridad son herramientas del repo objetivo; aquí solo se **nombran** en la estrategia.
- **Ignorar el runner existente** — respeta el del repo; propón el default de la tabla acorde
  al stack solo cuando no haya ninguno para ese nivel.
- **Aserción sobre el mock** — comprobar que el doble existe (`getByTestId('sidebar-mock')`)
  en vez del comportamiento real. Pasa siempre que el mock esté; no prueba nada.
- **Detector de cambios** — un test que solo puede fallar ante una decisión intencionada.
  Molesta en cada rediseño y no atrapa ningún bug.
- **Test contra el texto fuente** — asegurar que un script o un documento «contiene esta
  línea» solo demuestra que la fuente es la fuente. Ejecútalo y asevera su efecto.

## Autocrítica antes de cerrar

Antes de fijar la estrategia (`/plan`) o de escribir el test (`/implement`), pregúntate:
**¿estoy probando en el nivel más bajo que sirve? ¿sé nombrar qué rotura atraparía este test?
¿el valor esperado está derivado a mano —o contra un oráculo lento, si a mano no se podía—?
¿marqué los tipos no-funcionales que el CA exige?
¿reutilizo el runner del repo? ¿evité integrar maquinaria que es del proyecto, no del plugin?**
Si algo falla, corrígelo antes de seguir.
