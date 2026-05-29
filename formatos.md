# Sobre formatos

En este archivo se encuentra la documentación de los formatos. Cada formato es un formato en excel que se va a descargar siempre de una sección o subsección específica de algún módulo siguiendo unos filtros específicos. 
## Idea de diseño para los formatos Excel

  Mantener la identidad visual del panel (--accent: #c8692a, --text: #1a1612, Playfair
  Display/Lato):

  ┌─────────────────┬───────────────────────────────────────────────────────────────────────┐
  │      Zona       │                                Estilo                                 │
  ├─────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Fila 1          │ Nombre del restaurante, fondo oscuro #1a1612, texto blanco, fusionada │
  ├─────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Fila 2          │ Título del reporte + rango de fechas, fondo #c8692a, texto blanco     │
  ├─────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Fila 3          │ Encabezados de columna, fondo #fdf0e8, texto #a0521e en negrita       │
  ├─────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Filas X  │ Fondo blanco                                                          │
  ├─────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Filas Y  │ Fondo azul claro #edf4fb                                              │
  ├─────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Fila Totales │ Fondo #fdf0e8, negrita, precio en #c8692a                             │
  └─────────────────┴───────────────────────────────────────────────────────────────────────┘


## sobre formato_1

El formato 1 es un formato descargable por el usuario con rol de owner desde el módulo de ordenes, desde el submódulo de historial y pertenece al historial de órdenes debido a algún filtro que el usuario con rol owner (desde ahora owner) decida colocar. 

Este formato, cada vez que el owner lo quiera descargar, se descargará con el nombre de historial_ordenes_fechadeinicio_fechadefin.xlsx 

### Sobre las columnas

1. ID_orden: Es el ID de la orden
2. Mesa: La mesa de donde fue la orden
3. Fecha : La fecha de la orden
4. Hora: La hora de la orden. 
5. Menú: Si es menú o no. N: No es sección de menú por lo tanto es plato a la carta, Y, sí es sección de menú, T: Total (Solo una línea debe tener T para cada orden)
6. Sección o categoría: Sección de menú o categoría de plato a la carta
7. Plato: El nombre del plato
8. Cantidad: La cantidad solicitada. 
9. Cliente: El cliente que ha dado la orden. 
10. Precio: En el caso de los platos a la carta aparece el precio, para las secciones de menú no aparece el precio, la fila del total refleja todo el precio, el mismo que aparece en las cards de las órdenes. 

---

## Propuesta formato_3 — Curva de clientes (Reportes > Análisis de demanda)

Descargable desde: Reportes > Curva de clientes  
Nombre del archivo: `demanda_clientes_INTERVALO_DESDE_HASTA.xlsx`  
Filtros: intervalo (día/semana/mes), rango de fechas opcional

### Propuesta de columnas

| # | Columna | Descripción | Ejemplo |
|---|---------|-------------|---------|
| 1 | Período | La unidad de tiempo según el intervalo elegido | `2026-05-11` / `2026-W20` / `2026-05` |
| 2 | Órdenes | Cantidad de órdenes no canceladas en ese período | `12` |
| 3 | Reservas | Cantidad de reservas no canceladas en ese período | `5` |
| 4 | Total clientes | Suma de órdenes + reservas | `17` |

### Filas especiales
- **Fila final (T):** Totales acumulados de todo el rango — Órdenes totales, Reservas totales, Total general.

### Preguntas para evaluar antes de implementar
1. ¿Se quiere incluir una fila de totales al final?
Sí al final de la tabla 
2. ¿El filtro de fechas es obligatorio o se descarga todo el historial si no se filtra?
No entiendo, porque no hay filtro más que por Días, semanas o meses pero no hay fechas como tal
3. ¿Se quiere separar en columnas el intervalo (ej: Año | Semana | Mes) o dejarlo en una sola columna "Período"?
Debería haber un modo para descargar todas las órdenes en el excel. O sea descargar todo por día, o descargar por semana, o por mes, en todos los casos, total histórico.   

---

## Formato_5 — Ganancias (Reportes > Ganancias)

Descargable desde: Reportes > Ganancias (botón ⬇ Excel)  
Nombre del archivo: `ganancias_{intervalo}.xlsx`  
Filtro: intervalo (dia / semana / mes) — histórico completo en todos los casos

### Columnas

| # | Columna | Descripción | Ejemplo |
|---|---------|-------------|---------|
| 1 | Período | Unidad de tiempo según intervalo | `2026-05-13` / `2026-W20` / `2026-05` |
| 2 | Ganancias Órdenes | Suma de `total` de órdenes completadas en ese período | `S/ 120.00` |
| 3 | Ganancias Reservas | Suma de `total` de reservas completadas en ese período | `S/ 80.00` |
| 4 | Total | Suma de órdenes + reservas | `S/ 200.00` |

### Filas especiales
- **Fila final (TOTAL):** Suma acumulada de cada columna, precio en `#c8692a`

### Fuente de datos
- Órdenes: `ordenes.total` donde `estatus = 'completado'` (campo persistido al completar)
- Reservas: `reservas.total` donde `estatus = 'completada'` y `es_full = 1`
