// ════════════════════════════════════════════════════════
// MÓDULO: NOVEDADES — "Qué hay de nuevo"
// Hasta hoy la única forma de que la dueña se enterara de un cambio era
// que se lo explicaran en persona o por teléfono — no escala con el ritmo
// de deploys del piloto (pedido del usuario, 2026-08-25). Se agrega una
// entrada acá al cerrar cada sesión con cambios visibles para ella, en su
// idioma, no técnico — mismo hábito que status.md, para otro público.
//
// Se guarda en localStorage (no en el servidor): es "qué vio" ESTE
// celular/navegador, no algo que necesite viajar entre dispositivos.
// ════════════════════════════════════════════════════════

const NOVEDADES = [
  {
    id: 1,
    fecha: '2026-08-25',
    items: [
      'Ahora podés marcar si un plato necesita o no lleva otra sección (ej. proteína) — tocá el control debajo de cada plato en Configuración → Menú del día.',
      'Las secciones "Obligatoria"/"Opcional" ahora explican qué significan, siempre visible.',
      'Cobrar ya es un solo toque para todos los métodos de pago, incluido Yape/Plin.',
      'En Cocina y Cola del día, la mesa aparece grande y el número de orden chico.',
      '"Agregar manual" es más simple: lista de platos sin fotos, y mesa/nombre ya no son obligatorios.',
      '"Reservas" ya no aparece en los accesos rápidos de abajo — las reservas del día se siguen viendo en "Cola".',
    ],
  },
  {
    id: 2,
    fecha: '2026-08-26',
    items: [
      'Ahora podés cambiar el nombre de tu restaurante vos misma, desde Configuración.',
    ],
  },
  {
    id: 3,
    fecha: '2026-08-27',
    items: [
      'Nuevo botón "⬇ Descargar carta" en Carta → Platos a la carta — baja una foto con todos tus platos y precios, lista para compartir por WhatsApp (igual que "Descargar menú").',
      'Corregido: cuando un pedido mezclaba "para llevar" y "comer aquí", la pantalla de pago podía mostrarle al cliente un monto menor al real (faltaba cobrar el envase). Ya está arreglado.',
      'En la Cola del día, los pedidos y reservas "para llevar" ahora pasan por "📦 Recogido" antes de aparecer en "Cobrar" — igual que los que son con mesa, para que siempre quede un lugar donde confirmar si ya se cobró.',
    ],
  },
  {
    id: 4,
    fecha: '2026-08-27',
    items: [
      'Cambió cómo tus clientes piden desde la carta: primero eligen cuántos menús quieren con un botón +/−, y recién después van eligiendo las opciones de cada uno, uno por uno. Ya no se les abre la selección de golpe al tocar "+1".',
      'Ahora tus clientes pueden tocar "✏️ Editar" en cualquier menú que ya agregaron al carrito, sin tener que borrar todo y empezar de nuevo — útil si se equivocan o si se acaba un plato a mitad de armar el pedido.',
    ],
  },
];

const NOVEDADES_KEY = 'novedadesVistaId';

function mostrarNovedadesSiHay() {
  let vistaId = 0;
  try { vistaId = Number(localStorage.getItem(NOVEDADES_KEY) || 0); } catch {}

  const noVistas = NOVEDADES.filter(n => n.id > vistaId).sort((a, b) => a.id - b.id);
  if (!noVistas.length) return;

  const bloques = noVistas.map(n => `
    <div class="nov-bloque">
      <div class="nov-fecha">${fDate(n.fecha)}</div>
      <ul class="nov-lista">${n.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </div>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'nov-overlay';
  overlay.innerHTML = `
    <div class="nov-sheet" role="dialog" aria-modal="true" aria-label="Qué hay de nuevo">
      <div class="nov-header">
        <span class="nov-title">🎉 Qué hay de nuevo</span>
      </div>
      <div class="nov-body">${bloques}</div>
      <button class="nov-btn-cerrar" type="button">Entendido</button>
    </div>`;
  document.body.appendChild(overlay);

  const maxId = Math.max(...noVistas.map(n => n.id));
  const cerrar = () => {
    try { localStorage.setItem(NOVEDADES_KEY, String(maxId)); } catch {}
    overlay.remove();
  };
  overlay.querySelector('.nov-btn-cerrar').addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}
