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
  {
    id: 5,
    fecha: '2026-08-28',
    items: [
      'La pantalla de pago del cliente ahora es un solo paso — antes había una pantalla extra de "Revisa tu pedido" antes de enviar, ya no hace falta.',
      'Tus clientes van a ver por unos días un aviso arriba del menú explicando el cambio de cómo se pide, y una encuesta cortita al terminar su pedido (esto es solo para nosotros, para saber si el cambio les gustó — vos no necesitas hacer nada).',
    ],
  },
  {
    id: 6,
    fecha: '2026-08-28',
    items: [
      'La primera vez que entres vas a ver una pantalla de "Términos de uso" para aceptar. Confirma que nos das permiso de usar los datos de tus ventas solo para medir el uso del sistema y mejorar tus reportes, que son confidenciales, y avisa que la app está hecha con ayuda de Inteligencia Artificial supervisada por una persona. Se acepta una sola vez.',
    ],
  },
  {
    id: 7,
    fecha: '2026-08-31',
    items: [
      'Subir fotos ahora funciona bien en celulares más antiguos o lentos: antes, con fotos grandes de la cámara, la pantalla se congelaba o se cerraba sola. Ahora la foto se achica sola antes de subirse (vas a ver un cartelito "Procesando foto…"). Aplica a las fotos de los platos, la foto de portada del restaurante y la foto del comprobante de pago del cliente.',
    ],
  },
  {
    id: 8,
    fecha: '2026-09-02',
    items: [
      'En la Cola del día, zona "Listos": si el cliente pagó por Yape o Plin y ya revisaste su comprobante, tenés un botón nuevo "✅ Ya pagó" que cierra el pedido de una vez, sin que tenga que pasar por "Por cobrar". Los pagos en efectivo siguen igual (por "Por cobrar", para contar el vuelto).',
      'La pestaña "Por cobrar" ahora tiene un buscador arriba: escribí un número de mesa o un nombre y te filtra la lista, para no perderte cuando hay muchos pedidos juntos.',
    ],
  },
  {
    id: 9,
    fecha: '2026-09-12',
    items: [
      'Los pedidos que tus clientes hacen desde su celular ahora entran DIRECTO a "En cocina", sin que tengas que tocar "🍳 A cocina" primero. Es el mismo camino que ya tenían los pedidos que tomás a mano. Un toque menos por pedido en plena hora pico.',
      'Por eso la pestaña "Pendientes" ahora es solo de reservas (las que todavía tenés que confirmar o que esperan que llegue el cliente).',
      'No perdés nada de control: el aviso de "comprobante ya usado" y la confirmación del pago por Yape o Plin siguen apareciendo igual, cuando vas a cobrar.',
    ],
  },
  {
    id: 10,
    fecha: '2026-09-12',
    items: [
      '"Por cobrar" ahora te muestra MESAS, no pedidos sueltos. Si una mesa pidió 3 veces (los menús, después la jarra, después el plato a la carta), ves una sola fila "Mesa 5" con la cuenta sumada y un botón "💰 Cobrar mesa 5" — se cobra todo junto, de un toque.',
      'Por fin ves los montos: cada mesa muestra cuánto debe, y arriba está el total de todo lo que te queda por cobrar hoy. Antes tenías que sumar de cabeza.',
      'Si tocás la fila de la mesa se abren los pedidos uno por uno, con su precio, su comprobante y un botón "Cobrar solo este" — por si alguien de la mesa quiere pagar lo suyo aparte.',
      'Antes de cobrar una mesa completa te pregunta, porque una vez cobrada no se puede reabrir.',
      'Los pedidos para llevar y los que no tienen mesa van juntos al final. Ese grupo NO se cobra junto a propósito: son clientes distintos.',
      'Corregido un cobro de más: cuando una mesa tenía una reserva Y además pedía algo en la mesa, el sistema podía contar esos platos dos veces (una mesa de S/ 56 llegaba a mostrar S/ 84). Ya no pasa. Si alguna vez usaste la opción "Auto-merge" en Configuración, quedó apagada — no la necesitás: la cuenta de la mesa ya junta la reserva con sus pedidos, y con el monto correcto.',
    ],
  },
  {
    id: 11,
    fecha: '2026-09-13',
    items: [
      'Ya no hace falta tocar "🍽 Entregar": un pedido que lleva 3 minutos en "Listos" pasa solo a "Por cobrar". El plato lo seguís llevando a la mesa igual — lo que se ahorra es el toque en la pantalla, que en hora pico nunca llegaba y hacía que se acumularan los pedidos sin cerrar.',
      'Podés cambiar esos 3 minutos, o apagarlo del todo poniendo 0, en Configuración → "Pasar solo de Listos a Por cobrar". Solo aplica a pedidos: las reservas siempre esperan que vos confirmes.',
      'Si tocaste "Listo" por error, el botón "↩️ Regresar a cocina" ahora también está en "Por cobrar", no solo en "Listos" — así seguís pudiendo corregirlo aunque el pedido ya se haya movido solo.',
      'La Cola del día ahora se actualiza cada 20 segundos en vez de cada minuto, para que veas los pedidos moverse casi al instante.',
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
