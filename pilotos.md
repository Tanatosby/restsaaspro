# Pilotos — Experiencias Reales con Restaurantes

> Este documento registra experiencias reales de restaurantes que prueban Menú Pro: qué pasó, qué dijo el
> dueño textualmente, qué hipótesis se manejaron y qué se aprendió. No es un tracker de bugs (eso vive en
> `issues/ISSUES.md`) — es el registro de cómo el producto se comporta frente a un usuario real del target
> exacto descrito en `vision_negocio.md` (restaurante de menú pequeño, acostumbrado a cuaderno y lapicero).
>
> **Por qué existe:** la resistencia al cambio y los bugs reales se sienten igual desde afuera ("no lo usa",
> "se queja", "pone excusas") pero requieren respuestas completamente distintas. Este doc obliga a cruzar
> la queja del dueño contra el estado técnico real (`status.md`, `issues/`) antes de sacar conclusiones.

---

## Piloto #1 — Karina Menú (menupro.tech/karinamenu)

### Timeline

| Fecha | Evento |
|-------|--------|
| 2026-07-02 (jueves) | Primer contacto con el restaurante |
| Semana del 2026-07-06 | Varias visitas mostrando la app; miércoles (08) y jueves (09) no se pudo concretar |
| 2026-07-10 (viernes) | La dueña dice: "ya, el lunes empezamos" |
| **2026-07-13 (lunes)** | **Día 1 de uso real** |
| 2026-07-14 (martes) | Día 2 de uso real |
| 2026-07-15 (miércoles) | No usó la app |
| 2026-07-16 (jueves) | Tampoco la usó — Pedro reporta el caso |
| Semana del 2026-07-20 (aprox.) | Se va de vacaciones — no abriría la app hasta su vuelta |
| Agosto 2026 (fecha exacta sin confirmar) | Retoma — pausa temporal por calendario, no abandono confirmado |

La dueña lleva **13 años** vendiendo menús con cuaderno — es el hábito que Menú Pro compite contra, no una simple preferencia.

### Quejas reportadas (en sus palabras, resumidas por Pedro)

1. Tamaño de letra muy chico
2. Sin notificaciones/alertas cuando el celular está sin usar — lo comparó explícitamente con WhatsApp o Temu, que suenan y muestran mensaje en pantalla aunque el celular esté bloqueado
3. Lentitud al abrir la app, varios momentos de lentitud notados
4. "Era difícil" — en parte porque el botón de pago no se veía en pantalla
5. No configuró el menú del día de hoy (16 de julio), pese a que se le explicó que podía dejarlo configurado con anticipación

### Cruce contra el estado técnico real

| Queja | Estado real según `status.md` / `issues/` |
|-------|---|
| Tamaño de letra chico | La feature de tamaño ajustable **no existía hasta el 2026-07-14** (su día 2) |
| "El pago no se veía" | [`ISS-018`](issues/ISS-018-boton-pago-sin-scroll.md) — botón "Ya pagué" cortado, sin scroll — resuelto **2026-07-13**, el mismo día que ella empezó |
| Lentitud al abrir la app | [`ISS-023`](issues/ISS-023-cola-lenta-reservas-sin-filtrar.md) — Cola del día bloqueaba el proceso Node entero en horas pico — resuelto **2026-07-14** |
| Sin notificaciones tipo WhatsApp/Temu | El push hoy **solo** existe para "hora de preparar" (X min antes de una reserva confirmada) — no existe ningún push para "pedido/reserva nueva". No es un bug: ese trigger nunca se construyó |
| No configuró el menú de hoy | Sin recordatorio activo en el sistema — depende 100% de que ella recuerde hacerlo sola |

