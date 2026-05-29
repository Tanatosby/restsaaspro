/**
 * k6 Load Test — Menú Pro
 *
 * Escenario: N usuarios de distintos restaurantes escanean el QR al mismo
 * tiempo, leen el menú y envían una orden o reserva simultáneamente.
 *
 * Uso:
 *   k6 run scripts/k6-load-test.js                    # 10 VUs, 30s
 *   k6 run --vus 30 --duration 60s scripts/k6-load-test.js
 *   k6 run --env BASE_URL=https://menupro.tech scripts/k6-load-test.js
 *
 * Requiere k6 instalado: https://k6.io/docs/get-started/installation/
 */

import http  from 'k6/http';
import { sleep, check, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ── Configuración ────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// IDs de restaurantes que existen en tu BD de prueba
// Ajustar según los restaurantes creados en el entorno de test
const RESTAURANTES = [1, 2, 3];

// Fecha válida para reservas (mañana)
const manana = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

// ── Métricas custom ──────────────────────────────────────────────────────────

const erroresOrden    = new Counter('errores_orden');
const erroresReserva  = new Counter('errores_reserva');
const latenciaOrden   = new Trend('latencia_orden_ms',   true);
const latenciaReserva = new Trend('latencia_reserva_ms', true);

// ── Opciones del test ────────────────────────────────────────────────────────

export const options = {
  // Escenario con rampa gradual — simula apertura del restaurante
  stages: [
    { duration: '10s', target: 10 },  // sube a 10 VUs en 10s
    { duration: '30s', target: 30 },  // sube a 30 VUs en 30s (pico almuerzo)
    { duration: '20s', target: 30 },  // mantiene 30 VUs por 20s
    { duration: '10s', target: 0  },  // baja a 0 (cierre)
  ],

  // Umbrales de calidad — el test FALLA si se superan
  thresholds: {
    'http_req_duration':    ['p(95)<300'],  // 95% de requests < 300ms
    'http_req_failed':      ['rate<0.01'],  // menos del 1% de errores
    'latencia_orden_ms':    ['p(95)<400'],  // órdenes específicamente < 400ms
    'latencia_reserva_ms':  ['p(95)<400'],  // reservas específicamente < 400ms
    'checks':               ['rate>0.99'],  // 99% de assertions correctas
  },
};

// ── Flujo principal de cada VU ───────────────────────────────────────────────

export default function () {
  // Cada VU elige un restaurante al azar (multitenant)
  const idResto = RESTAURANTES[Math.floor(Math.random() * RESTAURANTES.length)];
  const mesa    = Math.floor(Math.random() * 10) + 1;
  const headers = { 'Content-Type': 'application/json' };

  // ── Paso 1: Leer info del restaurante (al abrir menu.html) ──────────────
  group('1_leer_restaurante', () => {
    const res = http.get(`${BASE_URL}/api/public/restaurante/${idResto}`);
    check(res, {
      'restaurante 200': r => r.status === 200,
      'tiene nombre':    r => JSON.parse(r.body).nombre !== undefined,
    });
  });

  sleep(0.5); // think time — el usuario lee el nombre del restaurante

  // ── Paso 2: Leer el menú del día ────────────────────────────────────────
  group('2_leer_menu', () => {
    const res = http.get(`${BASE_URL}/api/public/menu?restaurante=${idResto}`);
    check(res, {
      'menu 200': r => r.status === 200,
    });
  });

  sleep(1); // think time — el usuario elige qué pedir

  // ── Paso 3: Crear orden O reserva (50/50 aleatorio) ─────────────────────
  if (Math.random() < 0.5) {

    // Flujo ORDEN — cliente en mesa escanea QR y pide
    group('3a_crear_orden', () => {
      const body = JSON.stringify({
        id_restaurante: idResto,
        mesa:           mesa,
        nombre_cliente: `Test-VU-${__VU}`,
        modalidad:      'en_local',
        carta_items:    [],  // sin ítems — prueba de carga, no de negocio
        menu_items:     [],
      });

      const inicio = Date.now();
      const res    = http.post(`${BASE_URL}/api/public/orders`, body, { headers });
      latenciaOrden.add(Date.now() - inicio);

      const ok = check(res, {
        'orden 201': r => r.status === 201,
        'tiene id':  r => JSON.parse(r.body).id_orden !== undefined,
      });

      if (!ok) erroresOrden.add(1);
    });

  } else {

    // Flujo RESERVA — cliente desde casa hace reserva anticipada
    group('3b_crear_reserva', () => {
      const body = JSON.stringify({
        id_restaurante:   idResto,
        nombre_cliente:   `Test-VU-${__VU}`,
        telefono_cliente: `9${String(__VU).padStart(8, '0')}`,
        fecha:            manana,
        hora_llegada:     '13:00',
        modalidad:        'en_local',
        carta_items:      [],
        menu_items:       [],
      });

      const inicio = Date.now();
      const res    = http.post(`${BASE_URL}/api/public/reservations`, body, { headers });
      latenciaReserva.add(Date.now() - inicio);

      const ok = check(res, {
        'reserva 201':  r => r.status === 201,
        'tiene codigo': r => JSON.parse(r.body).codigo !== undefined,
      });

      if (!ok) erroresReserva.add(1);
    });
  }

  sleep(0.5); // pausa entre iteraciones del mismo VU
}

// ── Resumen al finalizar ─────────────────────────────────────────────────────

export function handleSummary(data) {
  const p95orden   = data.metrics['latencia_orden_ms']?.values?.['p(95)']?.toFixed(0)   ?? 'n/a';
  const p95reserva = data.metrics['latencia_reserva_ms']?.values?.['p(95)']?.toFixed(0) ?? 'n/a';
  const errores    = (data.metrics['errores_orden']?.values?.count ?? 0)
                   + (data.metrics['errores_reserva']?.values?.count ?? 0);
  const totalReqs  = data.metrics['http_reqs']?.values?.count ?? 0;

  console.log('\n════════════════════════════════════════');
  console.log('  Menú Pro — Reporte de carga');
  console.log('════════════════════════════════════════');
  console.log(`  Requests totales:      ${totalReqs}`);
  console.log(`  Errores:               ${errores}`);
  console.log(`  p95 latencia órdenes:  ${p95orden} ms`);
  console.log(`  p95 latencia reservas: ${p95reserva} ms`);
  console.log('════════════════════════════════════════\n');

  return {
    stdout: '',  // k6 ya imprime el resumen estándar; este es adicional
  };
}
