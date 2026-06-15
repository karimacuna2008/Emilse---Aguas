// src/lib/deliveryDates.js
const DEFAULTS = { cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1, 2, 3, 4, 5, 6, 7] }

export function parseAppSettings(rows) {
  const map = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]))
  const weekdays = (map.order_weekdays ?? '1,2,3,4,5,6,7')
    .split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 7)
  return {
    cutoffTime: map.order_cutoff_time ?? DEFAULTS.cutoffTime,
    cancelTime: map.cancel_cutoff_time ?? DEFAULTS.cancelTime,
    weekdays: weekdays.length ? weekdays : DEFAULTS.weekdays,
  }
}

// ISO weekday: 1=Mon..7=Sun (JS getDay: 0=Sun..6=Sat)
export function isoWeekday(date) {
  const d = date.getDay()
  return d === 0 ? 7 : d
}

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function timeParts(t) { const [h, m] = t.split(':').map(Number); return [h, m] }

// (a) weekday active  AND  (b) now < (D - 1 day) @ cutoffTime
export function isDeliveryDateAvailable(deliveryDate, now, config) {
  if (!config.weekdays.includes(isoWeekday(deliveryDate))) return false
  const cutoff = new Date(deliveryDate)
  cutoff.setDate(cutoff.getDate() - 1)
  const [h, m] = timeParts(config.cutoffTime)
  cutoff.setHours(h, m, 0, 0)
  return now < cutoff
}

// Próximos `count` días de calendario a partir de MAÑANA (hoy nunca es entregable),
// cada uno con su disponibilidad según corte/weekday.
export function getDeliveryDateOptions(now, config, count = 5) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + 1) // empezar desde mañana
  const options = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    options.push({ date: d, iso: toISODate(d), available: isDeliveryDateAvailable(d, now, config) })
  }
  return options
}

// Cancellation allowed while now < deliveryDate @ cancelTime
export function isCancelAllowed(deliveryDateISO, now, config) {
  const [y, mo, da] = deliveryDateISO.split('-').map(Number)
  const cutoff = new Date(y, mo - 1, da)
  const [h, m] = timeParts(config.cancelTime)
  cutoff.setHours(h, m, 0, 0)
  return now < cutoff
}

// ── Helpers de presentación en español (admin) ──
const DIAS_ES  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function formatWeekday(iso) { return DIAS_ES[parseISO(iso).getDay()] }
export function formatLongDate(iso) { const dt = parseISO(iso); return `${dt.getDate()} ${MESES_ES[dt.getMonth()]}` }