**Hallazgo clave — [`ISS-022`](issues/ISS-022-service-worker-cache-desactualizado.md):** el Service Worker sirvió `owner.html`/`owner.css` cacheados desde el 2026-05-29 hasta que se corrigió el **2026-07-14**. El propio issue documenta que el fix requiere que el usuario **cierre y reabra la PWA una vez** para que el navegador note la versión nueva — nadie le indicó eso a ella. Es decir: aunque el 14 de julio se corrigieron en el servidor el tamaño de letra y la lentitud, es muy probable que su celular **siguiera sirviendo la versión vieja y rota** (letra chica + botón de pago cortado + lentitud) durante todo su periodo de prueba. Dejó de usarla el miércoles/jueves — posiblemente **sin haber visto ni un solo día la versión ya corregida**.

### Reencuadre

La lectura inicial fue "resistencia al cambio". Cruzando el timeline contra el historial técnico, la explicación más simple y mejor sustentada es otra: **probó el producto durante su única ventana real de prueba (2 días) con 3 fallas activas simultáneas** (letra ilegible, botón de pago invisible, lentitud real medida y documentada), y un bug de caché puede haber bloqueado que llegara a ver ninguna de las correcciones posteriores, aunque existieran en el servidor desde el día 2.

13 años de hábito con cuaderno siguen siendo un factor real, pero no hace falta invocarlo como explicación principal cuando hay fallas técnicas concretas, documentadas y fechadas cubriendo exactamente esos dos días. El "no configuró el menú de hoy" tampoco alcanza para leerse como pérdida de interés: coincide con dos días previos de mala experiencia sin garantía de haber visto los fixes.

**Sobre las vacaciones:** al confirmar que vuelve en agosto (no un "no vuelve a abrir" indefinido), esto se lee como una pausa real de calendario y no como un tercer motivo de abandono. De todos modos, dado el patrón de motivos distintos apareciendo uno tras otro (dificultad → menú sin configurar → vacaciones), vale la pena un gesto de bajo costo antes de que se vaya: mostrarle la versión ya corregida y que la abra una vez, para que retome en agosto con la app funcionando bien en vez de con el recuerdo de la primera semana rota.

### Aprendizajes para pilotos futuros

- **Nunca lanzar un piloto en una ventana con fixes activos en curso.** Este restaurante empezó el mismo día que se cerraban ISS-018 y arrancó su segundo día con font-size/ISS-023 recién resueltos — el peor momento posible para medir "¿le gusta el producto?".
- **El caché de Service Worker es invisible para el usuario y para nosotros.** Sin decirle explícitamente "cierra y vuelve a abrir la app" tras cada fix relevante, no hay forma de saber si el dueño ve la versión corregida o la rota.
- **Las expectativas de notificación se calibran contra apps que ya usa** (WhatsApp, Temu), no contra lo que el sistema decidió construir. Vale preguntar explícitamente qué espera antes de asumir que "hora de preparar" cubre la necesidad.
- **Falta feedback visible sobre el estado del push** (activo/denegado/sin configurar) — hoy es 100% silencioso, ver `issues/ISS-025-push-no-llega.md`.

### Pendiente / próximos pasos

1. Antes de que se vaya de vacaciones (semana del 2026-07-20): mostrarle la versión ya corregida y lograr que la abra una vez — gesto de bajo costo para que retome en agosto con la app funcionando bien, no con el recuerdo de la primera semana rota.
2. Volver a hablar con la dueña — idealmente en persona o guiándola por llamada — y forzar un cierre completo + reapertura de la PWA (o reinstalación) antes de cualquier conclusión, para garantizar que vea letra ajustable, botón de pago visible y la mejora de velocidad.
3. Confirmar VAPID keys reales en el `.env` de producción y validar con ella si el push de "hora de preparar" suena una vez limpio el caché.
4. Decidir si se construye push para "pedido/reserva nueva" (lo que ella parece esperar realmente) — si se aprueba, anotar como gap nuevo en `vision_negocio.md`.
5. Evaluar un recordatorio periódico ("no olvides configurar el menú de mañana") si el patrón de menú-sin-configurar se repite con otros restaurantes.
6. **En paralelo, no en espera:** arrancar un segundo restaurante piloto ahora — un mes de pausa (hasta agosto) es tiempo de aprendizaje que no conviene perder, y no le quita nada a que ella retome cuando vuelva.
7. Una vez repetida la prueba con la versión realmente corregida (antes de irse o al volver en agosto), registrar el resultado en una nueva entrada de este documento (no sobreescribir la de arriba — el valor está en ver la evolución).

