// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your actual Supabase Project URL and Public Key
const SUPABASE_URL = 'VERCEL_PUBLIC_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'VERCEL_PUBLIC_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
