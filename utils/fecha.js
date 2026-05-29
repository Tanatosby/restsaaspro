const TZ = 'America/Lima';

function fechaLima() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

module.exports = { fechaLima };
