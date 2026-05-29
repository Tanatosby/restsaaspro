/**
 * k6 Stress Test — Menú Pro — Escenario borde
 *
 * Objetivo: encontrar el punto de quiebre real del sistema.
 *
 * Por qué este script es distinto al load test:
 *   - Sin think time (0.1s mínimo) → presión máxima sobre el event loop
 *   - 80% escrituras, 20% lecturas → golpea el cuello de botella real
 *   - Rampa hasta 500 VUs en etapas, más un spike repentino
 *   - Umbrales informativos (abortOnFail: false) → el test SIEMPRE termina
 *     aunque supere los límites, para ver la curva completa de degradación
 *
 * Por qué SQLite + better-sqlite3 tiene este cuello de botella:
 *   better-sqlite3 es SÍNCRONO → cada query bloquea el event loop de Node.js
 *   → todas las requests se serializan de facto, sin paralelismo real
 *   → throughput máximo ≈ 1000ms / (ms por request) req/s
 *   → con ~10ms por request POST: ~100 writes/s teórico máximo en un solo proceso
 *
 * Punto de quiebre esperado (aproximado, depende del hardware):
 *   - VPS $6 (1 vCPU): degradación a partir de ~80-100 VUs, errores a ~200 VUs
 *   - Laptop dev:       degradación a partir de ~150 VUs, errores a ~300 VUs
 *
 * Uso:
 *   k6 run scripts/k6-stress-test.js
 *   k6 run --env BASE_URL=https://menupro.tech scripts/k6-stress-test.js
 *   k6 run --env MODO=spike scripts/k6-stress-test.js   # solo prueba de spike
 *
 * Requiere k6: https://k6.io/docs/get-started/installation/
 */

