# Guía de Deploy — Menú Pro

> Documento de referencia para desplegar el sistema en producción desde cero.
> Última actualización: 2026-05-25

---

## 1. Estado actual del proyecto

El sistema está listo para pruebas en producción con los primeros 8 restaurantes.

**Stack:**
- Backend: Node.js + Express
- Base de datos: SQLite (better-sqlite3) — suficiente para los primeros 8–20 restaurantes
- Frontend: HTML/CSS/JS vanilla (sin build step)
- Auth: JWT en cookie httpOnly
- Push notifications: Web Push API (VAPID)
- PWA: manifest.json + service worker

---

## 2. Qué comprar antes de desplegar

### 2.1 Servidor (VPS)

Recomendación para arrancar: **DigitalOcean Droplet** o **Hostinger VPS**.

| Proveedor | Plan recomendado | Precio aprox. | Notas |
|-----------|-----------------|---------------|-------|
| **DigitalOcean** | Basic Droplet — 1 vCPU / 1 GB RAM / 25 GB SSD | ~$6 USD/mes | El más fácil de gestionar; buena documentación |
| **Hostinger** | KVM1 — 1 vCPU / 4 GB RAM / 50 GB NVMe | ~$4–5 USD/mes | Más barato, misma región; panel en español |
| **Render** | Free/Starter (web service) | Gratis–$7 USD/mes | Sin servidor propio; más fácil pero menos control; SQLite tiene limitaciones |
| **Railway** | Starter | ~$5 USD/mes | Similar a Render; buena DX; SQLite en volumen persistente |

**Recomendación: DigitalOcean Droplet $6 Ubuntu 22.04 LTS.**
- Fácil de configurar SSH
- Backups automáticos por $1.20/mes adicional (altamente recomendado)
- Snapshot antes de cada deploy importante
- Región: New York o San Francisco (más cercanos a Perú que los europeos)

### 2.2 Dominio

Comprar en **Namecheap** o **Porkbun** (más baratos que GoDaddy).

| Extensión | Precio aprox. | Recomendación |
|-----------|---------------|---------------|
| `.com` | ~$10–12 USD/año | Primera opción si está disponible |
| `.app` | ~$14–18 USD/año | Señal de que es una app — buena opción |
| `.pe` | ~$30–50 USD/año | Solo si el mercado es exclusivamente Perú |

**Sugerencias de nombre:**
- `restapp.com`, `menudigital.app`, `restosys.com`, `pedidodigital.app`

**Una vez comprado el dominio:**
1. En Namecheap/Porkbun → DNS → agregar registro A: `@` → IP del VPS
2. Agregar registro A: `www` → misma IP
3. Esperar propagación: 5–60 minutos

### 2.3 Certificado SSL (HTTPS)

**Gratuito con Let's Encrypt + Certbot.** No comprar SSL — se hace en el servidor.

---

## 3. Requisitos del servidor

### Software a instalar en el VPS

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS (vía NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 — gestor de procesos (mantiene la app corriendo)
sudo npm install -g pm2

# Nginx — reverse proxy (recibe requests en puerto 80/443 y los manda al 3000)
sudo apt install -y nginx

# Certbot — certificado SSL gratuito
sudo apt install -y certbot python3-certbot-nginx

# Git
sudo apt install -y git
```

---

## 4. Estructura de archivos en el servidor

```
/var/www/menupro/      ← raíz del proyecto
  ├── app.js
  ├── .env                     ← NUNCA en git
  ├── database.sqlite          ← BD en producción
  ├── public/
  ├── routes/
  ├── ...
  └── backups/                 ← backups diarios de la BD
```

---

## 5. Variables de entorno (.env en producción)

Crear `/var/www/menupro/.env` con:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<string aleatorio de 64+ caracteres — genera con: openssl rand -hex 64>

# VAPID keys para Web Push
# Generar con: node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k)"
VAPID_EMAIL=tu-email@dominio.com
VAPID_PUBLIC_KEY=<clave pública generada>
VAPID_PRIVATE_KEY=<clave privada generada>
```

**Cómo generar JWT_SECRET en terminal:**
```bash
openssl rand -hex 64
```

**Cómo generar VAPID keys:**
```bash
cd /var/www/menupro
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k,null,2))"
```

> ⚠️ Las VAPID keys de desarrollo (en tu laptop) NO sirven en producción.
> Generar nuevas en el servidor y usarlas desde el primer día.
> Si las cambias después, todos los dispositivos con push activo perderán la suscripción.

---

## 6. Deploy paso a paso

### 6.1 Primera vez

```bash
# En el servidor (conectado por SSH)
cd /var/www
git clone https://github.com/tu-usuario/menupro.git
cd menupro
npm install --omit=dev

# Crear el .env (ver sección 5)
nano .env

# Crear el primer usuario admin
node scripts/seed.js   # o el script que uses para inicializar la BD

# Iniciar con PM2
pm2 start app.js --name menupro
pm2 save
pm2 startup   # sigue las instrucciones que imprime
```

### 6.2 Configurar Nginx

Crear `/etc/nginx/sites-available/menupro`:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Límite de tamaño de uploads (fotos de platos)
    client_max_body_size 5M;
}
```

```bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/menupro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 Certificado SSL con Let's Encrypt

