// src/hooks/useAppSettings.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseAppSettings } from '../lib/deliveryDates'

let _cache = null // settings cambian rara vez; cache a nivel de módulo

export function useAppSettings() {
  const [config, setConfig] = useState(_cache)
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) return
    supabase.from('app_settings').select('key, value').then(({ data, error }) => {
      const cfg = parseAppSettings(error ? [] : data)
      _cache = cfg
      setConfig(cfg)
      setLoading(false)
    })
  }, [])

  async function saveSettings({ weekdays, cutoffTime, cancelTime }) {
    const rows = [
      { key: 'order_weekdays',     value: [...weekdays].sort((a, b) => a - b).join(',') },
      { key: 'order_cutoff_time',  value: cutoffTime },
      { key: 'cancel_cutoff_time', value: cancelTime },
    ]
    const { error } = await supabase.from('app_settings').upsert(rows)
    if (!error) { _cache = { weekdays, cutoffTime, cancelTime }; setConfig(_cache) }
    return { error }
  }

  return { config: config ?? parseAppSettings([]), loading, saveSettings }
}
