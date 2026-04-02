// src/supabase.js
import { createClient } from '@supabase/supabase-js'

// En Vite las variables de entorno usan VITE_ como prefijo (no REACT_APP_)
// Crealas en Vercel > Settings > Environment Variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://TU_PROYECTO.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Mq3PcVUpHIEJDGBF_qdN9Q_xLf2Nv1J'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Subir imagen al bucket oasis-images
export const uploadImage = async (file, folder = 'products') => {
  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from('oasis-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('oasis-images').getPublicUrl(data.path)
  return urlData.publicUrl
}

// Generar código de pedido único tipo OAS-260402-1234
export const generateOrderCode = () => {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `OAS-${yy}${mm}${dd}-${rand}`
}