```bash
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
# Sigue las instrucciones — certbot modifica el nginx config automáticamente
# El certificado se renueva solo cada 90 días
```

Después de esto la app corre en `https://tudominio.com` ✅

### 6.4 Deploys futuros (actualizaciones)

```bash
cd /var/www/menupro
git pull origin master
npm install --omit=dev
pm2 restart menupro
```

---

## 7. Backups de la base de datos

SQLite es un solo archivo. Un backup diario es crítico.

### Script de backup automático

Crear `/var/www/menupro/scripts/backup.sh`:

```bash
#!/bin/bash
FECHA=$(date +%Y-%m-%d_%H-%M)
ORIGEN="/var/www/menupro/database.sqlite"
DESTINO="/var/www/menupro/backups/backup_$FECHA.sqlite"
mkdir -p /var/www/menupro/backups
cp "$ORIGEN" "$DESTINO"
# Eliminar backups de más de 30 días
find /var/www/menupro/backups -name "*.sqlite" -mtime +30 -delete
echo "Backup creado: $DESTINO"
```

```bash
chmod +x /var/www/menupro/scripts/backup.sh

# Cron: backup diario a las 3:00 AM
crontab -e
# Agregar:
0 3 * * * /var/www/menupro/scripts/backup.sh >> /var/log/backup-restaurante.log 2>&1
```

> **Recomendación adicional:** copiar los backups a un servicio externo una vez a la semana (DigitalOcean Spaces, Google Drive vía rclone, o simplemente descargarlos manualmente al principio).

---

## 8. Seguridad

### 8.1 Checklist mínimo antes de abrir al público

