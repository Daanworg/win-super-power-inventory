// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your actual Supabase Project URL and Public Key
const SUPABASE_URL = 'https://rhbgtnfkjbgsquakrrtr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYmd0bmZramJnc3F1YWtycnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTIxNTcsImV4cCI6MjA2NjIyODE1N30.r7cBZdTlr9vtQb6z8AhD9naqXIsiu9blRLbfxjyiM0g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);