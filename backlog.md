# Backlog priorizado — Menú Pro

Plan de la etapa actual y **el porqué** de cada prioridad. El log técnico de lo ya hecho está en
`status.md`; el detalle por feature en `features.md`; los flujos y gaps de negocio en
`vision_negocio.md`.

> **Origen:** portado desde `conversacion_opues10082026.md` (2026-08-10), que está en `.gitignore`
> (`conversacion_*.md`) y por lo tanto **no viajaba entre las 2 laptops del usuario**. Este archivo sí
> está en git: es la copia viva del backlog. Actualizarlo al cerrar cada sesión.

**Última actualización:** 2026-08-16

---

## ✅ Los 3 críticos del piloto #1: resueltos y desplegados (2026-08-16, `291c15b`)

Salieron del uso real el 2026-08-14 (Día 3 de retoma, ver `pilotos.md`), se resolvieron y se
desplegaron el 2026-08-16:

| # | Título | Estado |
|---|--------|--------|
| ~~[ISS-040](issues/ISS-040-monto-no-visible-en-pago.md)~~ | El comensal no ve el monto a pagar en la pantalla de Yape/Plin | ✅ **En producción** — bloque "Total a pagar" sticky en `#pago-screen` |
| ~~[ISS-042](issues/ISS-042-para-llevar-no-viaja-cocina.md)~~ | La etiqueta "para llevar" no le llega al cocinero | ✅ **En producción** — badge 🥡/🛵 en los tickets de cocina |
| ~~[ISS-041](issues/ISS-041-menus-multiples-sin-anidar.md)~~ | 2 menús del día en un pedido no se pueden diferenciar | ✅ **En producción** — columna `grupo` + `renderMenuAgrupado()` en las 4 vistas |

### 🚨 Empezar acá la próxima sesión

**T0 ✅ hecho y desplegado el 2026-08-17** (confirmado por el usuario junto con ISS-045 e
ISS-046, commit `a47d132` — ver `status.md`).

| # | Qué | Por qué ahora |
|---|---|---|
| — | **Bug de conteo en `reportes.js`** — "Menús pedidos"/"Menús reservados" divide por el total de secciones en vez de por las obligatorias, subcuenta. Reusar `contarUnidadesMenu()` (`utils/menuPricing.js`) en vez del cálculo propio. | 🔴 Encontrado el día 4 del piloto (2026-08-17), no tocado todavía. Bloquea que "Menús de hoy" (abajo) dé bien |
| **T6** | **Backup de la BD** — 🟡 mínimo hecho el 2026-08-17 23:54 (`cp` manual antes del deploy de ISS-046, ver `status.md`); **falta el T6 completo** (script + cron + restore de prueba verificado, `deploy.md` §7) | Lo más riesgoso del proyecto. Ya se desplegaron **tres migraciones** sobre datos reales sin backup automático/verificado; el 2026-08-16 la respuesta a "¿restauramos?" fue *no hay* |
| — | **"Menús de hoy"**: cajita nueva en Análisis, adicional a las 2 actuales, va primera, suma menús de órdenes + reservas cobrados + entregados, filtrado a hoy | 🟡 Pedido central del día 4 del piloto — depende del bug de conteo de arriba |
| — | **Botón "Agregar manual" en cola**: mesa + selección de menús → directo a cocina, status "validar pago" (igual que efectivo) | 🟡 Día 4: 4 clientes no pudieron usar la app (2 se rehusaron, 1 sin internet, 1 sin celular) |
| — | **Verificar en el servicio real** un pedido con 2 menús y la etiqueta "para llevar" | Los 3 críticos están en producción pero nadie los vio funcionar en un servicio de verdad |
| **ISS-043** | El menú sin secciones obligatorias **cobra de menos** (ver sección propia) | Es de cobro, no de vista. Falta correr la consulta en producción para saber si aplica |
| — | Imagen descargable del menú para compartir por WhatsApp (complementaria al link) | 🟢 P2, pedido de la dueña el día 4 |
| — | Fiados / pago diferido (cliente sin dinero que promete pagar después) | 🟢 P2/backlog explícito — el usuario lo bajó de prioridad a propósito |

**Decisión del usuario pendiente, sin bloquear nada:** el ícono de calendario con la fecha real
(reemplazo del emoji 📅, que dibuja "17 de julio" fijo). Están las 3 variantes renderizadas y
medidas en las 3 escalas de letra; falta que elija **A**, **B** o **C**. Recomendada: **A**
(banda con el mes + número del día). El alcance ya está mapeado: de los 17 emojis del código,
se cambian los que acompañan una fecha real y los que hacen de ícono de "Reservas"; los 3 que
van pegados al nombre del cliente (`cocina.js:133`, `pedidos.js:249` y `:515`) **no se tocan**.

