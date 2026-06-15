import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppSettings } from './useAppSettings'

const upsert = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('../lib/supabase', () => ({ supabase: {
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }), upsert: (...a) => upsert(...a) }),
}}))
beforeEach(() => upsert.mockClear())

describe('useAppSettings.saveSettings', () => {
  it('hace upsert de las 3 claves como filas key/value', async () => {
    const { result } = renderHook(() => useAppSettings())
    await act(async () => {
      await result.current.saveSettings({ weekdays:[1,2,3,4,5,6], cutoffTime:'19:00', cancelTime:'06:00' })
    })
    const rows = upsert.mock.calls[0][0]
    expect(rows).toEqual(expect.arrayContaining([
      { key:'order_weekdays',     value:'1,2,3,4,5,6' },
      { key:'order_cutoff_time',  value:'19:00' },
      { key:'cancel_cutoff_time', value:'06:00' },
    ]))
  })
})
