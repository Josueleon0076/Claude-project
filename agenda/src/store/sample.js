// Un día típico de una jefatura de cajas, para conocer la app rápidamente.
export function sampleTasks(date) {
  return [
    { title: 'Apertura y dotación de fondos', time: '08:00', category: 'fondo', priority: 'alta', repeat: 'weekdays', notes: 'Entregar fondo fijo a cada cajero y firmar bitácora.' },
    { title: 'Revisar asistencia de cajeros', time: '08:15', category: 'personal', priority: 'media', repeat: 'weekdays', notes: '' },
    { title: 'Surtir morralla a cajas', time: '10:00', category: 'fondo', priority: 'media', repeat: 'none', notes: 'Monedas de $1, $2 y $5.' },
    { title: 'Retiro parcial de efectivo', time: '11:30', category: 'valores', priority: 'alta', repeat: 'none', notes: 'Cajas con más de $10,000.' },
    { title: 'Arqueo sorpresa', time: '13:00', category: 'arqueo', priority: 'alta', repeat: 'none', notes: 'Elegir 2 cajas al azar.' },
    { title: 'Entrega a traslado de valores', time: '15:00', category: 'valores', priority: 'alta', repeat: 'none', notes: '' },
    { title: 'Junta con gerencia', time: '17:00', category: 'junta', priority: 'baja', repeat: 'none', notes: '' },
    { title: 'Corte de caja', time: '18:00', category: 'corte', priority: 'alta', repeat: 'daily', notes: '' },
    { title: 'Reporte de faltantes / sobrantes', time: '18:30', category: 'reporte', priority: 'media', repeat: 'daily', notes: 'Enviar a contraloría.' },
  ].map((t) => ({ ...t, date }));
}