import http  from 'k6/http';
import { sleep, check, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// ── Configuración ────────────────────────────────────────────────────────────

const BASE_URL   = __ENV.BASE_URL || 'http://localhost:3000';
const MODO       = __ENV.MODO     || 'rampa';   // 'rampa' | 'spike'
const RESTAURANTES = [1, 2, 3];

const manana = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

// ── Métricas custom ──────────────────────────────────────────────────────────

const erroresWrite   = new Counter('stress_errores_write');
const erroresRead    = new Counter('stress_errores_read');
const latenciaWrite  = new Trend('stress_latencia_write_ms',  true);
const latenciaRead   = new Trend('stress_latencia_read_ms',   true);
const tasaErrorWrite = new Rate('stress_tasa_error_write');

// ── Escenarios ───────────────────────────────────────────────────────────────

//
// MODO: rampa
// Sube de 0 a 500 VUs en etapas de 30s cada una.
// Observar en qué etapa p95 supera 500ms y en cuál aparecen errores.
//
const STAGES_RAMPA = [
  { duration: '15s', target: 20  },  // Warm-up — debería ser perfecto
  { duration: '30s', target: 20  },  // Mantiene 20 VUs → baseline
  { duration: '15s', target: 50  },  // Sube a 50 VUs
  { duration: '30s', target: 50  },  // Mantiene 50 VUs → ¿latencia estable?
  { duration: '15s', target: 100 },  // Sube a 100 VUs — primer punto de presión real
  { duration: '30s', target: 100 },  // Mantiene 100 VUs → ¿p95 < 500ms?
  { duration: '15s', target: 200 },  // Sube a 200 VUs — zona de degradación esperada
  { duration: '30s', target: 200 },  // Mantiene 200 VUs → ¿errores?
  { duration: '15s', target: 300 },  // Sube a 300 VUs — zona de quiebre
  { duration: '30s', target: 300 },  // Mantiene 300 VUs → ¿error rate > 5%?
  { duration: '15s', target: 500 },  // Máximo — punto de colapso total
  { duration: '30s', target: 500 },  // Mantiene 500 VUs → techo del sistema
  { duration: '30s', target: 0   },  // Baja — ¿se recupera la latencia?
];

//
// MODO: spike
// Carga normal → pico repentino → recuperación.
// Simula: post viral que manda 300 personas al menú al mismo tiempo.
//
const STAGES_SPIKE = [
  { duration: '30s', target: 20  },  // Carga normal — baseline
  { duration: '5s',  target: 300 },  // Spike repentino a 300 VUs
  { duration: '60s', target: 300 },  // Mantiene el spike 60s
  { duration: '5s',  target: 20  },  // Vuelve a normal repentinamente
  { duration: '30s', target: 20  },  // ¿Recuperó la latencia original?
  { duration: '10s', target: 0   },  // Cierre
];

export const options = {
  stages: MODO === 'spike' ? STAGES_SPIKE : STAGES_RAMPA,

  // Timeout agresivo: si el servidor tarda más de 10s → error registrado
  // (default k6 es 60s — demasiado permisivo para detectar degradación)
  httpDebug: false,

  // Umbrales INFORMATIVOS — abortOnFail: false para que el test siempre complete
  // y podamos ver la curva completa de degradación
  thresholds: {
    // Zona verde: p95 < 300ms
    'http_req_duration': [
      { threshold: 'p(95)<300',   abortOnFail: false },  // Zona verde
      { threshold: 'p(95)<1000',  abortOnFail: false },  // Zona amarilla
      { threshold: 'p(95)<5000',  abortOnFail: false },  // Zona roja — collapse
    ],
    // Tasa de error aceptable
    'http_req_failed': [
      { threshold: 'rate<0.01',   abortOnFail: false },  // < 1%
      { threshold: 'rate<0.05',   abortOnFail: false },  // < 5%
      { threshold: 'rate<0.20',   abortOnFail: false },  // < 20% — colapso total
    ],
    // Writes específicamente
    'stress_latencia_write_ms': [
      { threshold: 'p(95)<500',   abortOnFail: false },
      { threshold: 'p(95)<2000',  abortOnFail: false },
    ],
    'stress_tasa_error_write': [
      { threshold: 'rate<0.05',   abortOnFail: false },
    ],
  },
};

// ── Flujo de cada VU ─────────────────────────────────────────────────────────

export default function () {
  const idResto  = RESTAURANTES[Math.floor(Math.random() * RESTAURANTES.length)];
  const mesa     = Math.floor(Math.random() * 10) + 1;
  const headers  = { 'Content-Type': 'application/json' };
  const timeout  = { timeout: '10s' };  // corta la request si tarda más de 10s

  // 80% escrituras, 20% lecturas — diseñado para golpear el cuello de botella
  const esWrite = Math.random() < 0.80;

  if (esWrite) {
    // ── ESCRITURA (80%) — golpea el event loop ─────────────────────────────
    const esOrden = Math.random() < 0.50;

    if (esOrden) {
      group('write_orden', () => {
        const body = JSON.stringify({
          id_restaurante: idResto,
          mesa,
          nombre_cliente: `Stress-${__VU}-${__ITER}`,
          modalidad:      'en_local',
          carta_items:    [],
          menu_items:     [],
        });

        const inicio = Date.now();
        const res    = http.post(
          `${BASE_URL}/api/public/orders`,
          body,
          { headers, ...timeout }
        );
        const ms = Date.now() - inicio;
        latenciaWrite.add(ms);

        const ok = check(res, {
          'orden 201': r => r.status === 201,
        });
        tasaErrorWrite.add(!ok);
        if (!ok) erroresWrite.add(1);
      });

    } else {
      group('write_reserva', () => {
        const body = JSON.stringify({
          id_restaurante:   idResto,
          nombre_cliente:   `Stress-${__VU}-${__ITER}`,
          telefono_cliente: `9${String((__VU * 100 + __ITER) % 99999999).padStart(8, '0')}`,
          fecha:            manana,
          hora_llegada:     '13:00',
          modalidad:        'en_local',
          carta_items:      [],
          menu_items:       [],
        });

        const inicio = Date.now();
        const res    = http.post(
          `${BASE_URL}/api/public/reservations`,
          body,
          { headers, ...timeout }
        );
        const ms = Date.now() - inicio;
        latenciaWrite.add(ms);

        const ok = check(res, {
          'reserva 201': r => r.status === 201,
        });
        tasaErrorWrite.add(!ok);
        if (!ok) erroresWrite.add(1);
      });
    }

  } else {
    // ── LECTURA (20%) — WAL las maneja en paralelo, debería ser rápido ────
    group('read_menu', () => {
      const inicio = Date.now();
      const res    = http.get(
        `${BASE_URL}/api/public/menu?restaurante=${idResto}`,
        timeout
      );
      const ms = Date.now() - inicio;
      latenciaRead.add(ms);

      const ok = check(res, {
        'menu 200': r => r.status === 200,
      });
      if (!ok) erroresRead.add(1);
    });
  }

  // Mínimo think time — suficiente para que k6 no sature el OS con conexiones TCP
  // pero no lo suficiente para ocultar la presión real sobre el servidor
  sleep(0.1);
}

// ── Resumen interpretado al finalizar ────────────────────────────────────────

export function handleSummary(data) {
  const m = data.metrics;

  const p50  = m['http_req_duration']?.values?.['p(50)']?.toFixed(0)  ?? '?';
  const p95  = m['http_req_duration']?.values?.['p(95)']?.toFixed(0)  ?? '?';
  const p99  = m['http_req_duration']?.values?.['p(99)']?.toFixed(0)  ?? '?';
  const max  = m['http_req_duration']?.values?.['max']?.toFixed(0)    ?? '?';

  const p95w = m['stress_latencia_write_ms']?.values?.['p(95)']?.toFixed(0) ?? '?';
  const p95r = m['stress_latencia_read_ms']?.values?.['p(95)']?.toFixed(0)  ?? '?';

  const totalReqs   = m['http_reqs']?.values?.count    ?? 0;
  const rps         = m['http_reqs']?.values?.rate?.toFixed(1) ?? '?';
  const errorRate   = ((m['http_req_failed']?.values?.rate ?? 0) * 100).toFixed(2);
  const erroresW    = m['stress_errores_write']?.values?.count ?? 0;
  const erroresR    = m['stress_errores_read']?.values?.count  ?? 0;

  const zona = p95 < 300  ? '🟢 VERDE — sistema cómodo'
             : p95 < 1000 ? '🟡 AMARILLA — degradación visible'
             : p95 < 5000 ? '🔴 ROJA — sistema al límite'
             :               '💀 COLAPSO — timeouts masivos';

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     Menú Pro — Reporte de Stress Test            ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Modo:              ${MODO.padEnd(28)}║`);
  console.log(`║  Requests totales:  ${String(totalReqs).padEnd(28)}║`);
  console.log(`║  Throughput:        ${(rps + ' req/s').padEnd(28)}║`);
  console.log(`║  Tasa de error:     ${(errorRate + '%').padEnd(28)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Latencia (todas las requests):                  ║');
  console.log(`║    p50:  ${(p50  + ' ms').padEnd(40)}║`);
  console.log(`║    p95:  ${(p95  + ' ms').padEnd(40)}║`);
  console.log(`║    p99:  ${(p99  + ' ms').padEnd(40)}║`);
  console.log(`║    max:  ${(max  + ' ms').padEnd(40)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Latencia por tipo:                              ║');
  console.log(`║    Writes p95:  ${(p95w + ' ms').padEnd(33)}║`);
  console.log(`║    Reads  p95:  ${(p95r + ' ms').padEnd(33)}║`);
  console.log(`║    Errores writes: ${String(erroresW).padEnd(30)}║`);
  console.log(`║    Errores reads:  ${String(erroresR).padEnd(30)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Resultado: ${zona.padEnd(36)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Cómo leer los resultados:');
  console.log('  - Mira el panel de k6 en tiempo real para ver en qué etapa');
  console.log('    (a qué VU count) p95 empieza a subir — ese es tu techo.');
  console.log('  - Si p95 writes >> p95 reads: cuello de botella en SQLite writes.');
  console.log('  - Si p95 reads también sube: event loop saturado (expected).');
  console.log('  - Errores > 1%: el sistema empieza a rechazar requests.');
  console.log('');

  return { stdout: '' };
}
