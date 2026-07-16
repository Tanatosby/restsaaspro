# Flujo Menú del Día v2 — Análisis y propuesta

> Documento de análisis del flujo de creación/armado del menú del día (owner).
> Creado: 2026-07-02. Estado: ✅ **IMPLEMENTADO el mismo día** (Fases 1-3; la Fase 0
> hotfix no hizo falta). Mockup navegable en `public/demo_flujo_menu.html`.
> Verificado: 230/230 jest · 51/51 E2E Playwright a 360px.
> Decisiones tomadas de la sección 8: herencia desde el último menú creado (sin
> plantillas), desmarcar en el picker quita el plato, sin reorden de secciones (YAGNI).
> Extra sobre lo propuesto: el alta de sección quedó en 1 tap (fila con botones
> Obligatoria/Opcional en vez del mini-wizard de 2 pasos).
>
> Contexto del usuario: "está un poco difícil… eliges entrada y se fija en la card de entrada,
> pero si agregas para segundo, se queda fijado en entrada y tienes que moverte a la derecha
> a buscar segundo". Además: la parte de copiar menú a otro día **gusta y se mantiene**;
> la estructura de secciones (Entrada, Segundo, Refresco…) **casi nunca cambia** entre días.

---

## 1. El flujo actual, paso a paso

Para armar el menú de hoy (ejemplo real: Entrada con 3 platos + Segundo con 4 platos):

```
Galería de menús (◀ fecha ▶)
 └─ ＋ Crear menú
     └─ Wizard 3 pasos: Título → Precio → ¿Fijo o elige?   (≈5 taps)
         └─ vuelve a la galería
             └─ ⚙ Configurar                                (1 tap)
                 └─ HUB: [Config. para el cliente | Secciones]  (1 tap)
                     └─ Galería de SECCIONES (carrusel horizontal)
                         ├─ ＋ Agregar sección → mini-wizard 2 pasos
                         │    (elegir + siguiente + obligatoria + confirmar = 5 taps POR SECCIÓN)
                         └─ En cada card: ＋ Agregar plato → PlatoPicker
                              (2 taps POR PLATO + swipe para volver a la sección)
```

**Conteo honesto para el ejemplo (2 secciones, 7 platos):**

| Etapa | Taps |
|---|---|
| Crear menú (wizard 3 pasos) | ~5 |
| Entrar a configurar (⚙ + hub) | 2 |
| Agregar 2 secciones (5 taps c/u) | 10 |
| Agregar 7 platos (2 taps c/u) | 14 |
| **Swipes para volver a "Segundo" tras cada plato** | ~4-8 swipes |
| **Total** | **~31 taps + swipes de reposicionamiento** |

---

## 2. Diagnóstico — por qué se siente difícil

### P1 — El bug de experiencia que describes: el carrusel "rebota" al inicio 🔴
Cada acción (agregar plato, toggle agotado, quitar plato…) llama `recargarModalConfig()`
(`owner.html:1380`), que hace `body.innerHTML = …` — **reconstruye toda la galería de
secciones desde cero**. El carrusel horizontal (`.mc-sec-gallery`, `owner.css:619`) nace
con `scrollLeft = 0` → siempre aterriza en la primera card ("Entrada").

Resultado: agregar 4 platos a "Segundo" = 4 veces deslizar a la derecha para buscarla.
No es que el usuario "se pierda": **el sistema lo devuelve al inicio a propósito** (sin querer).

### P2 — Patrón equivocado: carrusel horizontal para una tarea de checklist 🔴
El carrusel de cards retrato es un patrón de **exploración/vitrina** (perfecto en `menu.html`
para el comensal que "ojea" opciones). Pero armar el menú es una tarea de **checklist**:
el dueño necesita ver de un vistazo *"¿qué me falta?"* — Entrada ✓ 3 platos, Segundo ✗ vacío.
Con una card visible a la vez (200px en móvil), el estado global del menú es invisible;
hay que deslizar para auditar. El scroll natural del celular es **vertical**, no horizontal.

### P3 — Profundidad: 4 niveles para llegar a los platos 🟡
`Galería → ⚙ Configurar → Hub → Secciones → (mini-wizard | picker)`.
El hub de 2 opciones agrega un nivel entero para proteger 2 toggles ("Cliente elige" /
"Visible") que se tocan quizá una vez en la vida del menú. La tarea del 95% de las visitas
(platos) paga el costo de la tarea del 5% (toggles).

