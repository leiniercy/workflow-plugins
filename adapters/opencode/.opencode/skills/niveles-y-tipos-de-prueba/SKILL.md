---
name: niveles-y-tipos-de-prueba
description: "Criterio para elegir a qué NIVEL probar cada criterio (unidad, componente, integración, E2E/aceptación — la pirámide de pruebas) y con qué herramienta por defecto según el stack del repo (p. ej. Jest/Vitest, Testing Library, Playwright en JS/TS; pytest en Python), y qué TIPOS no-funcionales (rendimiento, seguridad/OWASP, API/contrato, usabilidad/accesibilidad — mapeados a características ISO 25010) marcar en la estrategia sin integrar su maquinaria en el plugin. Úsala al definir la estrategia de tests en /plan y al elegir el nivel y el runner de un test en /implement. Prioriza el nivel más bajo que verifique el comportamiento; no persigue cobertura por cobertura. Basada en ISTQB, Testing Library, Playwright y Jest."
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

## Autocrítica antes de cerrar

Antes de fijar la estrategia (`/plan`) o de escribir el test (`/implement`), pregúntate:
**¿estoy probando en el nivel más bajo que sirve? ¿marqué los tipos no-funcionales que el CA
exige? ¿reutilizo el runner del repo? ¿evité integrar maquinaria que es del proyecto, no del
plugin?** Si algo falla, corrígelo antes de seguir.