---

## Piloto #1 — continuación: retoma de pruebas, agosto 2026

Cumpliendo el punto 7 de arriba: la dueña volvió de la pausa y retomó pruebas justo en la
primera semana de carga real del negocio (+60 menús/día, miércoles a sábado). Esta entrada
no reemplaza la de julio — es la evolución.

> **Convención de conteo, formalizada 2026-08-14:** esta vuelta a pruebas se cuenta en
> **"Día N de retoma"**, empezando en **Día 1 = 2026-08-12** (visita en persona, primer
> contacto de esta etapa). Cada día calendario que pasa suma uno, tenga o no un hallazgo
> para registrar. De acá en adelante cada entrada nueva de esta sección arranca con
> `### Día N (fecha) — título corto`, para no depender de inferir la cuenta después. El
> checkpoint de 3-4 semanas fijado el 2026-08-12 sigue siendo una fecha calendario aparte
> (no depende de este conteo de días).

### Timeline

| Día de retoma | Fecha | Evento |
|---|-------|--------|
| Día 1 | 2026-08-12 (miércoles) | Visita en persona del usuario. 4 hallazgos — detalle completo en `vision_negocio.md` §16 (percepción mejoró; sigue el cuaderno en paralelo "hasta que los chicos se acostumbren" / "hasta que tenga forma de identificar las mesas"; problema real de numeración de mesas al juntarse, con solución propia de la dueña; fricción confirmada por clientas en el pago Yape/Plin). |
| Día 2 | 2026-08-13 (jueves) | Día 2 de la semana de carga real del negocio. La dueña llegó tarde y dejó a un encargado a cargo del local. Entraron **más de una reserva real por el QR** y no las revisó — el cuaderno siguió siendo la única fuente que miró. |
| Día 3 | 2026-08-14 (viernes) | Check-in sin incidente puntual — balance general de adaptación (ver abajo) + 3 detalles de uso real que se documentaron como issues nuevos. |
| — | 2026-08-15 (sábado) | **Restaurante cerrado / sin uso** — el único día de pausa desde que retomó el 12 de agosto. |
| Día 4 | 2026-08-17 (lunes) | Recopilación en persona: cocinera adaptándose bien, dueña todavía no; 4 clientes no pudieron pedir por la app; incidente de un plato sin su proteína (→ ISS-046); pedido de un contador "Menús de hoy"; pregunta sobre comprobantes Yape duplicados; pedido de poder descargar la foto del menú. Detalle abajo. |
| Día 5 | 2026-08-18 (martes) | Se despliegan las respuestas al Día 4 (descarga de foto, "Agregar manual", conteo de menús). Incidente nuevo: un pedido de 2 menús —uno para llevar, otro para comer ahí— que el sistema no podía separar (→ ISS-047). La dueña dice que le gustaría probar Pensionistas (saldo en cuenta en vez de foto o efectivo). Detalle abajo. |
| Día 6 | 2026-08-19 (miércoles) | **Hoy.** ISS-047 implementado y desplegado. Pensionistas Fase 1 (panel del owner) y Fase 2 (`pensionista.html`) completadas, pendientes de deploy. Sin visita/reporte nuevo del piloto registrado todavía — día en curso. |

> **El domingo 16 de agosto no lleva número de "Día" en esta tabla:** no hay reporte de uso ni de
> pausa para esa fecha — a diferencia del sábado 15, que el usuario confirmó explícitamente como
> el día de pausa. Los "Día 4/5/6" de acá en más se cuentan sobre días con reporte real, no sobre
> el calendario estricto — ajuste de la convención original del 2026-08-14 a como se usó en la
> práctica (confirmado por las fechas de `status.md`: la sesión que recopiló "día 4 del piloto"
> es del 2026-08-17, lunes).