### P4 — El mini-wizard de secciones castiga la rutina diaria 🟡
Las secciones **casi nunca cambian** (dato confirmado). Sin embargo, cada menú nuevo desde
cero obliga a repetir el mini-wizard de 2 pasos por CADA sección: 5 taps × 3 secciones = 15 taps
para reconstruir la misma estructura de ayer, de anteayer y de la semana pasada.

### P5 — PlatoPicker de un plato a la vez 🟡
El picker se cierra tras elegir 1 plato. Para los 4 segundos del día: abrir → elegir → cierre →
(rebote a Entrada, P1) → swipe → abrir → elegir… La selección múltiple eliminaría el 50% de
los taps de la etapa más repetida.

**Lo que SÍ funciona y no se toca:** el wizard de creación en 3 pasos (simple, lindo),
📋 Copiar a otro día (al usuario le gusta), la foto de portada, los toggles de agotado.

---

## 3. Principio rector para v2

> **El menú de mañana se arma en menos de 1 minuto, con el pulgar, sin deslizar de lado.**
>
> Corolarios:
> 1. Lo que no cambia entre días (secciones) no se vuelve a pedir.
> 2. Lo que cambia entre días (platos) se elige en lote, no de a uno.
> 3. El estado del menú completo se ve en UNA pantalla sin swipes ("¿qué me falta?").

---

## 4. Propuesta v2 — cuatro cambios que se refuerzan entre sí

### Cambio A — Secciones: de carrusel horizontal → **lista vertical (acordeón)** ⭐ el corazón

```
┌─────────────────────────────────┐
│ ← Volver          Menú del día  │
│ mié 2 jul · S/ 12.00 · Elige ✏  │
├─────────────────────────────────┤
│ ▼ 🥗 Entrada         Obligatoria│
│   • Papa a la huancaína     ⋯  │
│   • Sopa de casa            ⋯  │
│   • Tequeños                ⋯  │
│   [＋ Platos]                   │
├─────────────────────────────────┤
│ ▼ 🍛 Segundo   ⚠ sin platos    │
│   [＋ Platos]                   │
├─────────────────────────────────┤
│ ▶ 🥤 Refresco        1 plato   │
├─────────────────────────────────┤
│ ＋ Agregar sección               │
└─────────────────────────────────┘
```

- Todas las secciones visibles apiladas → **P1 y P2 muertos de raíz**: el scroll vertical
  vive en el contenedor de página (que NO se reconstruye), así que sobrevive al re-render;
  y "Segundo" está siempre a un scroll de pulgar, nunca "a la derecha".
- Cabecera de cada sección = fila compacta (nombre + badge estado + chevron expandir/colapsar).
  Sección vacía muestra `⚠ sin platos` → el "qué me falta" se ve de un vistazo.
- La fila de plato condensa las acciones actuales en un menú `⋯` (Agotado / 📷 Portada / ✕ Quitar)
  para que la fila mida 44px y quepa todo en 360px.
- "＋ Agregar sección" pasa a ser el ÚLTIMO elemento de la lista (no un botón arriba):
  la acción rara al final, la frecuente (platos) arriba.
- Costo: CSS + reescritura de `renderConfigSecciones()`. **Sin backend.**

### Cambio B — PlatoPicker con **selección múltiple**

```
┌─────────────────────────────────┐
│ Platos para «Segundo»    3 ✓    │
│ 🔍 buscar…                      │
│ [✓ Lomo] [✓ Ají de g.] [ Tallarín]│
│ [✓ Arroz c/pollo] [ Estofado]   │
│                                 │
│ [    Agregar 3 platos ✓    ]    │
└─────────────────────────────────┘
```

- El picker ya existe (`plato-picker.js`); se agrega modo `multi: true` con check en cada
  card y botón de confirmación con contador.
- Los platos ya asignados a la sección aparecen pre-marcados (des-marcarlos = quitarlos)
  → el picker se convierte en "el editor de la sección", una sola visita por sección.
- Backend: el endpoint actual agrega de a uno → o se hacen N POSTs en secuencia (cero
  backend), o un endpoint batch `POST …/platos/batch` (más limpio, ~15 líneas + tests).

### Cambio C — Matar el hub: ⚙ Configurar aterriza **directo en las secciones**

- La tarea frecuente (platos) queda a 1 tap de la card del menú.
- Los 2 toggles del cliente ("Cliente elige"/"Fijo", "Visible"/"Oculto") se mueven a una
  **fila compacta arriba de la lista de secciones** (o detrás del ✏ Editar junto a
  nombre/precio). Son 2 botones — no necesitan pantalla propia.
- Se elimina `renderConfigHub()` y la sub-vista `'hub'` → menos código, no más.

### Cambio D — Al crear un menú, **heredar las secciones del último menú** 🎁

