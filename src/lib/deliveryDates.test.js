// src/lib/deliveryDates.test.js
import { describe, it, expect } from 'vitest'
import {
  parseAppSettings, isoWeekday, toISODate,
  isDeliveryDateAvailable, getDeliveryDateOptions, isCancelAllowed,
} from './deliveryDates'

describe('parseAppSettings', () => {
  it('returns defaults when rows are empty', () => {
    expect(parseAppSettings([])).toEqual({ cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1,2,3,4,5,6,7] })
  })
  it('parses rows into config', () => {
    const rows = [
      { key: 'order_cutoff_time', value: '18:30' },
      { key: 'cancel_cutoff_time', value: '07:00' },
      { key: 'order_weekdays', value: '1,2,5' },
    ]
    expect(parseAppSettings(rows)).toEqual({ cutoffTime: '18:30', cancelTime: '07:00', weekdays: [1,2,5] })
  })
})

describe('isoWeekday', () => {
  it('maps Sunday to 7 and Monday to 1', () => {
    expect(isoWeekday(new Date(2026, 5, 14))).toBe(7) // 2026-06-14 is Sunday
    expect(isoWeekday(new Date(2026, 5, 15))).toBe(1) // Monday
  })
})

describe('toISODate', () => {
  it('formats local YYYY-MM-DD (no UTC shift)', () => {
    expect(toISODate(new Date(2026, 5, 3))).toBe('2026-06-03')
  })
})

const cfg = { cutoffTime: '20:00', cancelTime: '06:00', weekdays: [1,2,3,4,5,6,7] }

describe('isDeliveryDateAvailable', () => {
  it('false when weekday not in config', () => {
    const onlyMon = { ...cfg, weekdays: [1] }
    const tue = new Date(2026, 5, 16) // Tuesday
    const now = new Date(2026, 5, 14, 10, 0)
    expect(isDeliveryDateAvailable(tue, now, onlyMon)).toBe(false)
  })
  it('true when before cutoff of previous day', () => {
    const d = new Date(2026, 5, 16)            // deliver Tue Jun 16
    const now = new Date(2026, 5, 15, 19, 0)   // Mon 19:00 < 20:00 cutoff
    expect(isDeliveryDateAvailable(d, now, cfg)).toBe(true)
  })
  it('false when after cutoff of previous day', () => {
    const d = new Date(2026, 5, 16)
    const now = new Date(2026, 5, 15, 20, 1)   // Mon 20:01 >= cutoff
    expect(isDeliveryDateAvailable(d, now, cfg)).toBe(false)
  })
})

describe('getDeliveryDateOptions', () => {
  it('returns next 5 calendar days starting TOMORROW (today is never deliverable)', () => {
    const now = new Date(2026, 5, 15, 10, 0) // Mon 10:00
    const opts = getDeliveryDateOptions(now, cfg)
    expect(opts).toHaveLength(5)
    expect(opts[0].iso).toBe('2026-06-16') // mañana, no hoy
    expect(opts.map(o => o.iso)).toEqual([
      '2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20',
    ])
    // mañana (Jun 16): corte Jun 15 20:00, now 10:00 -> disponible
    expect(opts[0].available).toBe(true)
  })

  it('drops tomorrow when past the cutoff (after 20:00 today)', () => {
    const now = new Date(2026, 5, 15, 20, 30) // Lun 20:30 -> corte de Jun 16 ya pasó
    const opts = getDeliveryDateOptions(now, cfg)
    expect(opts[0].iso).toBe('2026-06-16')
    expect(opts[0].available).toBe(false)   // corte (Jun 15 20:00) pasó
    expect(opts[1].available).toBe(true)    // Jun 17: corte (Jun 16 20:00) sigue por delante
  })
})

describe('isCancelAllowed', () => {
  it('true before deliveryDate @ cancelTime', () => {
    const now = new Date(2026, 5, 16, 5, 0)    // 05:00 < 06:00
    expect(isCancelAllowed('2026-06-16', now, cfg)).toBe(true)
  })
  it('false at/after cancel cutoff', () => {
    const now = new Date(2026, 5, 16, 6, 1)    // 06:01 >= 06:00
    expect(isCancelAllowed('2026-06-16', now, cfg)).toBe(false)
  })
})
