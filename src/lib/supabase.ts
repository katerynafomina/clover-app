import { AppState } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const EXPO_PUBLIC_SUPABASE_URL='https://mwktcpbchiwczbthfqrw.supabase.co'
const EXPO_PUBLIC_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13a3RjcGJjaGl3Y3pidGhmcXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMjYxNTgsImV4cCI6MjA1ODcwMjE1OH0.RrUa0iz3r17T691VjssCOBYdN_pMF8q_yrsfg8RotKg'
export const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
  })