---

### T0 · `BUILD` automático — ✅ Hecho y desplegado 2026-08-17

**El problema (resuelto):** `utils/buildVersion.js` tenía un número escrito a mano que había
que subir en cada cambio de `public/`. Si alguien se olvidaba, los navegadores seguían
sirviendo archivos viejos y **volvía exactamente ISS-044**: el panel vacío que parece pérdida
de datos.

**Implementado tal cual el diseño de abajo**, sin cambios de fondo. Verificado con 412/412
jest (número corregido 2026-08-17, ver ISS-046) + `scripts/test-version-assets.js` 25/25 contra
servidor real + determinismo confirmado
aparte (mismo código → mismo hash en corridas consecutivas). Detalle completo en `status.md`,
sesión 2026-08-17 parte 2.

**La solución:** que `BUILD` se calcule solo, como hash del contenido de los archivos servidos.

```js
// utils/buildVersion.js — reemplaza la constante escrita a mano
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
// Los mismos archivos que el SW precachea + los HTML que los referencian
const RUTAS = ['owner.html', 'menu.html', 'css/owner.css', 'css/menu.css', 'js'];

function calcular() {
  const h = crypto.createHash('sha1');
  const recorrer = p => {
    const st = fs.statSync(p);
    if (st.isDirectory()) return fs.readdirSync(p).sort().forEach(f => recorrer(path.join(p, f)));
    if (/\.(js|css|html)$/.test(p)) h.update(fs.readFileSync(p));
  };
  for (const r of RUTAS) recorrer(path.join(PUBLIC, r));
  return h.digest('hex').slice(0, 8);
}

let BUILD;
try { BUILD = calcular(); }
catch (e) { BUILD = String(Date.now()); }  // nunca dejar la app sin arrancar por esto

module.exports = { BUILD };
```

**Puntos ya pensados, no hace falta volver a discutirlos:**
- **Es determinista.** Mismo código → mismo hash. Un `pm2 restart` sin cambios **no** invalida
  los cachés de nadie (que es justo lo que no queremos hacerle a los celulares del piloto).
- **No hay recursión** con `sw.js`: el archivo en disco guarda el placeholder `__BUILD__`, así
  que su contenido no depende del hash. Igual `sw.js` **no** entra en el cálculo.
- **Se calcula una sola vez al arrancar**, no por request. Son ~25 archivos chicos.
- **Fallback obligatorio:** si la lectura falla, `Date.now()`. Peor caso, se invalida caché de
  más; nunca que la app no levante.
- El hash queda en la URL (`?v=a1b2c3d4`) y en el nombre del caché (`menupro-va1b2c3d4`).

**Hecho:** `deploy.md` §6.1 actualizado, y los avisos de "subir BUILD" en el resto de la
documentación quedaron marcados como superados (sin borrar el registro histórico de por qué
existían). `scripts/test-version-assets.js` pasó 25/25 tal cual — no asumía que `BUILD` fuera
un número.

**Menor, encontrado de paso el 2026-08-16 — ✅ resuelto junto con T0:** `owner.html:1161`
(el número de línea corrió desde el 1145 original) hacía `window.location.replace(...)` en el
auth guard sin cortar la ejecución. El apunte decía "se arregla con un `return`", pero el
`<script>` es top-level, no una función — `return` ahí es `SyntaxError`. Se resolvió con
`throw` de un error controlado después del redirect, que sí corta el resto del script.

Después de eso, las tareas con más valor de la lista de abajo son **T4, T5 y T12**.

---

## 🔴 ISS-043 (por abrir) — un menú sin secciones obligatorias cobra de menos

**Encontrado el 2026-08-16** al revisar el alcance de ISS-041, verificado ejecutando
`contarUnidadesMenu()` y `calcularMenuTotal()` sobre 7 escenarios.

Si un menú tiene **todas** sus secciones marcadas como opcionales (`requerido = 0`), el
precio y el conteo de unidades se calculan mal:

| Pedido | Debería | Cobra |
|---|---|---|
| 2 menús sin secciones obligatorias | S/ 22.00 · 2 unidades | **S/ 11.00 · 1 unidad** |
| 3 menús sin secciones obligatorias | S/ 33.00 · 3 unidades | **S/ 11.00 · 1 unidad** |

