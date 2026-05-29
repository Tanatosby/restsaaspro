'use strict';

const fs   = require('fs');
const path = require('path');

const MANUALES = [
  {
    key:      'owner',
    archivo:  'manual-owner.md',
    titulo:   'Manual de Usuario — Dueño del Restaurante (Owner)',
    intro: `Este manual está dirigido al **dueño o administrador** del restaurante.
Cubrimos todas las funciones del sistema: desde configurar el menú del día hasta
revisar reportes de ganancias y gestionar tu equipo.

> 💡 El sistema funciona como una app en tu celular. Abrí el navegador, ingresá a la
> URL del sistema y tocá "Instalar" para agregarlo a tu pantalla de inicio.`,
  },
  {
    key:      'cocina',
    archivo:  'manual-cocina.md',
    titulo:   'Manual de Usuario — Cocinero',
    intro: `Este manual está dirigido al **cocinero o cocinera** del restaurante.
El sistema te muestra todos los pedidos que hay que preparar, ordenados por urgencia.
Solo necesitás saber marcar un pedido como "Listo" — el resto lo hace el sistema.

> 💡 Pedile al dueño del restaurante que te cree un usuario con el rol "Cocinero".`,
  },
  {
    key:      'mozo',
    archivo:  'manual-mozo.md',
    titulo:   'Manual de Usuario — Mozo / Cajero',
    intro: `Este manual está dirigido al **mozo o cajero** del restaurante.
Verás el plano de mesas en tiempo real y la cola de pedidos con el detalle exacto
de qué plato va a qué mesa. El sistema elimina la confusión y los errores de entrega.

> 💡 Pedile al dueño que te asigne los permisos: "Mesas", "Cola del día" y "Reservas activas".`,
  },
  {
    key:      'cliente',
    archivo:  'manual-cliente.md',
    titulo:   'Guía para el Cliente — Cómo Hacer tu Pedido',
    intro: `Esta guía es para los **clientes del restaurante**.
No necesitás descargar ninguna app — solo escaneá el código QR de tu mesa y listo.
En menos de 2 minutos podés hacer tu pedido, pagar con Yape y recibir tu código de confirmación.

> 📱 Funciona en cualquier celular con internet. No necesitás crear cuenta.`,
  },
];

module.exports = function generateManuals(resultados, cfg) {
  const ahora = new Date().toLocaleDateString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric',
  });

  for (const manual of MANUALES) {
    const steps = resultados[manual.key] || [];
    let md = `# ${manual.titulo}\n\n`;
    md += `*Última actualización: ${ahora}*\n\n`;
    md += `---\n\n${manual.intro}\n\n---\n\n`;

    if (steps.length === 0) {
      md += `> ⚠️ No se generaron screenshots para este manual. Verificá que el bot corrió correctamente.\n`;
    } else {
      steps.forEach((step, i) => {
        md += `## ${i + 1}. ${step.titulo}\n\n`;
        md += `![${step.titulo}](${step.screenshot})\n\n`;
        md += `${step.descripcion}\n\n`;
        md += `---\n\n`;
      });
    }

    const outputPath = path.join(cfg.OUTPUT_DIR, manual.archivo);
    fs.writeFileSync(outputPath, md, 'utf8');
    console.log(`  ✓ ${manual.archivo} (${steps.length} pasos)`);
  }
};