- [ ] `NODE_ENV=production` en `.env`
- [ ] `JWT_SECRET` con 64+ caracteres aleatorios (no el valor de desarrollo)
- [ ] HTTPS activo (Let's Encrypt)
- [ ] Puerto 3000 cerrado al exterior — solo Nginx lo expone: `sudo ufw allow 22,80,443/tcp && sudo ufw enable`
- [ ] Backups automáticos configurados
- [ ] SSH con clave (no contraseña): `PasswordAuthentication no` en `/etc/ssh/sshd_config`

### 8.2 Helmet — headers de seguridad HTTP

✅ **Ya instalado y configurado en `app.js`** — no requiere acción adicional en el servidor.

`helmet` con CSP completa está activo desde el arranque. CDNs permitidas: Chart.js (jsdelivr), QRCode (cdnjs), Google Fonts.

> **Nota sobre eval():** El warning de CSP en Chrome DevTools viene de la librería `qrcodejs` (CDN) que usa `eval()` internamente. La directiva `'unsafe-eval'` lo permite de forma controlada. Si en el futuro se reemplaza `qrcodejs` por otra librería (ej: `qrcode` npm package), se puede eliminar `'unsafe-eval'`.

### 8.3 Rate limiting y protección contra fuerza bruta

✅ **Ya configurado en `app.js` y `routes/auth.js`** — no requiere acción adicional.

- `/api/auth/login` → **10 intentos / 15 minutos por IP** → HTTP 429 con mensaje en español (loginLimiter en auth.js)
- `/api/auth/*` → 20 requests / 15 minutos por IP (limiterAuth en app.js)
- `/api/*` → 300 requests / minuto por IP (límite general)

**Ajustar límites sin tocar el código:** agregar al `.env` del servidor:
```
LOGIN_MAX_ATTEMPTS=10
LOGIN_WINDOW_MINUTES=15
```
_(El código no lee estas vars todavía — ver B4c en features.md para implementarlo)_

**Limitación conocida:** el bloqueo es por IP, no por cuenta. Un atacante que rote IPs puede seguir intentando. La protección completa por cuenta está documentada como feature B4c.

### 8.4 Recuperación de contraseñas

No existe flujo automático de "olvidé mi contraseña". El proceso manual según el rol:

| Quién olvidó | Quién resetea | Cómo |
|---|---|---|
| Mozo / cocinero | Owner | Panel Usuarios → botón "Cambiar contraseña" |
| Owner | Admin Menú Pro | Panel Admin → usuarios del restaurante → reset |
| Admin | Acceso directo a BD | `UPDATE usuarios SET password_hash=? WHERE id=1` con hash bcrypt |

Para generar un hash bcrypt desde el servidor:
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('nuevaContrasena123',10))"
```

El flujo self-service con email está documentado como feature B4b en `features.md`.

---

## 9. Monitoreo

### Ver logs en tiempo real

```bash
pm2 logs menupro
pm2 logs menupro --lines 100
```

### Ver estado del proceso

```bash
pm2 status
pm2 monit   # dashboard interactivo con CPU y RAM
```

### Si la app se cae

```bash
pm2 restart menupro
# o
pm2 reload menupro   # zero-downtime reload
```

---

## 10. Primer restaurante — pasos operativos

1. Desplegaste la app y funciona en `https://tudominio.com`
2. Entrar a `https://tudominio.com/admin/login` con las credenciales del admin
3. Crear el restaurante desde el panel admin
4. Crear el usuario `owner` del restaurante
5. El owner entra a `https://tudominio.com/login` y configura:
   - Nombre y foto del restaurante
   - Mesas (número y capacidad)
   - Métodos de pago (Yape / Plin / Efectivo)
   - Menú del día y carta
   - Modalidades (para llevar, delivery si aplica)
6. El owner activa las notificaciones push desde el panel Configuración (en su celular)
7. Generar QR: `https://tudominio.com/menu?restaurante=ID&mesa=N`
8. Imprimir QRs y pegarlos en mesas

---

## 11. Costos estimados mes 1

