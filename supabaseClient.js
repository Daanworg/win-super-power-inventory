// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your actual Supabase Project URL and Public Key
const SUPABASE_URL = 'https://fyaikvhafxodkswnzbtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YWlrdmhhZnhvZGtzd256YnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAxODUsImV4cCI6MjA2NjI3NjE4NX0.LWPp2pVVjdUFc8I2g8qpquk3deGHyvNmYzpMog_wBR0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
