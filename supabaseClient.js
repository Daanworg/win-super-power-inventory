// supabaseClient.js - SECURE VERSION FOR GITHUB

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// These are placeholders that MUST be replaced by Vercel during deployment
// using the values from Vercel's Environment Variables settings.
// The Vercel Environment Variables should be named:
// VERCEL_PUBLIC_SUPABASE_URL
// VERCEL_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_URL = "VERCEL_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY = "VERCEL_PUBLIC_SUPABASE_ANON_KEY";

// A small check for developers. If this runs in the browser with placeholders, something is wrong.
if (SUPABASE_URL === "YOUR_VERCEL_SUPABASE_URL_PLACEHOLDER" || SUPABASE_ANON_KEY === "YOUR_VERCEL_SUPABASE_ANON_KEY_PLACEHOLDER") {
    console.error(
        "CRITICAL: Supabase credentials appear to be placeholders and were not replaced during deployment. " +
        "Ensure Vercel Environment Variables (VERCEL_PUBLIC_SUPABASE_URL, VERCEL_PUBLIC_SUPABASE_ANON_KEY) are set " +
        "AND the build command (e.g., deploy-secrets.sh) is correctly replacing these placeholders."
    );
}

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