Con **al menos una** sección obligatoria todo es exacto — verificado con 1, 2 y 3 menús, con
tipos mezclados y con opcionales de por medio. El caso borde ya estaba documentado en
`utils/menuPricing.js` como "subestima, nunca cobra de más", pero ahí se lo trataba como un
problema de conteo de tappers: **también afecta el precio del menú**, porque
`calcularPrecioUnitario()` reparte el precio de UN menú entre todas las filas cuando
`total_obligatorias = 0`.

- **Es configurable desde el panel** (botón "Opcional" por sección), así que no es teórico:
  en la BD local hay un menú así (#4, 2 secciones, 0 obligatorias).
- **Falta confirmar si existe en producción.** Consulta en `issues/ISS-041...md` y en
  `status.md`; devuelve los menús afectados.
- **Ahora se puede arreglar bien:** con la columna `grupo` de ISS-041 se cuentan grupos
  distintos y se reparte el precio por grupo, sin heurística. Solo aplica a pedidos nuevos —
  los viejos no tienen el dato.

Próximo número de issue libre: **ISS-045**. Sin usar quedaron también **ISS-036** (T11 se
resolvió sin abrirlo) e **ISS-037** (reservado para T10, las fechas en Configuración).

---

## 🧭 Próximas decisiones | Tareas — al cierre de la sesión del 2026-08-12

**Lo que hay que resolver a continuación, separado en dos:** decisiones que dependen del
usuario (nadie puede avanzarlas por su cuenta) y tareas ya definidas listas para ejecutar.
~~Próximo número de issue libre: ISS-036~~ — desactualizado, ver **ISS-043** en la sección de
arriba.

### A · Decisiones pendientes del usuario

| # | Decisión | Por qué no se puede decidir sola | Bloquea |
|---|---|---|---|
| ~~**D1**~~ | ✅ **Resuelta 2026-08-13.** Se puede crear una reserva con el restaurante cerrado, siempre que la `hora_llegada` pedida caiga dentro del horario de atención. `validarHorarioReserva()` (`utils/horarioAtencion.js`) ya no exige que el restaurante esté abierto "ahora" cuando hay `hora_llegada`; solo cae a ese chequeo si no la hay. 408/408 jest verde. | — | Desbloquea T3 |
| **D2** | `authorizeRestaurante()` — ¿arreglar o borrar? | Es **código muerto**: importado en `routes/menu.js:5`, usado en ninguna ruta, y lee `req.user.restaurante_id` cuando el JWT guarda `restaurant_id` (`routes/auth.js:27`). Si se deja así, tarde o temprano alguien lo enchufa creyendo que protege algo. | T8 |
| **D3** | Nombre del restaurante: ¿`UPDATE` puntual por SSH ahora, o campo editable en Configuración? | Hoy **no existe forma de renombrar** un restaurante: `restaurantes.nombre` solo se escribe en el `INSERT` de creación (`routes/admin.js:411`). La única salida actual es borrar y recrear, perdiendo todos los datos. | T7 |
| **D4** | ¿Cuándo se despliega `ISS-033`? | Hoy es el día de la atención masiva. Desplegar en pleno servicio vs. esperar a que termine. | — |
| **D5** | Pensionistas: ¿hacer los pasos 6-9 (aislados) antes que el 10-12? | Los pasos 10 y 11 tocan Cola del día y Cocina, los módulos que reciben la carga real. Los 6-9 no tocan ningún flujo activo. | T9 |

### B · Tareas definidas, listas para ejecutar

| # | Tarea | Estado | Depende de |
|---|---|---|---|
| ~~**T1**~~ | ~~Cierre de caja: comprobante + botón "Confirmar pago"~~ | ✅ **Hecho 2026-08-12** — `ISS-034`. Desbloquea T4. Pendiente de deploy | — |
| ~~**T2**~~ | ~~Reset de scroll al cambiar de panel~~ | ✅ **Hecho 2026-08-12** — `ISS-035`. Ojo: **no** era `window.scrollTo()`; el scroll vive en `.content`. SW bumpeado a v8 → deploy **ámbar** | — |
| ~~**T3**~~ | ~~Reservas y horario: `min`/`max` en `res-fecha`/`res-hora` + quitar el gate de "abierto ahora" del botón reservar.~~ | ✅ **Hecho y desplegado 2026-08-13**, alcance reducido — ver detalle en `status.md` | ~~D1~~ |
| **T4** | Filtro de fecha + fin del N+1 en `GET /api/orders/activas`, migrándolo a `utils/colaDia.js`. | 🟢 **Totalmente desbloqueada** — T1/ISS-034 desplegado y verificado en celular real 2026-08-13, ya no hace falta `/activas` sin filtro como salida de emergencia | — |
| ~~**T11**~~ | ~~**Arranque lento de la app**~~ | ✅ **Hecho 2026-08-16** junto con ISS-044, que compartía causa raíz. El SW pasó de precachear 7 archivos a 22 (antes **ningún** JS); los CDN pesados y las fuentes dejaron de bloquear el render. **Pendiente de deploy.** Quedó fuera el `defer` de los 15 scripts locales: el inline de `owner.html:1138` llama a `leerSesion()` en top-level y define las globales de los `onclick`, así que `defer` rompería el arranque — requiere mover ~1200 líneas de inline a un archivo, refactor propio. Nunca se abrió ISS-036: **ese número sigue libre** | — |
| **T5** | Contador **"menús vendidos hoy"** — número grande y visible, unificando órdenes y reservas. | 🟢 Listo para hacer | — |
| **T6** | **Backup manual verificado** de la BD de producción (dump + restore de prueba). Lo ejecuta el usuario por SSH. | 🟡 Parcial — `cp` mínimo hecho 2026-08-17 antes del deploy de ISS-046; falta script+cron+restore de prueba | — |
| **T7** | Editar el nombre del restaurante. | ⏸️ Bloqueada | **D3** |
| **T8** | Resolver `authorizeRestaurante()`. | ⏸️ Bloqueada | **D2** |
| **T9** | Pensionistas, pasos 6-12 (ver sección propia más abajo). | ⏸️ Parcial | **D5** |
| **T10** | Abrir **ISS-037** con `issues/screenshots/visualización_fecha.png` — las fechas en Configuración de menú. (`opcional_1.png` y `opcional_2.png` **no** eran issue, confirmado por el usuario — **borradas el 2026-08-16**, no las busques.) Puede que ISS-035 ya lo haya resuelto: si no veía el stepper por el scroll, quizá tampoco veía el paso 3. **Verificar con ella antes de escribir código.** La captura ya está commiteada (2026-08-16) — antes vivía solo en una de las 2 laptops. | 🟢 Listo para hacer | — |
| **T12** | Generador masivo de QR de mesas (`generarQRsMesas()`, `config.js:262`): el PNG descargado por mesa hoy es **solo el QR**, sin el número "Mesa X" — es un `<span>` aparte que no viaja en la imagen exportada. Componer un canvas nuevo (QR + etiqueta) antes de exportar, listo para imprimir/cortar. Surgió del feedback de campo del piloto #1 (`vision_negocio.md` §16, hallazgo 3) — la dueña quiere acrílicos portátiles con número + QR para reasignar a mesas que se juntan; el generador `1..N` ya le sirve tal cual, solo falta que el PNG incluya el número. | 🟢 Listo para hacer, no urgente | — |

### C · La regla de orden que ya se cumplió

> ✅ **Resuelta 2026-08-13.** Decía "T1 va antes que T4, sin excepción" — mientras T1
> (ISS-034) no estuviera desplegado y verificado, el único camino de la dueña para
> confirmar pagos viejos era el panel **Órdenes**, que funciona porque
> `GET /api/orders/activas` no filtra por fecha. Ahora que T1 está verificado en celular
> real, esa salida de emergencia ya no hace falta y T4 puede entrar sin la advertencia.

---

## 🚨 Semana de carga real — miércoles 12 a sábado 15 de agosto de 2026

> **CORREGIDO 2026-08-12.** Esta sección decía *"Miércoles 2026-08-12 — el primer reto"* y
> estaba escrita como si la atención masiva fuera **un solo día**. **No lo es: es toda la
> semana.** Miércoles, jueves, viernes y sábado con +60 menús; **el domingo es el único día
> tranquilo.** El error de encuadre llevó a recomendar "no toques nada hasta que pase el
> día", que aplicado toda la semana significaba **no desplegar nada hasta el domingo** —
> exactamente lo contrario del objetivo del mes de pruebas.

**El modelo de trabajo del usuario, que es el correcto:** probar en el servicio de la tarde
con 60+ pedidos, detectar errores reales, corregirlos esa misma noche y desplegar antes del
servicio siguiente. **Si no se mejora entre días, se nota.**

### 🕐 Ventana de deploy — el dato operativo

**El servicio es de 12:00 a 18:00.** Entonces:

- ❌ **Nunca desplegar entre las 12:00 y las 18:00.** Es el único horario prohibido.
- ✅ **Desplegar a partir de las 18:00**, apenas cierra. No dejarlo para la mañana
  siguiente: de noche queda la noche entera para verificar y la mañana de colchón. Un
  deploy a las 11:00 hace que cualquier problema explote dentro del servicio.

### 🚦 Qué se puede desplegar y cuándo

| | Qué es | Cuándo |
|---|---|---|
| 🟢 **Verde** | Fixes de frontend, backend aditivo, permisos. Cubiertos por tests y verificables en 2 minutos. | **Cualquier noche, después de las 18:00** |
| 🟡 **Ámbar** | Service worker, sesión/auth. Funcionan, pero afectan **cómo arranca** la app en los celulares. | Noche + **verificar en un celular real antes de dormir**. Preferir que salgan solos, no mezclados con otros cambios |
| 🔴 **Rojo** | Tocar por dentro Cola del día / Cocina, migraciones sobre datos reales, cualquier cosa que no se pueda verificar rápido. | **Domingo** |

**Lo único rojo hoy en la lista:** los **pasos 10-11 de Pensionistas** (meter una tercera
fuente dentro de `utils/colaDia.js`). Todo lo demás de T1-T11 es verde o ámbar.

**Es la primera vez que un restaurante piloto atiende volumen real con el sistema.** Más de 60 menús
vendidos por día, concentrados casi todos en el almuerzo. Todo lo que hoy funciona con 2-3 pedidos
simultáneos se prueba de verdad esta semana.

### Por qué el deploy dejó de ser rutina y es lo más urgente

**`ISS-026` es literalmente el bug de este escenario y está sin desplegar.** Se arregló el 2026-08-10
(commit `181ddf3`) y describe exactamente lo que pasa con carga: pedidos que no avanzan de etapa, que
vuelven a su zona anterior, y el error falso *"No se puede cambiar una orden pagado"* por doble tap.
Si el miércoles atienden 60+ menús con la versión que hoy corre en producción, chocan de frente con
él **en el peor día posible**.

`ISS-027` (sesión de 30 días) es el segundo: nadie quiere reloguearse en medio de un servicio lleno.

### Prioridades del martes 2026-08-11, en orden

> **Cierre de esta lista (2026-08-12):** ✅ hechos el **1**, el **2** y el **6**.
> El **3** sigue abierto y ahora es **T4**, con la advertencia de orden de la sección C
> (va después de T1). El **4** sigue abierto y es **T6**. El **5** sigue abierto y es
> **T5**. Se deja el texto original porque explica el porqué de cada prioridad.

1. **🔴 DEPLOY, primero que nada** — `181ddf3` (`ISS-026` + `ISS-027`) y `6d4576e` (`ISS-028`). No
   dejarlo para la tarde: hay que desplegar **con tiempo de sobra para probar en producción** y con
   margen de reacción si algo sale mal. Un deploy la noche del martes es la peor opción.
2. **🔴 Prueba de carga antes del miércoles** — ya existen `scripts/k6-load-test.js` y
   `scripts/k6-stress-test.js`. Vale correrlos contra un escenario de ~60 menús concentrados en 2
   horas. `better-sqlite3` es **síncrono** y bloquea el proceso entero: es justo el tipo de cosa que
   no se nota con 3 pedidos y sí con 60.
3. **🟡 Riesgo conocido sin resolver:** `GET /api/orders/activas` (el panel **Órdenes**, no la Cola)
   conserva su **N+1 y su falta de filtro por fecha** — quedó anotado en `status.md` (sesión
   2026-08-10) como deliberadamente no tocado. Con 60 pedidos en el día ese panel es candidato a
   ponerse lento. Migrarlo a `utils/colaDia.js` es directo si aparece el problema.
4. **🟡 Backup manual antes del miércoles.** El backup diario automático con restore probado sigue
   siendo un P1 pendiente (ver más abajo). Antes del primer día de volumen real conviene, como
   mínimo, un backup manual verificado: si algo se rompe con datos reales de 60 pedidos, no hay
   vuelta atrás.
5. **🟢 Contador "menús vendidos hoy"** — ver la sección de Reportería. **Es la métrica que la clienta
   va a querer mirar justo ese día**, y es mucho más chica que el rediseño completo. Si algo de
   features entra el martes, que sea esto.
6. ~~⏸️ Pensionistas — postergar.~~ **Anulado por el usuario la noche del 2026-08-11**: pidió
   avanzar igual pese al riesgo señalado acá. Se hizo el backend del MVP (pasos 1-5), probado a
   fondo en cada paso. Ver sección propia más abajo y `status.md` parte 7.

---

## Etapa actual

Producto online en `menupro.tech` con landing y **2 restaurantes piloto**. La etapa no es construir
features nuevas: es **pruebas con restaurantes reales hasta que un dueño pueda usar la app solo**. Las
pruebas existen para encontrar y arreglar estos problemas, no para esperar.

### Lo que revelaron los pilotos — de aquí salen las prioridades

| Piloto | Perfil | Qué pasó | Causa |
|---|---|---|---|
| #1 (sra. ~45) | dueña | Usó la app 13–14 de julio y la dejó. Quejas: letra chica, sin notificaciones, lentitud, botón de pago no visible | Casi todas coinciden con bugs reales activos esos días. Los fixes `ISS-018`–`ISS-024` se desplegaron **después** de sus dos días: probó una versión vieja |
| #2 (señor 70 + esposa 65) | dueños | "Hoy no, mañana mejor". **No lograba ni iniciar sesión** | Barrera de acceso: sesión que expiraba + credenciales difíciles de escribir en celular |

Con el piloto #2 se va más lento; con la señora de ~45 se retoma el contacto.

**Actualización 2026-08-13 (día 2 de la semana de carga real):** la dueña llegó tarde,
dejó a un encargado sin entrenar (por elección propia, pese a que se le sugirió varias
veces) y no revisó las reservas reales que entraron por QR ese día — ni el push le sonó en
su celular (sí suena en el demo, causa técnica sin confirmar todavía). Diagnóstico: no es
rechazo al producto — el lado cliente ya funciona — es un bloqueo operativo estructural:
el sistema depende de que ella esté presente porque no delega, probablemente porque
todavía no domina la herramienta al 100% ella misma. Se evaluó pausar el piloto e ir a
buscar un restaurante que sí delegue en su personal (para validar el flujo mozo/cocinero,
que ningún piloto actual permite probar) — **decisión: no pausar todavía**, no se cumplió
el plazo propio de 3-4 semanas fijado el 12/08. Sumar un piloto #3 con perfil delegador
queda anotado como idea en paralelo, sin candidato identificado. Detalle completo,
timeline y próximos pasos en `pilotos.md` → "Piloto #1 — continuación: retoma de pruebas,
agosto 2026".

---

## P0 — Features que salen directo de las pruebas

### 3.1 Letra aún más grande — ✅ Completado 2026-08-10
`ISS-028`. Escala **16,1 / 19,6 / 23,8px** (antes 14 / 16,1 / 18,2). Se mantienen 3 niveles, no 4:
menos opciones es mejor para un dueño de 70 años. Migración `mp-font-scale-v2` sube la preferencia
guardada un nivel, **nunca la baja**. `menu.html` (la carta del cliente) **no** se tocó — decisión del
usuario, queda para más adelante.

### 3.2 Sesión que no se cierre — ✅ Completado 2026-08-10
`ISS-027`. Sesión de **30 días** con renovación deslizante; admin del SaaS acotado a 1 día. La causa
real no era el `expiresIn` sino que la sesión vivía en `sessionStorage`, que el navegador borra al
cerrar la PWA. **Era probablemente el bug de adopción más caro del proyecto.**

### 3.3 Entrada directa a Cola del día — ⬜ PENDIENTE
**Único P0 de features abierto.** Toggle en Configuración: al iniciar sesión, abrir directamente el
panel Cola del día en lugar del dashboard. Opcional y por usuario/restaurante, para no romperle el
flujo a quien ya usa el resto.

**Complementos evaluados y no hechos** (venían con 3.2): PIN de 4–6 dígitos con teclado numérico en
lugar de contraseña, y revisar `login.html` (`autocapitalize`, `inputmode`, tamaños de input).

---

## P0 — Operativo

- [x] ~~Deploy del trabajo del 2026-08-10~~ — 2 commits: `181ddf3` (`ISS-027` + `ISS-026`) y
      `6d4576e` (`ISS-028`). **Confirmado en producción por el usuario el 2026-08-11**: probó Cola
      del día a mano y los pedidos avanzan de etapa suaves, sin los retrasos/trabas de antes.
- [x] ~~Confirmar VAPID keys reales~~ — **confirmado 2026-08-11.** El usuario verificó por SSH
      (`grep VAPID /var/www/menupro/.env`) que las 3 líneas (`VAPID_EMAIL`, `VAPID_PUBLIC_KEY`,
      `VAPID_PRIVATE_KEY`) existen y no están vacías en el `.env` de producción.
- [ ] **`ISS-025`** — feedback visible del estado de la suscripción push en Configuración. Hoy es
      silencioso (catch vacío): es imposible saber si está activa, denegada o sin keys.
- [x] ~~Deploy de lo acumulado de julio~~ — **hecho**, por la consola web del Droplet entre el
      2026-07-16 y el 2026-08-10 (no quedó registrado en su momento; corregido en `status.md`,
      sesión 2026-08-10 parte 3).
- ⏸️ **Auto-actualización del service worker — CONGELADO 2026-08-10.** Decisión del usuario. El
      enunciado original estaba equivocado (`skipWaiting` **ya existe** en `sw.js:20`) y la premisa
      también: el dueño **ya ve** la letra grande y el ícono "MP" en su celular, o sea que el SW se
      actualiza solo. Se valida con el deploy pendiente; si los cambios se ven sin cerrar y reabrir la
      app, **se borra del backlog**. Detalle en `status.md`, sesión 2026-08-10 (parte 3).

---

## 🔴 P0 — Reportería: rediseño completo (nuevo, 2026-08-10)

**La reportería actual no le sirve a la clienta.** Palabras del usuario: *"las gráficas son
microscópicas y no dan nada de valor que le interesa a la clienta"*. **Toda la reportería va a
cambiar** — no es un ajuste de tamaño, es un rediseño de qué se muestra y para qué.

### El dato #1 que la clienta quiere ver

> **Cuántos menús va vendiendo en ese momento, en el día.**

> 🚨 **Este número importa muchísimo más el miércoles 2026-08-12** (primera atención masiva, +60
> menús). Es exactamente el día en que la dueña va a querer mirar el contador cada rato. **Conviene
> separar el contador simple del rediseño completo:** un número grande y visible de "menús vendidos
> hoy" (una query de conteo + una tarjeta) es chico y entrega el 80% del valor; el rediseño de las
> gráficas puede esperar al jueves.

- Es **lo principal**, y hoy **no se muestra en ninguna parte**.
- **No importa si el menú vino por mesa o por reserva** — es la cantidad total de menús vendidos hoy.
  El sistema hoy separa esas dos fuentes en todos lados; para este número hay que unificarlas.
- Es un dato **en vivo**, para consultar en pleno servicio, no un reporte de cierre.

### Después de eso

- Qué **platos** va vendiendo (mismo criterio: del día, en vivo).
- **Requiere análisis previo** antes de implementar: qué métricas reemplazan a las actuales, cuáles
  se eliminan, y cómo se ve en un celular de 360px. No empezar por el código.

### Ya diagnosticado, aprovechar

`features.md` → "Estadísticas: qué pidió la gente hoy + fix del gráfico de barras chico"
(anotado 2026-07-13) ya tiene medio camino hecho:
- **Por qué el gráfico se ve chiquito:** `#chart-pedidos-wrap` (`owner.html:557`) solo tiene
  `min-height:220px`, sin `position:relative` ni alto fijo — a diferencia de los otros dos gráficos,
  que sí los tienen. Chart.js con `responsive:true` necesita ambos.
- **Por qué no sirve el dato:** `contarPedidosPorPlato()` en `routes/reportes.js` no filtra por fecha
  (es un acumulado histórico total) y obliga a elegir una sección/categoría a la vez.

---

## P1 — Antes de cobrarle al primer restaurante

- [ ] **Backup diario automático con restauración probada.** No basta con generarlo: hay que probar el
      restore completo.
- [ ] **Cobro recurrente** resuelto, para no perseguir pagos uno por uno.
- [ ] **Protocolo de onboarding** documentado en `pilotos.md`: instalar la PWA juntos, forzar cierre y
      reapertura, enviar una notificación de prueba y verificarla en su celular, quedarse a observar
      un servicio en hora punta, check-in día 1, 3 y 7.

---

## 🔴 P0 — Salido del uso real de la piloto (2026-08-12)

**T1, T2 y T3** de la tabla de arriba salieron de una sesión de uso real con la señora
del menú (piloto #1) — no de un test ni de una auditoría. Los tres están diagnosticados
en el código, con archivo y línea, en `status.md` (sesión 2026-08-12 parte 1). El más
grave es **T1**: la deja trabada **sin salida** al cerrar pedidos viejos de Yape/Plin.

- [x] ~~**`ISS-033`** — 14 rutas del panel sin `authorizePermiso()`~~ —
      ✅ **resuelto 2026-08-12.** Requisito previo al paso 7 de Pensionistas.
      Pendiente de deploy (**D4**).

---

## 🎯 Módulo Pensionistas — EN IMPLEMENTACIÓN (backend MVP: pasos 1-5 hechos, 2026-08-11 noche)

> **Decisión del usuario, 2026-08-11 noche:** avanzar el mismo día pese al riesgo señalado más
> arriba (víspera de la atención masiva). Confirmado explícitamente. El backend del MVP (tablas,
> rol, CRUD del owner, pedido con descuento de saldo, cancelación con devolución) ya está hecho y
> probado (723/723 jest). **Falta:** integración en Cola del día/Cocina, `login.html`
> `ROLE_REDIRECT`, `pensionista.html`, panel del owner en `owner.html`, reportería separada. Ver
> detalle en `status.md`, sesión 2026-08-11 parte 7.

**Casi todo el target tiene pensionistas almorzando en su menú, y lo piden.** No es especulativo: es
funcionalidad de segmento y probablemente un diferenciador, porque los sistemas de restaurante
genéricos no manejan comensales recurrentes con saldo prepagado.

**Estado: sin preguntas abiertas.** Todas las decisiones de negocio se cerraron el 2026-08-10 — ver
**`pensionistas.md` §0**, que manda sobre el resto de ese documento. Su dependencia era 3.2 (sesión
persistente), que ya está hecha.

### La lógica, en palabras del usuario

> "Se le coloca el dinero que tiene y él va gastando; si se necesita más, la señora le coloca más, y
> así ad infinitum."

1. El pensionista **es un usuario más**, creado desde el panel Usuarios que el owner ya usa, con rol
   nuevo `pensionista`.
2. El owner le **carga el dinero disponible**; cuando se acaba, recarga. Sin límite.
3. El pensionista **entra por el login normal** y pide desde `pensionista.html`; cada pedido le
   descuenta del saldo, sin pantalla de pago.
4. **Aviso de saldo bajo** (S/20 por defecto, configurable por restaurante).
5. **Saldo insuficiente bloquea el pedido.** Si el dueño quiere fiarle, le recarga.
6. ~~Todos los usuarios deben tener email `@menupro.tech`~~ — ✅ **hecho 2026-08-11**, ver abajo.

### Descartado — no volver sobre esto

- ❌ El "v1 recortado" sin login del pensionista (estuvo anotado aquí mismo el 2026-08-10 por la
  mañana; el usuario lo descartó ese día).
- ❌ `id_usuario` nullable — el pensionista siempre es un usuario real.
- ❌ Reutilizar `menu.html` con un "modo pensionista": es la carta pública por la que los 2 pilotos
  reciben pedidos hoy, y tocarla es riesgo puro. Va **`pensionista.html`**, página propia.

### Primer paso acordado (chico e independiente) — ✅ Completado 2026-08-11

Forzar `@menupro.tech` en la creación de usuarios: validación en `routes/usuarios.js` (400 claro si
el dominio no coincide, insensible a mayúsculas) + mismo chequeo en `public/js/modules/usuarios.js`
+ hint en el formulario de `owner.html` aclarando que no es un correo real. **No toca**
`routes/admin.js` (alta de un restaurante nuevo), donde el email sí es el real del dueño.
`tests/usuarios-email-dominio.test.js` (4 casos nuevos). 346/346 jest verde.

### Facilidad confirmada

Mandar al pensionista a su propia página **no es complicado**: `login.html:420` ya tiene el mapa
`ROLE_REDIRECT` por rol (hecho en `ISS-007`). Es agregar una línea.

### Sigue vigente del análisis original

- Reportería separada: recargas (ingreso real) vs. consumo (gasto de saldo ya cobrado), para no
  contar el mismo dinero dos veces en Ganancias — `pensionistas.md` §8.
- Devolución automática de saldo al cancelar un pedido; el pedido respeta stock y horario de atención.

---

## P2 — Congelado

- **Migración a PostgreSQL.** El disparador no es el número de restaurantes, es técnico: escrituras
  concurrentes, necesidades de backup/PITR, aislamiento por tenant.

---

## Comercial

> ⚠️ **El precio es tentativo y puede cambiar** (indicación del usuario, 2026-08-10). No tomarlo como
> dato firme para decisiones de producto.

- Precio de referencia: **S/250 al mes** por restaurante.
- **Gratis solo para los 2 pilotos actuales.** Desde el restaurante #3 se cobra.
- El precio se acuerda por escrito el día uno (aunque sea por WhatsApp): "gratis hasta tal fecha,
  después S/X", para que la conversión no sea una venta nueva.

### Perfil de cliente a buscar
Dueño de 25–45 años, ya usa Yape y WhatsApp Business, quizá vende por delivery, 1–2 mozos, carta que
cambia seguido.
