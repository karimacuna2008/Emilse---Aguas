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

  return { config: config ?? parseAppSettings([]), loading }
}
