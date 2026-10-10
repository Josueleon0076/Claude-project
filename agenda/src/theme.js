export const colors = {
  bg: '#F3F5FB',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#4338CA',
  primarySoft: '#EEF2FF',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  success: '#059669',
  successSoft: '#ECFDF5',
};

export const PRIORITIES = {
  alta: { label: 'Alta', color: '#DC2626', soft: '#FEE2E2', weight: 0 },
  media: { label: 'Media', color: '#D97706', soft: '#FEF3C7', weight: 1 },
  baja: { label: 'Baja', color: '#0284C7', soft: '#E0F2FE', weight: 2 },
};

// Categorías pensadas para una jefatura de cajas.
export const CATEGORIES = {
  arqueo: { label: 'Arqueo', icon: 'calculator', color: '#7C3AED' },
  corte: { label: 'Corte de caja', icon: 'cash', color: '#059669' },
  fondo: { label: 'Fondos / morralla', icon: 'wallet', color: '#D97706' },
  valores: { label: 'Valores / depósito', icon: 'shield-checkmark', color: '#0F766E' },
  personal: { label: 'Cajeros / personal', icon: 'people', color: '#2563EB' },
  reporte: { label: 'Reporte', icon: 'document-text', color: '#9333EA' },
  junta: { label: 'Junta', icon: 'chatbubbles', color: '#DB2777' },
  otro: { label: 'Otro', icon: 'ellipsis-horizontal-circle', color: '#6B7280' },
};

export const REPEATS = {
  none: 'No se repite',
  daily: 'Diario',
  weekdays: 'Lun a Vie',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

// Plantillas rápidas para dar de alta actividades comunes con un toque.
export const TEMPLATES = [
  { title: 'Apertura y dotación de fondos', category: 'fondo', priority: 'alta' },
  { title: 'Arqueo sorpresa', category: 'arqueo', priority: 'alta' },
  { title: 'Retiro parcial de efectivo', category: 'valores', priority: 'alta' },
  { title: 'Corte de caja', category: 'corte', priority: 'alta' },
  { title: 'Entrega a traslado de valores', category: 'valores', priority: 'alta' },
  { title: 'Surtir morralla a cajas', category: 'fondo', priority: 'media' },
  { title: 'Revisar asistencia de cajeros', category: 'personal', priority: 'media' },
  { title: 'Reporte de faltantes / sobrantes', category: 'reporte', priority: 'media' },
  { title: 'Junta con gerencia', category: 'junta', priority: 'baja' },
];

export const shadow = {
  shadowColor: '#1E1B4B',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