> **Corrección 2026-08-19:** los días de la semana de esta tabla estaban corridos un día (decía
> "martes/miércoles/jueves", debía decir "miércoles/jueves/viernes" — 2026-08-12 es miércoles).
> Las fechas en sí (12/13/14) siempre estuvieron bien; solo el nombre del día estaba mal. Detectado
> al cruzar contra el calendario real cuando el usuario confirmó "se regresó a trabajar el
> miércoles 12 de agosto".

### Día 2 (2026-08-13) — llegó tarde, encargado sin entrenar no revisó reservas

**1. El push no sonó en su celular.** Confirmado explícitamente por ella ("no le vibró ni le
sonó nada"). En el celular demo del usuario sí suena — descarta que el sistema esté roto en
general, pero deja abierta la duda sobre su suscripción/celular específico (permiso
revocado, ahorro de batería matando el service worker, o suscripción nunca confirmada). Sin
diagnosticar todavía — `Configuración` no muestra el estado de la suscripción (pieza de
`ISS-025` que sigue abierta, ver `backlog.md` § P0 Operativo).

**2. El encargado que la cubrió no usa la app — por elección de ella, no por falta de
tiempo.** El usuario ya le había sugerido varias veces que entrene a alguien para cuando
ella no esté, y no lo hizo. Ella misma, al preguntarle por qué no revisó las reservas,
contestó: *"hoy el problema es que llegué tarde, así que mañana llegaré temprano"* —
una explicación real pero parcial: no aborda que, aunque el push hubiera sonado, no había
nadie presente capaz de actuar sobre él.

### Reencuadre

El fallo de hoy no es evidencia de rechazo al producto ni de "target equivocado" — de hecho
el lado del cliente funcionó: hubo reservas reales entrando por el QR sin fricción, la señal
que faltaba en julio. El bloqueo está 100% del lado operativo, y es estructural, no
anecdótico: **el sistema depende de que una sola persona (la dueña) esté presente y
atenta**, porque ella no delega su uso en el personal.

La hipótesis más sostenida (del usuario, con base en el patrón observado): no delega porque
ella misma todavía no domina el sistema al 100% — con solo 2-3 días reales de uso
acumulados desde julio (cortados por vacaciones), es poco tiempo para pedirle que además
sea quien capacita a otra persona. La delegación normalmente **sigue** al dominio personal,
no lo precede.

**Se evaluó pausar el piloto #1** e ir directamente a reclutar un restaurante que sí delegue
en su personal, para poder validar por fin el flujo multi-rol (mozo/cocinero) que ningún
piloto actual permite probar — ni este (no delega) ni el piloto #2 (ni siquiera lograba
loguearse). **Decisión: no pausar todavía.** No se cumplió el plazo propio fijado el
2026-08-12 (3-4 semanas antes de sacar conclusiones sobre el cuaderno), y el lado cliente ya
está funcionando. Sumar un piloto #3 con perfil de equipo/delegación queda como algo a hacer
**en paralelo, no en reemplazo**, si aparece un candidato concreto — a la fecha no hay uno
identificado. Nota de negocio pendiente si se concreta: `backlog.md` fija que desde el
restaurante #3 se cobra — habría que decidir explícitamente si este entra gratis o pago.

### Aprendizajes

- **La delegación sigue al dominio personal, no lo precede.** Insistirle a un dueño que
  entrene a su personal antes de que él mismo se sienta firme con la herramienta es pedirle
  un paso que todavía no puede dar — no es terquedad, es no poder enseñar lo que uno no
  domina.
- **El verdadero diferencial frente al cuaderno, en este caso, no es la velocidad — es que
  se puede revisar de forma remota.** El cuaderno es inútil si la dueña no está físicamente
  en el local; la app no. Ese argumento resuelve su miedo puntual (llegar tarde) sin tocar
  el tema sensible de la confianza en su personal.
