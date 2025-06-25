// supabaseClient.js - vFinal (Forced Logout on Browser Close)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://fyaikvhafxodkswnzbtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YWlrdmhhZnhvZGtzd256YnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAxODUsImV4cCI6MjA2NjI3NjE4NX0.LWPp2pVVjdUFc8I2g8qpquk3deGHyvNmYzpMog_wBR0';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase URL or Anon Key is missing. Please check your configuration.");
}

// Create and export the Supabase client
// The KEY CHANGE is adding the 'storage' option and setting it to sessionStorage.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: sessionStorage, // Use sessionStorage instead of the default localStorage
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
});

console.log("[Supabase Client] Initialized to use sessionStorage. User will be logged out on browser close.");