| Concepto | Costo |
|----------|-------|
| VPS DigitalOcean Droplet $6 | $6 USD/mes |
| Backup automático Droplet | $1.20 USD/mes |
| Dominio `.com` (prorrateado) | ~$1 USD/mes |
| SSL (Let's Encrypt) | Gratis |
| **Total** | **~$8.20 USD/mes** |

Para los primeros 8 restaurantes, este servidor es más que suficiente.
Cuando superes 30–50 restaurantes activos simultáneos, considerar upgrade a 2 GB RAM ($12/mes).

---

## 12. Migración futura a PostgreSQL

La BD actual es SQLite, suficiente para el MVP. Cuando el volumen crezca o necesites múltiples instancias del servidor, migrar a PostgreSQL.

**Señales de que es momento de migrar:**
- Tienes más de 100 restaurantes activos
- Quieres escalar horizontalmente (más de 1 servidor)
- Los tiempos de respuesta de escritura aumentan en horas pico

**Pasos de migración (cuando llegue el momento):**
1. Contratar un managed PostgreSQL (DigitalOcean Managed DB, ~$15/mes)
2. Reemplazar `better-sqlite3` con `pg` en el código
3. Adaptar queries (principalmente diferencias de sintaxis en fechas y AUTOINCREMENT)
4. Migrar datos con un script de exportación SQLite → PostgreSQL

---

## 13. Pruebas de carga — comportamiento bajo concurrencia

### ¿Qué pasa cuando 30 usuarios escanean el QR al mismo tiempo?

#### Arquitectura de concurrencia del sistema

| Capa | Comportamiento |
|------|---------------|
| **Node.js** | Single-threaded event loop. Las 30 requests llegan "simultáneas" pero se procesan de a una en el loop. No hay paralelismo real en JS. |
| **better-sqlite3** | Síncrono. Cada query de BD bloquea el event loop hasta completarse (~1–5 ms por query). 30 requests × 5 ms = ~150 ms de procesamiento total — imperceptible para el usuario. |
| **SQLite WAL mode** | Múltiples lectores simultáneos sin bloqueo. Un escritor a la vez — SQLite serializa automáticamente, sin corrupción. Ya habilitado: `PRAGMA journal_mode = WAL`. |
| **Multitenant** | Restaurantes distintos comparten la BD pero sus datos no se mezclan. Una write de restaurante A no bloquea datos de restaurante B por más de ~2 ms. |
| **Rate limiting** | Límite actual: 300 req/min general. 30 usuarios enviando 1 pedido = 30 req/min — holgadamente dentro del límite. |

#### Escenario: 30 usuarios QR + órdenes + reservas simultáneas

```
30 usuarios escanean QR de restaurantes distintos al mismo tiempo
  ↓ cada uno hace:
  GET /api/public/restaurante/:id      (~2 ms BD)
  GET /api/public/menu?restaurante=X   (~5 ms BD, query más pesada)
  POST /api/public/orders              (~3 ms BD, transacción)
  ó
  POST /api/public/reservations        (~4 ms BD, transacción + código único)

+ Job de autoPreparación corriendo cada 60s en background
+ Polling de owners: GET /api/orders/activas cada 15s
```

**Resultado esperado:** todas las requests se atienden en < 200 ms de tiempo de respuesta. El cuello de botella no es la BD — es la serialización del event loop procesando las requests de a una. Con 30 usuarios el sistema respira tranquilo.

#### Dónde podrían aparecer problemas reales

| Escenario | Riesgo | Umbral aproximado |
|-----------|--------|-------------------|
| Muchos usuarios leyendo el menú | Ninguno — lecturas concurrentes en WAL sin bloqueo | > 500 req/s para notar latencia |
| Escrituras simultáneas (órdenes + reservas) | Muy bajo — SQLite serializa sin error, solo agrega ~2 ms por write en cola | > 50 writes/s simultáneos |
| Auto-merge (Gap 8) — SELECT luego UPDATE | Race condition teórica si dos usuarios hacen cliente-llegó para la misma mesa al mismo tiempo | Improbable en la práctica (una sola mesa) |
| Job autoPreparación + writes de usuarios | SQLite WAL lo maneja; puede agregar ~5 ms de latencia durante el tick del job | Sin riesgo real |
| Polling de 30 owners activos (GET cada 15s) | 30 GET / 15s = 2 req/s — despreciable | > 200 owners activos simultáneos |
| **Límite real del sistema** | SQLite write contention sostenida | > 100–150 restaurantes activos simultáneos con pico de pedidos |

#### Señal de que es momento de escalar

Si los tiempos de respuesta de `POST /api/public/orders` superan 500 ms en producción de forma sostenida → revisar sección 12 (migración a PostgreSQL).

---

### Herramientas de prueba de carga

| Herramienta | Tipo | Ideal para |
|-------------|------|-----------|
| **k6** | Escenarios realistas, VUs | Simular el flujo QR → pedido completo. Recomendado. |
| **autocannon** | Throughput puro | Medir req/s máximos de un endpoint específico |
| **Artillery** | Escenarios YAML | Alternativa a k6, más simple de configurar |

#### Instalar k6

```bash
# Windows (Chocolatey)
choco install k6

# Mac
brew install k6

# Linux
sudo apt install k6
```

#### Script de carga — escenario normal (`k6-load-test.js`)

Simula el escenario realista: N usuarios leen el menú y envían una orden o reserva con think time humano (1.5s entre requests).

```bash
k6 run scripts/k6-load-test.js                          # 30 VUs, rampa gradual
k6 run --vus 30 --duration 60s scripts/k6-load-test.js  # configuración manual
```

#### Script de stress — escenario borde (`k6-stress-test.js`)

Elimina el think time y escala hasta 500 VUs para encontrar el **punto de quiebre real** del sistema. 80% escrituras, 20% lecturas. Los umbrales son informativos (`abortOnFail: false`) — el test siempre termina para mostrar la curva completa de degradación.

```bash
# Rampa progresiva: 20 → 50 → 100 → 200 → 300 → 500 VUs (etapas de 30s c/u)
k6 run scripts/k6-stress-test.js

# Spike repentino: normal → 300 VUs de golpe → recuperación
k6 run --env MODO=spike scripts/k6-stress-test.js

# Contra producción
k6 run --env BASE_URL=https://menupro.tech scripts/k6-stress-test.js
```

**Cómo leer los resultados en tiempo real** (k6 imprime métricas cada 5s):
- Observar en qué etapa (a qué VU count) `http_req_duration{p95}` empieza a subir → ese es el **techo operativo**
- Si `p95 writes >> p95 reads`: cuello de botella en SQLite writes (esperado)
- Si `p95 reads` también sube: event loop saturado por complete — señal de migrar a PostgreSQL
- `http_req_failed > 1%`: el sistema empieza a rechazar requests → **punto de quiebre**

**Punto de quiebre esperado según hardware:**

| Hardware | Degradación comienza | Errores aparecen |
|----------|----------------------|-----------------|
| VPS $6 (1 vCPU, 1 GB RAM) | ~80 VUs | ~150–200 VUs |
| VPS $12 (2 vCPU, 2 GB RAM) | ~150 VUs | ~300 VUs |
| Laptop de desarrollo | ~150 VUs | ~250–350 VUs |

> Estos números son con 0.1s think time y 80% escrituras — la carga más agresiva posible. En producción real (usuarios con think time humano de 2–10s), el sistema aguanta 5–10× más usuarios concurrentes.

**Métricas a observar en el reporte:**

| Métrica k6 | Qué mide | Umbral aceptable |
|-----------|----------|-----------------|
| `http_req_duration p(95)` | El 95% de requests responde en menos de X ms | < 300 ms |
| `http_req_failed` | Porcentaje de requests con error | < 1% |
| `http_reqs` | Requests por segundo procesadas | baseline para comparar |
| `checks` | Assertions que pasaron (status 200/201) | 100% |

#### Prueba rápida con autocannon (sin instalar nada extra)

```bash
# Instalar una sola vez
npm install -g autocannon

# Bombardear el endpoint de menú (el más leído)
autocannon -c 30 -d 10 "http://localhost:3000/api/public/menu?restaurante=1"

# Bombardo de creación de órdenes (escrituras simultáneas)
autocannon -c 30 -d 10 -m POST \
  -H "Content-Type: application/json" \
  -b '{"id_restaurante":1,"mesa":1,"nombre_cliente":"Test","carta_items":[],"menu_items":[]}' \
  "http://localhost:3000/api/public/orders"
```

---

## 14. Checklist de launch

```
Infraestructura
[ ] VPS comprado y acceso SSH configurado
[ ] Dominio comprado y DNS apuntando al VPS
[ ] Node.js 20, PM2, Nginx instalados
[ ] App corriendo con pm2 start
[ ] HTTPS activo con Let's Encrypt
[ ] Puerto 3000 cerrado externamente (ufw)
[ ] Backups diarios configurados (cron)

Aplicación
[ ] .env de producción creado (JWT_SECRET fuerte, VAPID keys nuevas)
[ ] NODE_ENV=production
[ ] npm install --omit=dev (sin devDependencies)
[x] Helmet instalado y configurado en app.js (CSP + X-Frame-Options + HSTS)
[x] Rate limiting configurado en app.js (auth: 20/15min, general: 300/min)
[x] Índices de BD creados (id_restaurante + fecha en ordenes y reservas)
[ ] Usuario admin creado en la BD
[ ] Primer restaurante creado y configurado desde el panel admin

Pruebas antes de abrir
[ ] Login funciona en /admin/login y /login
[ ] Un owner puede crear menú, carta, mesas
[ ] Un cliente puede abrir el menú por QR y hacer una reserva
[ ] La cocina recibe la notificación push
[ ] El owner puede confirmar pago
[ ] El backup corre correctamente (ejecutar el script manualmente una vez)
[ ] Prueba de carga básica: k6 run --vus 30 --duration 30s scripts/k6-load-test.js (p95 < 300ms, errores < 1%)
```
