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

## Piloto #1 — Restaurante (sin nombre registrado aún)

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
