// supabaseClient.js - Initializes and exports the Supabase client

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your Supabase Project URL and Public Anon Key
// These should ideally be loaded from environment variables in a production build,
// but for a simple static deployment without a build step, they can be here.
// For Vercel, you would set these as Environment Variables in the Vercel dashboard.
// VERCEL_PUBLIC_SUPABASE_URL and VERCEL_PUBLIC_SUPABASE_ANON_KEY
// And then access them via import.meta.env.VERCEL_PUBLIC_SUPABASE_URL
// However, for pure static client-side JS without a build tool injecting them,
// hardcoding or fetching from a config endpoint are alternatives.
// For now, we'll use the direct values as per your .env example.

const SUPABASE_URL = 'https://fyaikvhafxodkswnzbtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YWlrdmhhZnhvZGtzd256YnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAxODUsImV4cCI6MjA2NjI3NjE4NX0.LWPp2pVVjdUFc8I2g8qpquk3deGHyvNmYzpMog_wBR0';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase URL or Anon Key is missing. Please check your configuration.");
    // Potentially throw an error or display a message to the user
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
