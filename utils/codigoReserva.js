// Caracteres sin ambigüedad visual: sin 0/O, sin 1/l/I
const CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO = 7;

function generarCodigoUnico(db) {
  let codigo;
  let intentos = 0;
  do {
    codigo = Array.from(
      { length: LARGO },
      () => CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
    intentos++;
    if (intentos > 200) throw new Error('No se pudo generar código de reserva único');
  } while (db.prepare('SELECT id FROM reservas WHERE codigo = ?').get(codigo));
  return codigo;
}

module.exports = { generarCodigoUnico };
