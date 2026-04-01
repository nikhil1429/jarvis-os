// supabase.js — Supabase client for JARVIS OS cloud persistence
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (url && key) ? createClient(url, key) : null
export const isSupabaseConfigured = () => !!supabase

function getDeviceId() {
  let id = localStorage.getItem('jos-device-id')
  if (!id) { id = 'device_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('jos-device-id', id) }
  return id
}
export const DEVICE_ID = getDeviceId()
