// supabaseClient.js - SECURE VERSION FOR GITHUB

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// These are unique placeholders. Vercel will replace these during deployment.
const SUPABASE_URL = "VERCEL_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY = "VERCEL_PUBLIC_SUPABASE_ANON_KEY";

// A small check for developers. If this runs in the browser with placeholders, something is wrong.
if (SUPABASE_URL.startsWith("__VERCEL_ENV_")) {
    console.error(
        "CRITICAL: Supabase credentials are not being replaced during deployment. " +
        "Ensure your Vercel build command is correctly running the placeholder replacement script."
    );
}

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