- **Un día cubierto por un encargado sin entrenar es evidencia de baja calidad sobre
  adopción.** No sorprende que no se haya usado la app — confirma un hueco ya conocido
  (12/08), no revela uno nuevo. No inflar su peso en la lectura general del piloto.

### Pendiente / próximos pasos

1. Próxima conversación con ella: sugerirle revisar el celular en el camino si vuelve a
   llegar tarde — resuelve su problema concreto sin pedirle que confíe en su personal.
2. No insistir por ahora en que entrene a su encargado — ya se le pidió 3 veces sin efecto;
   dejar que se resuelva con más tiempo de uso propio.
3. Chequeo técnico pendiente: confirmar si su celular específico recibe el push (posible
   causa: permiso revocado, ahorro de batería, suscripción no confirmada) — vinculado a la
   pieza de `ISS-025` aún abierta (visibilidad del estado de suscripción en Configuración).
4. Mantener el checkpoint de 3-4 semanas fijado el 2026-08-12 antes de concluir nada sobre
   el cuaderno.
5. Si aparece un candidato concreto para piloto #3 con perfil de equipo/delegación,
   evaluarlo en paralelo — sin urgencia, sin candidato identificado a la fecha.

### Día 3 (2026-08-14) — seguimos en pruebas, adaptación gradual

Seguimos en la misma etapa: la dueña se sigue adecuando al sistema poco a poco, todavía sin
checkpoint cumplido (punto 4 de arriba). No es un evento puntual como el del Día 2 — es una
lectura de cómo va el uso en general, útil precisamente porque de ahí van saliendo detalles
concretos que ninguna prueba de escritorio muestra.

**Balance reportado por el usuario:**

- **La dueña necesita más acompañamiento al usar la app** — sigue sin sentirse del todo
  autónoma. Coincide con la hipótesis ya registrada arriba (2026-08-13): la delegación en su
  personal sigue frenada porque ella misma todavía no domina el sistema al 100%.
- **Los clientes se adaptaron mejor que ella** — el lado comensal (pedir/reservar por QR) se
  percibe más fácil de usar que el lado dueña/operación. Consistente con lo ya visto: el
  flujo de cliente viene funcionando bien desde el hallazgo del 12/08 (reservas reales por
  QR sin fricción).
- **El cambio en el flujo de pago mejoró notablemente el uso.** No se precisó a cuál cambio
  puntual se refiere (candidatos recientes: ISS-039, timeouts y mensajes de paso en
  "Enviando…"; o mejoras previas de la pantalla de pago) — a confirmar en una próxima
  conversación si vale la pena identificar cuál tuvo más impacto.

**De esta ronda de uso real salieron 3 issues nuevos**, documentados el mismo día (sin
implementar todavía, a pedido del usuario — quedan con prioridad 🔴 Crítica en
`issues/ISSUES.md`):

- [`ISS-040`](issues/ISS-040-monto-no-visible-en-pago.md) — el comensal no ve cuánto tiene
  que pagar justo al momento de hacer el Yape/Plin.
- [`ISS-041`](issues/ISS-041-menus-multiples-sin-anidar.md) — dos menús del día en un mismo
  pedido no se pueden diferenciar en cocina/panel (qué entrada va con qué segundo).
- [`ISS-042`](issues/ISS-042-para-llevar-no-viaja-cocina.md) — la etiqueta "para llevar" no
  le llega al cocinero, aunque el dato ya existe en el backend.

**Lectura:** el patrón se sostiene. Cuantas más horas reales acumula la dueña, más aparecen
estos detalles finos (no fallas graves, sino fricciones puntuales en momentos específicos del
flujo) — es la señal de que el uso está avanzando, no de que el producto esté fallando.

### Sábado 2026-08-15 — pausa

Restaurante cerrado / sin uso. Único día de pausa desde que retomó el 12 de agosto.

### Día 4 (2026-08-17, lunes) — cocinera adaptándose bien, dueña todavía no, 4 clientes sin poder pedir