Como la estructura casi nunca cambia:

- Al confirmar el wizard de creación, el sistema busca el menú más reciente del restaurante
  y **copia sus secciones (con su flag obligatoria/opcional), SIN platos**.
- El dueño aterriza directo en la lista de secciones ya armada:
  *"Tu menú ya tiene Entrada, Segundo y Refresco — solo agrega los platos de hoy"*.
- El paso 3 del wizard puede cerrar con **«Crear y agregar platos →»** (encadena a la vista
  de secciones) en lugar de volver a la galería — un tap menos y sin pasos muertos.
- El mini-wizard de "Agregar sección" queda solo para el caso raro (agregar postre un domingo).
- Backend: opción `heredar_secciones: true` en `POST /menus-dia` (transaccional, mismo patrón
  que el endpoint de copiar) — pequeño y bien testeable.

---

## 5. El flujo v2 completo (mismo ejemplo: 2 secciones, 7 platos)

```
＋ Crear menú → Título → Precio → ¿Fijo/elige? → «Crear y agregar platos →»
   └─ Lista de secciones YA armada (heredadas de ayer)
       ├─ Entrada  → ＋ Platos → marcar 3 → Agregar ✓
       └─ Segundo  → ＋ Platos → marcar 4 → Agregar ✓
```

| Etapa | Hoy | v2 |
|---|---|---|
| Crear menú | ~5 taps | ~5 taps |
| Llegar a los platos | 2 taps (⚙ + hub) | 0 (encadenado) |
| Armar secciones | 10 taps | 0 (heredadas) |
| Agregar 7 platos | 14 taps + 4-8 swipes | 10 taps, 0 swipes |
| **Total** | **~31 taps + swipes** | **~15 taps** (−52%) |

Y el camino "copiar el de ayer" (que ya gusta) se vuelve aún mejor: copiar → entrar a
secciones → cada sección abre su picker **pre-marcado** con los platos de ayer → desmarcar
los que salen, marcar los que entran → listo.

---

## 6. Plan de implementación propuesto (fases independientes)

| Fase | Qué | Backend | Riesgo | Valor |
|---|---|---|---|---|
| **0 — Hotfix opcional** | Tras cada acción, hacer `scrollIntoView()` de la card de la sección tocada (guardar `id_seccion` antes del re-render) | No | Nulo | Alivia P1 hoy mismo con ~10 líneas, si quieres un parche mientras decidimos |
| **1 — Acordeón vertical** (A) + matar hub (C) | Reescribir `renderConfigSecciones()` + CSS; mover toggles cliente; borrar hub | No | Bajo (solo frontend, endpoints intactos) | Mata P1, P2, P3 |
| **2 — Picker multi-select** (B) | Modo `multi` en `plato-picker.js` + (opcional) endpoint batch | Opcional | Bajo | Mata P5 |
| **3 — Herencia de secciones** (D) + «Crear y agregar platos →» | `heredar_secciones` en POST + encadenar wizard→secciones | Sí (pequeño) | Bajo | Mata P4 |

> Nota: la Fase 0 es **alternativa barata**, no prerequisito. Si vamos directo a Fase 1,
> la Fase 0 no hace falta (el acordeón elimina el problema de raíz).

---

## 7. Alternativas consideradas y descartadas

- **Modo guiado tipo wizard por sección** ("Paso 1: elige entradas → Paso 2: segundos…"):
  lindo la primera vez, pero castiga el uso diario (no puedes saltar directo a lo que falta)
  y duplica un tercer paradigma de UI. El acordeón hace lo mismo sin rieles.
- **Todo en una sola pantalla** (la versión vieja que ya descartaste): confirmo el descarte —
  mezclar creación + configuración + platos satura en 360px. La separación
  *crear (wizard) / armar (acordeón)* mantiene cada pantalla con un solo trabajo.
- **Mantener el carrusel con tabs/chips de sección arriba**: parcha P1 pero no P2
  (el estado global sigue invisible) y agrega otro elemento de navegación.

## 8. Preguntas abiertas (para decidir antes de implementar)

1. **Fase 3, herencia:** ¿heredar del *último menú creado* o permitir marcar un menú como
   *plantilla*? (Propongo: último menú, cero UI extra; plantillas solo si el uso real lo pide.)
2. **Picker pre-marcado (Fase 2):** des-marcar un plato ya asignado ¿lo quita al confirmar?
   (Propongo: sí, con toast "2 agregados · 1 quitado".)
3. ¿El botón «＋ Agregar sección» al final de la lista es suficiente, o el caso raro merece
   además poder reordenar secciones? (Propongo: sin reorden por ahora — YAGNI.)
