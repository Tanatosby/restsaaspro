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

**Horario del local (dato permanente, confirmado 2026-08-24):** no abre los domingos. Al
numerar "Día N" del piloto, no asumir que un domingo tuvo actividad — si algo se cuenta fechado
en domingo, verificar con el usuario antes de registrarlo (ver corrección del "Día 10" más
abajo, que originalmente quedó mal fechado en domingo).

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
| Día 5 | 2026-08-18 (martes) | Se despliegan las respuestas al Día 4 (descarga de foto, "Agregar manual", conteo de menús). Tres incidentes nuevos, todos contados el Día 6: un pedido de 2 menús —uno para llevar, otro para comer ahí— que el sistema no podía separar (→ ISS-047); un pedido perdido al salir a pagar por Yape, la pestaña "se reiniciaba" (→ ISS-049); y un número de pedido que no coincidía entre el comensal y la dueña (→ ISS-050). La dueña dice que le gustaría probar Pensionistas (saldo en cuenta en vez de foto o efectivo). Detalle abajo. |
| Día 6 | 2026-08-19 (miércoles) | ISS-047, Pensionistas Fase 1+2 (`pensionista.html`), ISS-048, ISS-049, ISS-050 e ISS-051 implementados y **desplegados**. |
| Día 7 | 2026-08-20 (jueves) | Recopilación en persona, contada por el usuario el 2026-08-21: la cocinera mandó pedidos a "Listo" por error sin poder revertirlo; la dueña pidió contar ventas por plato y preguntó por fotos pasadas de comprobantes; un cliente no encontraba cómo volver a la app tras pagar por Yape; otro cliente dijo que prefiere pedir oralmente o a lápiz; y un cliente no alcanzaba a leer bien las letras de la carta. Detalle abajo. |
| Día 8 | 2026-08-21 (viernes) | Contado por el usuario el mismo día: la cocinera canceló un pedido por error y la dueña preguntó si se puede "devolver" para que cuente como venta (→ ISS-059); y pregunta de la dueña sobre cómo los pensionistas descargan/acceden a la app, que llevó a decidir un acceso desde `menu.html` (→ ISS-060). Detalle abajo. |
| Día 9 | 2026-08-22 (sábado) | Contado por el usuario el 2026-08-24: status "En preparación" poco claro para el cliente (→ ISS-061), zona Cocina de la Cola del día sin botón "Listo" (→ ISS-062), pedido de reordenar Reservas para mostrar la carta antes que el formulario (→ ISS-063) y de poder repetir un mismo menú sin rearmarlo desde cero (→ ISS-064). Mockups aprobados antes de codear; los 4 implementados y verificados el mismo 2026-08-24. |
| Día 10 | 2026-08-23 (domingo) | Contado por el usuario el 2026-08-24, junto con el Día 9: un comensal no pudo reservar por no poner hora de llegada — la reserva se bloqueaba validando el horario de "ahora" en vez de simplemente dejarla pasar (→ ISS-065). El usuario lo asumió como error de diseño propio y pidió la corrección en el momento; implementado y verificado el mismo 2026-08-24. Queda pendiente (no implementado) agregar un tooltip junto al campo explicando que la hora es opcional/informativa. |
| Día 11 | 2026-08-25 (martes) | Contado por el usuario, sin visita en persona: la dueña sigue confundiendo "Cola" con "Reservas" — retoma del punto 1 del Día 10 (visita en persona), esta vez la causa real es que "Reservas" queda en la posición del medio del bottom-nav y lo toca por error yendo hacia "Cola" (→ ISS-071). También se cerró la decisión pendiente de Compatibilidad de platos (Opción A, → ISS-070) y se agregó explicación permanente de Obligatoria/Opcional. Más tarde el mismo día: confusión con el cobro Yape/Plin en 2 clics vs. 1 en efectivo (→ ISS-072, reducido a 1 clic) y pedido de aplicar el anti-parpadeo de Cola a Cocina/Órdenes/Reservas (→ ISS-073) + mostrar la mesa grande en vez del # de orden (→ ISS-074). Detalle abajo. |
| Día 12 | 2026-08-26 (miércoles) | Contado por el usuario, sin visita en persona. Seguimiento de ISS-074 (mesa mejor, pero el # de orden sigue confundiendo, piden sacarlo) e ISS-073 (ya no parpadea, pero el refresco de Cocina sigue siendo incómodo). 5 hallazgos nuevos de comensales: stock agotado a mitad de un pedido obliga a rehacer todo desde cero, no se puede editar un menú puntual del carrito, elegir el mismo menú para varias personas seguidas no es intuitivo, el botón del carrito es poco descubrible, y nombre+foto es un paso complicado para varios (recomienda agrandarlo). **Sin implementar — a discutir en la próxima sesión.** Detalle abajo. |

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
  comparte su pago de Yape con otro y ambos envían la misma captura?"* — problema real.
  Diagnosticado el 2026-08-19 e implementado el mismo día: hashear el archivo al subirlo y
  avisar al owner si ya se usó antes, sin bloquear al comensal. Queda como
  [`ISS-051`](issues/ISS-051-comprobante-duplicado.md), desplegado el Día 6. Solo atrapa el
  archivo idéntico, no una recaptura.
- **Pedido de poder descargar la foto del menú** para compartirlo por WhatsApp — construido el
  mismo día, desplegado el Día 5 (`9c9de62` + `32c8fb0`).

### Día 5 (2026-08-18, martes) — pedido mixto, pedido perdido al pagar, número de pedido, pensionistas

Se desplegaron las tres respuestas al Día 4 que ya estaban listas: descarga de foto del menú,
botón "Agregar manual" y fix del conteo de menús + tarjeta "Menús de hoy" (`9c9de62`+`32c8fb0`
y `bc593a4`+`14ce74f`).

**Incidente 1:** una persona pidió **2 menús, uno para llevar y otro para comer en el
local**, y el sistema no permitía separarlos — o todo el pedido era para llevar, o todo era
para comer ahí. Quedó como [`ISS-047`](issues/ISS-047-modalidad-por-menu.md); de paso se
encontró que además **cobraba de más** (2 envases en vez de 1). Implementado y desplegado al
día siguiente (Día 6).

**Incidente 2 — el más grave del día, contado el 2026-08-19:** una persona estaba pidiendo,
copió el número de Yape para pagar, cambió a la app de Yape y al volver a la pestaña "ya había
expirado" — tuvo que rehacer el pedido entero. La dueña, textual: *"Uy, ¿ahí no se puede hacer
algo? porque si se les reinicia cada vez que pagan van a aburrirse de usar la app."* No era un
caso raro — `menu.html` no guardaba nada del pedido en curso, y en un celular de gama media
Chrome puede descargar la pestaña de fondo mientras el comensal está pagando en otra app,
recargándola de cero al volver. Quedó como
[`ISS-049`](issues/ISS-049-pedido-se-pierde-al-salir-a-pagar.md), implementado y desplegado
2026-08-19 (Día 6).

**Incidente 3 — contado el 2026-08-19:** una clienta dijo *"mi orden de pedido me sale 96"*,
pero la dueña solo veía órdenes del 1 al 22 ese día. Causa: el comensal veía el id crudo de la
tabla (sigue de corrido, nunca se reinicia); la dueña ya veía `numero_dia` (1, 2, 3… por día) en
sus propias vistas — dos numeraciones distintas para el mismo pedido. Quedó como
[`ISS-050`](issues/ISS-050-numero-de-pedido-no-coincide.md), implementado y desplegado el Día 6.

**La dueña dijo que le gustaría probar Pensionistas** — que sus comensales recurrentes tengan
saldo en cuenta en vez de mandar foto de Yape o pagar en efectivo cada vez. El backend de este
módulo ya estaba armado desde el 11 de agosto; faltaba toda la parte visible.

### Día 6 (2026-08-19, miércoles) — hoy

- **ISS-047 implementado y desplegado**, confirmado por el usuario.
- **Pensionistas Fase 1** (panel del owner: alta, recarga, historial de movimientos, baja
  lógica) y **Fase 2** (`pensionista.html`: pedir con saldo, sin pantalla de pago, "Mis
  pedidos" en vivo) — las dos completadas hoy en respuesta directa al pedido del Día 5, y
  **desplegadas** el mismo día.
- **ISS-049 implementado y desplegado** — el pedido perdido al salir a pagar (Día 5, la frase
  de la dueña sobre "aburrirse de usar la app"). Prioridad alta a pedido explícito del usuario.
- **ISS-050 implementado y desplegado** — el número de pedido no coincidía entre lo que veía
  el comensal y lo que veía la dueña (Día 5, "mi orden me sale 96").
- **ISS-051 implementado y desplegado** — detección de comprobante Yape/Plin reutilizado
  (pregunta de la dueña, Día 4). Avisa al owner, no bloquea al comensal.
- ISS-048 (bug propio, ver nota abajo) también desplegado hoy.
- Día en curso — sin visita/reporte nuevo del piloto más allá de lo de arriba. Pensionistas
  todavía no tiene un pensionista real dado de alta ni probado en el celular de la dueña.

> **ISS-048 no va acá:** el usuario confirmó que lo encontró probando él mismo, no la dueña — no
> es una experiencia real del piloto, así que queda solo en `issues/` y `status.md`.

### Día 7 (2026-08-20, jueves) — cocinera sin forma de deshacer "Listo", dueña pide contar por plato, cliente perdido al volver de pagar

Recopilación en persona del usuario, contada el 2026-08-21 (un día después de la visita —
confirmado explícitamente con el usuario para no repetir el hueco de fechas del
2026-08-19).

**1. La cocinera mandó pedidos a "Listo" sin querer y no podía revertirlo.** Textual:
*"Pedro, no me puedes hacer que de Listos pueda regresar a cocina, mandé algunos menús a
listo por casualidad y no podía volver a cocina."* Pidió puntualmente un botón "Regresar"
en la zona Listos, por orden individual (ej. el pedido #12 vuelve a #12, sin tocar el #11
ni el #13). Diagnosticado: el backend ya permitía el cambio de flag hacia atrás, solo
faltaba el botón — queda como [`ISS-055`](issues/ISS-055-regresar-listos-a-cocina.md).

**2. La dueña quiere contar ventas por plato.** Textual: *"¿cómo puedo filtrar por plato?
por ejemplo, ¿cuántos asados he vendido?, cuántos pollos al horno?"* — preguntó
puntualmente por un filtro en Órdenes y Reservas. Se decidió no construir un filtro manual
(selects son lentos en celular durante el servicio) sino enganchar el pedido al ítem ya
abierto en `backlog.md` de rediseño de Reportería ("qué platos va vendiendo, del día, en
vivo"): una lista automática "Platos vendidos hoy" sin selects.

**3. La dueña preguntó por las fotos de comprobantes pasados.** Textual: *"¿No puedo ver
las fotos pasadas? porque quiero revalidar por si acaso se me pasa uno que no estoy segura
que cobré."* Primer diagnóstico (equivocado, corregido en la misma sesión tras confirmar con
el usuario que en Historial de verdad no se ve): el componente `comprobanteThumb()` sí está
llamado en el render de Órdenes → Historial, pero la query de
`GET /api/orders` (`routes/orders.js`) **nunca seleccionaba** `metodo_pago`, `estado_pago`
ni `comprobante_url` — la condición del frontend (`o.metodo_pago || o.es_manual`) siempre
daba falso ahí, así que la miniatura nunca se pintaba. Reservas → Historial sí estaba bien
(esos campos ya se seleccionaban en `routes/reservations.js`). Bug real, no de
descubribilidad — queda como [`ISS-058`](issues/ISS-058-historial-ordenes-sin-comprobante.md).

**4. Un cliente no encontraba cómo volver a la app después de pagar por Yape.** Textual del
cliente, citado por el usuario: *"No entiendo, salgo de la web y voy a mi yape, ya pagué,
¿cómo regreso a la app?"* — se quedaba en la pantalla de apps del celular. Distinto de
`ISS-049` (que evita que el pedido se pierda al recargar): acá el pedido sigue intacto, el
problema es puramente de navegación entre apps. Queda como
[`ISS-056`](issues/ISS-056-volver-de-yape-instrucciones.md).

**5. Comentario de un cliente, catalogado por el usuario como "netamente destructivo":**
*"la gente se va a aburrir, es ir de un sitio a otro, mejor es pedir oralmente y ya, es
mejor manejar todo por lápiz."* Un solo comentario, sin patrón repetido en el resto del
piloto (reservas por QR sin fricción, clientes adaptándose mejor que la propia dueña —
Día 3). Lectura del usuario y del asistente: probablemente la misma raíz que el hallazgo 4
(la fricción de saltar a Yape y no saber volver) — si eso se resuelve, este tipo de queja
baja sola. No genera acción de producto aparte.

**6. Un cliente no alcanzaba a leer bien las letras de la carta.** El tamaño de letra
ajustable (`ISS-028`, 2026-08-10) se construyó solo para `owner.html` — quedó anotado en su
momento en `backlog.md`: *"`menu.html` (la carta del cliente) no se tocó — decisión del
usuario, queda para más adelante."* Este reporte real confirma que hace falta. Queda como
[`ISS-057`](issues/ISS-057-letra-ajustable-menu-cliente.md).

**De esta ronda salieron 4 issues nuevos:** `ISS-055`, `ISS-056`, `ISS-057`, `ISS-058` —
implementados el mismo día que se registró esta entrada (2026-08-21), ver `status.md`.

### Día 8 (2026-08-21, viernes) — pedido cancelado sin poder revertir, acceso de pensionistas

Contado por el usuario el mismo día (sin el desfase de un día que tuvo el Día 7).

**1. La cocinera canceló un pedido por error y no se podía "devolver".** Textual de la dueña:
*"no puedo devolverla para que se cuente como menú?"* — quiere que el pedido vuelva a contar
como venta, no solo recuperar el ticket en pantalla. Distinto de `ISS-055` (Listo → Cocina):
ahí el backend ya permitía el regreso y solo faltaba el botón. Acá el backend **bloquea
explícitamente** cualquier cambio una vez que una orden/reserva queda `es_cancelado`
(`orders.js:440`, `reservations.js:282`, y la ruta de cocina `orders.js:707`) — cancelar es hoy
un estado terminal a propósito, y además **devuelve el stock** del plato (`devolverStock`).
Restaurar exige relajar esa regla y decidir qué pasa si el stock ya se agotó mientras tanto.
Los pedidos cancelados tampoco aparecen en ninguna zona de la Cola del día (`pedidos.js`) — solo
se ven en el Historial de Órdenes, de solo lectura. Diagnosticado, sin implementar — queda como
[`ISS-059`](issues/ISS-059-revertir-pedido-cancelado.md).

**2. La dueña preguntó cómo bajan la app sus pensionistas** y si convenía subirla a Play Store.
Se diagnosticó el flujo real: `pensionista.html` no es anónimo por slug como `menu.html` — es
una cuenta con rol, y hoy el único camino es que el dueño le dicte de palabra
`menupro.tech/login` más el correo inventado (`nombre@menupro.tech`) y contraseña que él mismo
le asigna al darlo de alta. No hay QR, ni link desde `menu.html`, ni URL con el nombre del
restaurante. Se descartó Play Store (fricción de cuenta de desarrollador + revisión, sin
aportar nada a un comensal que ya conoce el restaurante puntual) a favor de reforzar el
mecanismo de instalación PWA que ya existe. El usuario eligió, entre 3 opciones planteadas,
agregar un enlace **"¿Eres pensionista?"** visible en `menu.html` (la carta que el cliente ya
usa a diario) en vez de un QR aparte o una ruta dedicada. Diagnosticado y decidido, sin
implementar — queda como [`ISS-060`](issues/ISS-060-acceso-pensionista-menu.md).

### Día 9 (2026-08-22, sábado) — status confuso, botón Listo faltante, reordenar Reservas, repetir menú

Contado por el usuario el 2026-08-24 (desfase de 2 días, como el Día 7). Cuatro hallazgos de uso
real, los 2 últimos con mockup aprobado antes de codear:

**1. El status "En preparación" no le dejaba claro al cliente que su pedido estaba en curso.**
Cambiado a "Ya estamos cocinando tu pedido" — [`ISS-061`](issues/ISS-061-status-preparando-confuso.md).

**2. Desde la Cola del día, la zona Cocina solo tenía botón de cancelar, no de "Listo".**
`btnOrden()`/`btnReserva()` nunca manejaron esa zona. Agregado, simétrico con "↩️ Regresar a
cocina" (ISS-055) — [`ISS-062`](issues/ISS-062-boton-listo-zona-cocina.md).

**3. En Reservas se pedían los datos del comensal (nombre, hora, teléfono) antes de mostrar la
carta** — al revés que "Pedir". Reordenado: la carta primero, los datos en un drawer nuevo al
tocar la barra inferior, mismo patrón que el carrito de pedir. Mockup (artifact) aprobado antes
de implementar — [`ISS-063`](issues/ISS-063-reservas-formulario-antes-de-carta.md).

**4. Pedir 2 menús idénticos exigía reabrir el picker y volver a elegir todo desde cero.** Nuevo
atajo "+1 mismo menú" al agregar + agrupado visual con stepper en el carrito (Pedir y Reservar),
sin tocar la numeración de grupos que usa cocina (ISS-041). Mockup aprobado antes de implementar
— [`ISS-064`](issues/ISS-064-repetir-mismo-menu.md).

### Día 10 (2026-08-24, lunes) — reserva sin hora bloqueada por error

> **Corrección de fecha (2026-08-24):** esta entrada decía originalmente "2026-08-23, domingo" —
> mal fechada. El restaurante piloto **no abre los domingos** (horario habitual, dato
> permanente), así que ese día no tuvo operación y el hallazgo no pudo pasar ahí. Confirmado
> con el usuario: el comensal que no pudo reservar fue el mismo lunes 24-08, el día en que se
> contó y se corrigió — no hay desfase entre el hecho y el reporte en este caso.

Un comensal quiso reservar y no pudo por no poner hora de llegada: el diseño original (D1,
2026-08-13) validaba, sin hora, que el restaurante estuviera abierto **ahora mismo** — con la
fecha de hoy, no la de la reserva. El usuario lo asumió como error propio de diseño ("entiendo
la confusión y bueno lo asumo como error mío") y pidió la corrección en el momento: sin hora, la
reserva debe pasar siempre — el campo es solo informativo para anticipar cocina, nunca un
requisito. Implementado el mismo día — [`ISS-065`](issues/ISS-065-reserva-sin-hora-bloqueada.md).

**Pendiente (no implementado):** el usuario pidió además un tooltip/mensaje junto al campo
explicando para qué sirve la hora de llegada, para que el comensal entienda que puede dejarlo en
blanco sin problema.

### Día 10 (2026-08-24, lunes) — visita en persona, observación silenciosa de uso real

El usuario visitó el restaurante y, siguiendo su propio método (observar sin intervenir para ver
"dónde hay trabas" antes de decir algo), registró 4 confusiones reales de la dueña con el panel
`owner.html`. Diagnóstico cruzado contra el código real de cada una:

**1. Confusión entre "Cola del día" y "Reservas".** Cita textual de la dueña: *"por qué sigue
apareciendo este pedido en reservas si ya lo pasé"*. El usuario tuvo que explicarle varias veces:
*"señora cola es donde ve su línea pedido tras pedido, pero reservas sería la lista de todas las
reservas"*. Diagnóstico: son dos paneles con propósito distinto y accesibles por igual en la
bottom-nav móvil (🔥 Cola / 📅 Reservas) — no es un problema de dónde están, es que el nombre
"Reservas" no deja claro que es el listado **completo** (incluye ya completadas), mientras que
"Cola" es la vista operativa por zonas del día de hoy. El modelo mental de la dueña es "si ya lo
pasé, debería desaparecer de todos lados" — y eso no calza con lo que "Reservas" fue diseñado
para mostrar.

**2. Ajustar stock en caliente es lento y poco descubrible.** Cita: *"a ver, ¿cómo es para
quitar stock?"*. La dueña no fija cantidades al inicio del día ("estimar las cantidades aún no
le da"), así que intenta ajustar el stock sobre la marcha cuando nota que algo se acabó — para
entonces varios comensales ya pidieron ese plato y el pedido falla en cocina. Diagnóstico: el
control de stock (📦 Stock / ⛔ Agotado) vive dentro de Configuración → Menú del día → sección →
plato → botón "⋯" — 4-5 niveles de profundidad, pensado para configurar antes del servicio, no
para un ajuste de emergencia en medio de la hora pico.

**3. Las reservas no "reservaron" comida — consecuencia técnica directa del punto 2, no un bug
aparte.** El sistema sí descuenta stock al crear una reserva (`descontarStock()` en
`routes/reservations.js`/`routes/public.js`), pero solo si el plato tiene `stock_inicial`
fijado — sin eso, `stock_restante` queda `NULL` y el descuento es un no-op por diseño ("sin
stock fijado, todo funciona sin límite", ver `status.md` 2026-07-02). Como la dueña no fija
stock (punto 2), ningún plato tenía control activo ese día — cualquier walk-in podía seguir
pidiendo un plato que ya tenía reservas esperándolo, porque para el sistema no existía límite
que hacer respetar.

**4. Configuración/Usuarios no descubribles — incluye la feature nueva de ISS-046/ISS-066.**
Cita: *"guardar permisos nada que ver la señora, no sabe donde ver usuarios o configurar el
menú para colocar qué plato es obligatorio que vaya con proteínas y que plato no, tampoco lo
saca"*. Diagnóstico confirmado en `owner.html`: la bottom-nav móvil (lo único visible todo el
tiempo en el celular) solo tiene 5 accesos — Cola, Cocina, Reservas, Menú, Inicio. "Usuarios" y
"Configuración" **no están ahí** — solo se llega abriendo el botón hamburguesa (sidebar
completo), y dentro del sidebar "Usuarios" está agrupado bajo "Operaciones" (junto a
Órdenes/Reservas/Cocina/Cola), no bajo "Ajustes" donde está "Configuración" — mentalmente la
dueña buscaría "dar de alta un mozo" junto a "configurar el negocio", no junto a "ver los
pedidos del día". La relación "Exige/No permite sección" vive todavía más profundo (Configuración
→ Menú del día → sección → plato → ⋯ → acción), sin ningún indicio visual de que existe salvo
entrando ahí a propósito.

**Sin implementar todavía** — el usuario planteó explícitamente que no tiene claro cómo
simplificar esto ("no entiendo cómo hacerlo más fácil"). Queda como diagnóstico de campo
pendiente de convertir en un plan concreto (ver `backlog.md`).

**Corrección del punto 1, misma conversación:** el usuario aclaró que no era una confusión de
nombres — el problema real era que las reservas **sin hora de llegada** quedaban invisibles en
la Cola del día una vez que el cliente ya había llegado (*"ya llegó tal persona, cómo paso esta
reserva a cocina"*, sin encontrarla). Causa técnica: `urgenciaItem()` les daba urgencia fija en 0,
enterrándolas debajo de todo lo demás activo. De paso reportó que el refresco de la Cola
"parpadeaba" (reconstruía todo en cada poll) y perdía el scroll. **Implementado el mismo día —**
[`ISS-067`](issues/ISS-067-cola-refresco-y-reservas-sin-hora.md) **— confirmado en vivo por el
usuario tras el fix.**

**Punto 2 y 3 (stock lento), implementado el mismo día:** botón "📦 Stock" nuevo en Cola del día
con lista plana + toggle de 1 tap, sin pasar por Configuración —
[`ISS-068`](issues/ISS-068-stock-rapido-desde-cola.md). Pendiente de probar en uso real.

**Punto 4 (Usuarios/Configuración no descubribles):** el usuario pidió explícitamente pausarlo
por ahora — sigue como diagnóstico de campo, sin implementar.

**Caso concreto del mismo punto 4, misma conversación:** el usuario contó que ese día sirvió
"ají de gallina" como plato libre (no debería poder llevar ninguna proteína) — exactamente el
caso que ISS-046/ISS-066 ya resuelven a nivel de datos, pero la relación "Exige/No permite
sección" sigue escondida detrás de "⋯" con nombres técnicos, tal como ya diagnosticaba el punto
4. Se armó un mockup con 3 alternativas de diseño para hacerla descubrible al armar el menú —
**sin elegir todavía**, el usuario pidió pausar y solo documentar. Detalle completo, mockup y
pregunta abierta (¿puede haber más de una sección opcional relacionada a la vez?) en
`backlog.md`.

### Día 11 (2026-08-25, martes) — retoma del punto 1 del Día 10: Cola vs. Reservas

Conversación de escritorio, sin visita en persona. El usuario contó que la dueña "se confunde
porque va entrando a 'Reservas' y no a 'Cola'" — el mismo síntoma que el punto 1 del Día 10
(*"señora cola es donde ve su línea pedido tras pedido, pero reservas sería la lista de
todas..."*), pero esta vez la causa resultó ser otra, no la misma que ISS-067 ya había resuelto
(reservas sin hora invisibles). Costó unas cuantas preguntas encontrarla: primero se investigó
el panel "Reservas activas" en sí (pensando en una reserva vieja sin cerrar, hallazgo real pero
no el que preguntaba — ver ISS-071), hasta que el usuario aclaró: **"Reservas" queda justo en
el medio del bottom-nav** (Cola · Cocina · Reservas · Menú · Inicio) y la dueña lo toca por
error queriendo llegar a "Cola".

**Implementado el mismo día:** botón de Reservas oculto del bottom-nav
([`ISS-071`](issues/ISS-071-reservas-en-medio-bottom-nav.md)) — ya no hacía falta como atajo,
la Cola del día muestra las reservas del día con las mismas acciones desde ISS-067. El panel
Reservas sigue accesible desde el menú lateral, para historial y reservas futuras.

**Mismo día, retomando el punto 4 del Día 10 (Configuración/Usuarios no descubribles):** se
cerró la decisión pausada sobre la relación Exige/No permite sección —
[`ISS-070`](issues/ISS-070-compatibilidad-platos-opcion-a.md), Opción A del mockup, control de
3 estados siempre visible por plato. También se agregó una explicación permanente (antes solo
un toast de 3s) de qué significa Obligatoria/Opcional en cada sección.

**Más tarde el mismo día — cobro y cocina:** el usuario contó otra conversación con la dueña,
dos temas nuevos.

*Cobro en 2 clics con Yape/Plin:* *"No entiendo la función del cobro, ¿por qué son dos clics
con yape? y solo uno cuando paga en efectivo?... me confundo cuando en una mesa uno es en
efectivo y 2 en yape, no lo entiendo."* El paso extra era un candado de verificación real
(revisar el comprobante antes de cobrar), no un descuido — pero el usuario explicó por qué en
la práctica no cumplía su función: la dueña **ya revisa la foto hasta 3 veces** en el camino de
un pedido y aun así termina verificando por fuera en la app real de Yape ("voy a verificar a
yape para verlo", anota el nombre en su cuaderno); comensales evaden el paso completo
declarando "efectivo" y pagando por Yape en persona; y hubo 2 comprobantes por un monto menor
al debido (S/10 en vez de S/11) que la app nunca avisó. Explicado el porqué del paso ("le digo:
'Validación'"), la respuesta de la dueña fue *"no no, no entiendo, redúcelo a un clic"* — una
decisión de negocio informada, no una simplificación sin consultar. **Implementado el mismo
día** — [`ISS-072`](issues/ISS-072-cobro-en-un-clic.md).

*Cocina — refresco y jerarquía visual:* *"Cocina tiene un refresco de 20 segundos, a todas las
zonas debes hacerle lo mismo que le hiciste a cola... debería aparecer el número de la mesa
grande, aparece el # de orden grande y el número de mesa pequeño, debería ser al revés."*
Confirmado: Cocina refresca cada 30s (no 20) con el mismo parpadeo que ISS-067 ya había
arreglado en Cola, pero nunca portado ahí — tampoco a Órdenes activas ni Reservas activas.
**Implementado el mismo día** — [`ISS-073`](issues/ISS-073-anti-parpadeo-cocina-ordenes-reservas.md)
(anti-parpadeo en los 3 paneles) y [`ISS-074`](issues/ISS-074-mesa-grande-orden-chico.md)
(Mesa en negrita, #orden chico, en las 4 pantallas).

**Sin verificar en uso real:** ISS-070 a ISS-074, todos implementados hoy — falta confirmar en
uso real que la dueña ya no entra por error a Reservas, que entiende el control de
compatibilidad sin explicación, que el cobro en 1 clic se siente más simple, y que Cocina ya no
parpadea.

**Más tarde el mismo día — observación de comportamiento, sin bug ni pedido concreto:** el
usuario compartió cómo usa la app la dueña realmente en el día a día, sin que hubiera un
problema puntual que arreglar. Dos aprendizajes:

1. **En hora pico no mira el celular.** La coordinación real es verbal con la cocinera ("mesa
   tal para tal persona") — recién vuelve a la app cuando termina de entregar y está libre. Con
   pocas mesas la app "se vuelve inútil": grita el pedido directo a cocina y entrega, sin pasar
   por el sistema. Cita: *"más fácil, porque no hay mucha gente."* Lectura: no es que la Cola/
   Cocina en vivo esté fallando, es que en un local chico de 2 personas la coordinación verbal
   es más rápida que cualquier UI — probablemente esperable, no algo para "arreglar". Queda
   abierta la pregunta de si lo no registrado en el momento se termina poniendo al día después
   (el sistema sigue sirviendo como registro) o queda desincronizado (ahí sí sería un problema
   real de confiabilidad de datos en reportes/ganancias) — sin responder todavía.

2. **Platos vendidos por día — tercera vez que lo pide** (Día 7, reforzado el mismo Día 7, y de
   nuevo hoy). Sigue sacándolo 100% manual: hace que las señoras anoten con palitos en el
   cuaderno cuántos platos de cada cosa venden. Ya diagnosticado y priorizado en `backlog.md`
   ("Platos vendidos hoy", lista automática sin selects) — sin implementar todavía.

**Tercer tramo del mismo día — causa raíz probable de todo lo anterior, con medición propia
del usuario:** la cena es 100% lapicero y cuaderno, sin usar la app — "tiene sentido porque van
pocos". El usuario midió los tiempos él mismo: **pedir por la app (escanear QR + navegar +
elegir + confirmar) toma ~1 minuto; pedir a boca de jarro, 5-10 segundos** — 6 a 12 veces más
lento. Con 1-3 mesas no hay ninguna ventaja de velocidad en usar la app, y esto explica en
cadena los 2 puntos anteriores: por qué con pocas mesas "se vuelve inútil", por qué la dueña no
registra los pedidos verbales (registrarlos cuesta el mismo tiempo que evitó al no tomarlos por
la app), y por qué la cena entera queda fuera del sistema.

Con muchas mesas, la cocinera **sí** sigue la app ("es pilas"), pero la dueña (atiende el
salón) no la mira hasta estar libre — y los pedidos que toma verbalmente en el camino no los
registra, solo lleva la cuenta aproximada hacia el contador "Menús de hoy" (*"ya masomenos 45 +
el que pidió Carlos, ya casi llego a 50"*). Confirmó que ese contador **sí le sirve** y no
quiere más métricas ahí — pero el número que muestra la app es siempre un subconteo cuando hay
pedidos verbales sin registrar; ella lo corrige mentalmente por su cuenta. No urgente de
arreglar hoy (le funciona para lo que necesita), pero relevante si ese número se usa alguna vez
para algo más (ganancias, reportes).

**Pregunta abierta, sin responder:** existe el botón "Agregar manual" (desplegado
2026-08-18) armado justo para este caso — que la dueña cargue ella misma un pedido verbal al
sistema en unos taps. No lo está usando para los pedidos verbales de hoy. Falta entender por
qué: ¿no sabe que existe / se le olvida en el momento, o ya lo probó y **también** le resultó
más lento que no registrar nada? Cambia la lectura — lo primero es un problema de
descubribilidad (mismo patrón que Configuración/Usuarios), lo segundo pediría que "Agregar
manual" sea todavía más rápido para competir con "no anotar nada".

**Respuesta del usuario, misma conversación — no es descubribilidad, es retención.** Las
únicas veces que registró un pedido manual fueron con el usuario al lado guiándola paso a paso
("¿y ahora? ah ya, el nombre no? ah ya, ¿y cómo lo coloco?"). Hoy, sin guía, **no registró
ningún pedido manual en todo el día** — llegó a preguntar dónde queda la pantalla estando
parada ahí mismo a punto de tomar el pedido, y volvió a preguntar cómo se hace 30 minutos
después de que se lo explicaran. No es que no entienda los pasos — los sigue bien cuando la
guían — es que **el procedimiento no se le queda entre usos**, probablemente por lo poco
frecuente que lo usa. Confirmó además que le sigue pareciendo lento.

Esto responde también la pregunta 1 de arriba: si hoy no registró ningún pedido manual, los
pedidos verbales **quedan desincronizados**, no se ponen al día después — el subconteo de
"Menús de hoy" (y cualquier reporte futuro que dependa de esos datos) es consistente, no solo
aproximado.

**Sin proponer ningún cambio todavía** — es un hallazgo para sentar bien antes de reaccionar
con código, distinto a los casos de descubribilidad anteriores (Configuración/Usuarios,
Reservas en el bottom-nav): ahí el problema era encontrar algo; acá el problema es que un
procedimiento de varios pasos, usado con poca frecuencia, no llega a volverse memoria muscular.

**Cuarto tramo del mismo día — de la reflexión a la acción.** El usuario preguntó directamente
por recomendaciones, contando que el hallazgo lo tenía desanimado ("¿fue un fracaso la app?").
Se le devolvió que no: reservas, cocina en hora pico, pago con comprobante y pensionistas
funcionan sin relación con este problema — lo que falla es una pieza específica (pedido por QR
con pocas mesas) con una causa medida con precisión, el mejor tipo de problema para atacar. La
primera propuesta (botón "Agregar manual" flotante en toda pantalla) la frenó el usuario a
tiempo: el botón ya vive en el header de Cola, y ella preguntó "¿dónde voy?" **estando parada
ahí mismo** — un botón flotante no hubiera resuelto nada, solo agregaba ruido visual sin atacar
la causa real.

Revisando el modal completo apareció la causa real: "Agregar manual" no era un atajo — abría el
mismo camino que el cliente (tarjeta de menú → por sección, un chip que abría PlatoPicker, grid
de fotos, encima del modal → repetir). **Implementado el mismo día** —
[`ISS-075`](issues/ISS-075-agregar-manual-simplificado.md): lista plana de nombres inline, sin
modal aparte ni fotos; Mesa/Nombre marcados "(opcional)".

De paso, el usuario pidió que también descontara stock de la carta ("kardex de productos") —
se investigó antes de prometer algo chico sin haber revisado el schema (`platos_carta` no tiene
columnas de stock, el gap se repite en 4 rutas, mismo tamaño que el stock del menú del día de
julio) y se corrigió en el momento con el usuario: decisión de separarlo, anotado en
`backlog.md` como su propio ítem.

---

### Día 12 (2026-08-26, miércoles) — 7 hallazgos de comensales, sin implementar (a discutir)

Conversación de escritorio, sin visita en persona — contado el mismo día. **Ninguno de estos 7
puntos se implementó todavía**, a pedido explícito del usuario: quedan documentados acá para
seguir la discusión en la próxima sesión, desde la otra laptop.

**Seguimiento de ISS-074 (Mesa grande / #orden chico, desplegado 2026-08-25):** mejoró, pero no
resolvió el problema de fondo. La mesa se ve mejor, pero el número de orden sigue confundiendo
en Cola y Cocina — preguntaron si se puede sacar directamente de la visualización en vez de
solo achicarlo.

**Seguimiento de ISS-073 (anti-parpadeo, mismo deploy):** ya no parpadea, pero Cocina "sigue
refrescándose cada cierto tiempo" y sigue siendo incómodo para la cocinera. El anti-parpadeo
evitó el repintado visual; el polling en sí (cada 60s) sigue siendo perceptible de alguna otra
forma que no quedó clara en la conversación — a investigar antes de proponer un fix.

**Comensales — 5 hallazgos, observados por el usuario en persona hoy:**

1. **Stock agotado a mitad de armar un pedido con varios menús → obliga a rehacer todo desde
   cero.** Quedaban 2 milanesas; una familia pidió 4. Saltó la alerta de stock insuficiente,
   pero no hubo forma de corregir solo el ítem problemático — la familia tuvo que volver a
   armar todos los menús del pedido desde el principio.
2. **No se puede editar un menú puntual ya agregado al carrito.** Mismo síntoma que el punto
   anterior, causa raíz compartida: la única salida para corregir algo es borrar todos los
   menús, recargar la página y elegir todo de nuevo. Le tomó bastante tiempo a la familia
   afectada por el punto 1.
3. **Elegir el mismo tipo de menú para varias personas de una sola vez no es intuitivo.** Con
   los radio buttons (ISS-069) elegir un plato a la vez funciona bien para una persona, pero
   cuando una mamá pregunta "¿tú qué quieres? ¿y tú? ¿y tú?" para varios hijos seguidos, tiene
   que salir del picker y volver a entrar por cada uno, "como si volviera a elegir" desde cero.
   Se aprende con el uso, pero no resultó intuitivo la primera vez. Para pensar: ¿alguna forma
   de elegir 2+ menús iguales en una sola pasada?
4. **Botón/ícono del carrito poco descubrible.** Otra comensal se perdió al momento de elegir —
   no encontraba qué botón la llevaba a ver lo que ya había elegido.
5. **Nombre + adjuntar foto del comprobante: paso complicado para varios comensales.**
   Recomendación del usuario: agrandar esos elementos por defecto (no solo con el ajuste de
   letra que ya existe).

**Pendiente:** discutir prioridad y solución para cada uno de los 7 puntos en la próxima
sesión. Sin cambios de código hoy.

**Resueltos el 2026-08-27 (#1 y #2 del Día 12), ver Día 13 más abajo:** el rediseño completo del
flujo de Pedir ("cantidad primero, configurar después" + "✏️ Editar" por unidad) resuelve
directamente el bloqueo de stock a mitad de pedido y la falta de edición puntual. Ver
[ISS-080](issues/ISS-080-flujo-pedir-cantidad-primero.md). El #6 (carrito poco descubrible) mejora
de paso: el carrito ahora nunca se abre vacío/incompleto, siempre guía al comensal a terminar antes
de mostrarlo.

---

### Día 13 (2026-08-27, jueves) — discrepancia de precio: carrito vs. pantalla de pago

Reportado por el usuario en conversación de escritorio: un comensal eligió un menú para llevar y
otro para comer en el local (mismo pedido). El carrito le mostró **S/ 23.50**, pero al pasar a la
pantalla "¿Cómo vas a pagar?" (Yape) el total cambió a **S/ 22.00** — una diferencia de S/ 1.50,
exactamente el costo de un tapper.

**Diagnóstico (mismo día, código revisado, sin implementar todavía):** desde ISS-047 la modalidad
vive por ítem y `getModalidadOrden()` resume el carrito como `'en_local' | 'para_llevar' |
'mixto'`. El carrito (`updateCart()`) calcula el cargo con `contarTappersLlevar()`, que cuenta
solo los ítems marcados "para llevar" — correcto, da 23.50. Pero `confirmarPedido()`, al armar
`pagoPendiente.total` para la pantalla de pago, usa una condición vieja que no se actualizó con
ISS-047: `getModalidadOrden() === 'para_llevar'` — solo aplica el cargo si **todo** el pedido es
para llevar. Con un carrito mixto, `getModalidadOrden()` da `'mixto'`, la condición es falsa, y el
cargo del tapper se cae a 0 → total mostrado 22.00. El mismo patrón se repite en
`updateResCartSummary()`/`confirmarReserva()` (reservas), aunque ahí la modalidad se elige con un
radio button para todo el pedido, no por ítem, así que el caso mixto no aplica igual — a revisar
si existe un camino real para combinarlo ahí también.

**Impacto real, no solo visual:** el monto de la pantalla de pago es el que el comensal usa para
saber cuánto transferir por Yape/Plin — pagó S/ 22 reales. El pedido que se crea en el backend sí
calcula el cargo correcto server-side (`calcularCargoModalidad()`, ISS-029/ISS-047), así que el
sistema registra S/ 23.50, pero la dueña cobró S/ 1.50 menos de lo que el comensal transfirió.
**Es una fuga de dinero real, no solo un número que no coincide en pantalla.**

**Resuelto el mismo día (2026-08-27):** `confirmarPedido()` pasó a usar `contarTappersLlevar(cart)`
(la misma cuenta por ítem que ya usa el carrito) en vez del chequeo viejo `getModalidadOrden() ===
'para_llevar'`. Ver [ISS-078](issues/ISS-078-precio-pago-no-coincide-carrito-mixto.md). Pendiente
de deploy.

---

### Día 13 (2026-08-27, jueves, continuación) — reservas atascadas en "confirmada", nunca llegan a Cobrar

Pregunta del usuario: notó que varias reservas no llegan a la lista de "Cobrar" y quedan con
status "confirmar", que "mata todo". Preguntó si eso lo administra él mismo desde su panel.

**Respuesta, con el código revisado:**

Sí — el avance de una reserva por sus estados (Confirmar → 🍳 A cocina → ✅ Listo → 🍽 Entregado/💰
Completar) es **manual**, con un botón por paso en la Cola del día (`pedidos.js`) o en el panel
clásico "Reservas" (accesible desde el menú lateral desde ISS-071). No es un bug que pierda datos.

**Pero hay una causa concreta de por qué "varios pedidos no llegan":** existe un job automático
(`utils/autoPreparacion.js`) que debería mover solo una reserva confirmada a "🍳 A cocina" cuando
se acerca su hora de llegada — así el owner no tiene que acordarse de tocar el botón. Ese job
**exige `hora_llegada IS NOT NULL`** para calcular cuándo dispararse. Desde **ISS-065
(2026-08-24)** reservar sin hora de llegada dejó de bloquearse — es decir, desde esa fecha es más
común tener reservas sin hora, y **esas reservas nunca activan el job automático**: quedan en
"confirmada" (zona "Pendientes" de la Cola) hasta que alguien las toca a mano. Si nadie las
avanza y pasa la fecha, salen de las 4 zonas del día y aparecen en el banner "Pedidos sin cerrar"
(cierre de caja) — no se pierden, pero sí quedan escondidas de la vista principal día a día.

**Hipótesis, no confirmada con el usuario:** el aumento de reservas sin hora (permitido a
propósito por ISS-065) es probablemente lo que está generando más reservas "atascadas" que antes,
porque ahora una porción de ellas nunca recibe el empujón automático.

**Sin cambios de código.** Falta decidir con el usuario si el fix es (a) explicarle mejor que debe
tocar "🍳 A cocina" a mano cuando no hay hora, o (b) hacer que el job también dispare para reservas
sin hora (con qué criterio de tiempo, si no hay hora que usar), o (c) ambas.

**Refinamiento del mismo día:** el usuario describió el flujo real que ve como "confirmar →
pendientes → cocina → listos → desaparece" (sin botón "Entregar", sin pasar por "Cobrar"). Se
verificó en el código: eso ocurre exactamente cuando la reserva es `para_llevar`/`delivery` — en
"Listos" el único botón es "💰 Completar", que cierra la reserva de una sin visitar "Cobrar" (mismo
atajo que ya existe para órdenes para llevar, es simétrico). Las reservas con mesa (`en_local`) sí
tienen "🍽 Entregado" y sí pasan por "Cobrar". Preguntado cuál de los 2 casos es el real, el usuario
no está seguro — pidió revisarlo con casos reales. **Sin confirmar si hay además un bug en el caso
con mesa.**

**Pedido explícito del usuario:** homologar para que TANTO reservas como órdenes pasen siempre por
"Cobrar" antes de cerrarse, sin importar la modalidad — así siempre hay un lugar donde confirmar si
pagó o no, en vez de que para llevar/delivery se cierre de un solo toque. Es un cambio de
comportamiento chico pero real (agregar un paso intermedio tipo "📦 Recogido" antes de Cobrar, para
las 2 entidades).

**Decisión confirmada por el usuario:** sí, el caso es para llevar/delivery (no dine-in) — aprobó
la solución del paso intermedio "📦 Recogido".

**Resuelto (2026-08-27):** `btnOrden()`/`btnReserva()` (`pedidos.js`) y `renderReservaCard()`
(`reservas.js`, el panel clásico) ya no bifurcan por modalidad en "Listos" — para llevar/delivery
hace la misma parada intermedia que con mesa, con la etiqueta "📦 Recogido". Ver
[ISS-079](issues/ISS-079-homologar-cobrar-para-llevar.md). Pendiente de deploy.

---

### Día 13 (2026-08-27, jueves, continuación 2) — idea: descargar la carta (à la carta) como foto/PDF

El usuario pide el mismo tipo de "foto para compartir" que ya existe para el menú del día
(`MenuExport`, botón "⬇ Descargar menú" en Configuración), pero para los **platos a la carta**
— con sus precios, mismo estilo visual. Como la carta suele ser más larga que un menú del día,
propone que si la lista es muy larga se genere un PDF en vez de una sola imagen.

**Sin cambios de código todavía** — queda como idea a planificar (ver tabla de la sesión).

**Actualización (mismo día, implementado):** el usuario confirmó que **no es hipótesis** — la
dueña ya empezó a usar "Carta" de verdad y pidió esto en persona. Se decidió arrancar con la
versión simple (una sola imagen, sin PDF): su carta real tiene 3 categorías y 10 platos (Bebidas 4,
Fondos 4, Ceviches 2), de sobra para una sola foto sin pagineado. Implementado como
`public/js/widgets/carta-export.js` (hermano de `menu-export.js`) + botón "⬇ Descargar carta" en
Carta → Platos a la carta. 16/16 E2E nuevo + 469/469 jest sin regresiones. Ver `features.md`.
**Verificado en uso real (2026-08-27):** la dueña confirmó que la carta descargada está bien.

---

### Día 13 (2026-08-27, continuación 3) — rediseño de "Pedir": prototipo interactivo → código real

Antes de tocar `menu.html`, el usuario pidió ver un mockup interactivo (JS puro, sin backend) para
probar la solución de "editar un menú puntual" (#3/#4 del Día 12) antes de dar su veredicto —
prototipo publicado como artifact ("Pedido Directo"). Sobre la marcha, agregó ideas de UX propias
observadas el día anterior: elegir cantidad ANTES de configurar cada menú (en vez de que el picker
se abra solo al tocar "+1"), la carta junto a los menús desde el arranque, la opción de para
llevar/comer aquí reflejada, y — el hallazgo más importante — que el carrito no se abra nunca con
un menú "a medio pedir" (cantidad marcada en el stepper pero sin configurar), porque de otro modo
el comensal ve la carta en el carrito pero el menú "desaparece" sin explicación.

4 iteraciones sobre el prototipo (bug del contador de stock que sumaba en vez de restar, 2do acceso
al carrito arriba, separar "elegir cantidad" de "configurar", encadenar entre distintos tipos de
menú, forzar el freno del carrito) hasta la aprobación final ("ojalá que este sea el definitivo").

**Migrado a código real el mismo día** — ver [ISS-080](issues/ISS-080-flujo-pedir-cantidad-primero.md)
para el detalle técnico completo. Alcance acotado a "Pedir" solamente (decisión tomada con el
usuario antes de empezar: Reservar ya tuvo su propio rediseño reciente en ISS-063, cambiar los 2
flujos el mismo día en producción duplicaba el riesgo sin necesidad).

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