Recopilación en persona del usuario tras la visita. El hallazgo central fue un incidente
técnico real: un plato **"arroz con papas fritas" pedido sin su proteína**, porque el sistema
no distinguía platos autocontenidos de los que sí necesitan una sección adicional — quedó
como [`ISS-046`](issues/ISS-046-plato-exige-seccion-condicional.md), resuelto y desplegado el
mismo día (`a47d132`).

**El resto de lo reportado ese día:**

- **La cocinera se está adaptando bien; la dueña todavía no.** Primera vez que se registra una
  diferencia clara entre los dos roles — hasta acá todo el balance de adopción hablaba solo de
  la dueña.
- **4 clientes no pudieron pedir por la app**: 2 se rehusaron, 1 sin internet, 1 sin celular.
  Disparó el pedido de un botón para cargar esos pedidos a mano — quedó implementado como
  "Agregar manual" en la Cola del día (desplegado 2026-08-18, ver Día 5).
- **Pedido de un contador "Menús de hoy"** en Análisis (menús cobrados + entregados del día).
  De paso se encontró un bug de conteo real en `reportes.js` (dividía por el total de secciones
  en vez de por las obligatorias, subcontando) — los dos se resolvieron juntos el Día 5.
- **Pregunta de la dueña sobre comprobantes de Yape duplicados:** *"¿qué pasa si un chico
  comparte su pago de Yape con otro y ambos envían la misma captura?"* — problema real, sin
  alcance definido todavía. Diagnóstico técnico hecho el 2026-08-19: `routes/public.js` guarda
  el comprobante pero no compara nada; lo barato es hashear el archivo al subirlo, con la
  salvedad de que solo atrapa el archivo idéntico, no una recaptura. **Sin implementar.**
- **Pedido de poder descargar la foto del menú** para compartirlo por WhatsApp — construido el
  mismo día, desplegado el Día 5 (`9c9de62` + `32c8fb0`).

### Día 5 (2026-08-18, martes) — se despliega lo del Día 4, aparece el pedido mixto, pensionistas

Se desplegaron las tres respuestas al Día 4 que ya estaban listas: descarga de foto del menú,
botón "Agregar manual" y fix del conteo de menús + tarjeta "Menús de hoy" (`9c9de62`+`32c8fb0`
y `bc593a4`+`14ce74f`).

**Incidente nuevo:** una persona pidió **2 menús, uno para llevar y otro para comer en el
local**, y el sistema no permitía separarlos — o todo el pedido era para llevar, o todo era
para comer ahí. Quedó como [`ISS-047`](issues/ISS-047-modalidad-por-menu.md); de paso se
encontró que además **cobraba de más** (2 envases en vez de 1). Implementado y desplegado al
día siguiente (Día 6).

**La dueña dijo que le gustaría probar Pensionistas** — que sus comensales recurrentes tengan
saldo en cuenta en vez de mandar foto de Yape o pagar en efectivo cada vez. El backend de este
módulo ya estaba armado desde el 11 de agosto; faltaba toda la parte visible.

### Día 6 (2026-08-19, miércoles) — hoy

- **ISS-047 implementado y desplegado**, confirmado por el usuario.
- **Pensionistas Fase 1** (panel del owner: alta, recarga, historial de movimientos, baja
  lógica) y **Fase 2** (`pensionista.html`: pedir con saldo, sin pantalla de pago, "Mis
  pedidos" en vivo) — las dos completadas hoy en respuesta directa al pedido del Día 5,
  **pendientes de deploy**.
- Día en curso — sin visita/reporte nuevo del piloto más allá de lo de arriba.

> **ISS-048 no va acá:** el usuario confirmó que lo encontró probando él mismo, no la dueña — no
> es una experiencia real del piloto, así que queda solo en `issues/` y `status.md`.

---

## Plantilla para el próximo piloto

```
## Piloto #N — [Nombre o identificador]

### Timeline
| Fecha | Evento |

### Quejas reportadas

### Cruce contra el estado técnico real
| Queja | Estado real |

### Reencuadre

### Aprendizajes

### Pendiente / próximos pasos
```
