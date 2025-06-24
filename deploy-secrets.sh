#!/bin/bash

# This script runs ON VERCEL during the build/deployment process.
# It replaces placeholders in supabaseClient.js with actual environment variable values.

echo "Injecting Supabase credentials into supabaseClient.js..."

# Check if the target file exists
if [ ! -f "supabaseClient.js" ]; then
  echo "Error: supabaseClient.js not found!"
  exit 1
fi

# Check if Vercel environment variables are available
if [ -z "$VERCEL_PUBLIC_SUPABASE_URL" ] || [ -z "$VERCEL_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "Error: VERCEL_PUBLIC_SUPABASE_URL or VERCEL_PUBLIC_SUPABASE_ANON_KEY environment variables are not set in Vercel project settings."
  exit 1
fi

# Use 'sed' to find and replace the placeholders.
# The '|' is used as a delimiter for sed here to avoid issues if URLs contain '/'.
sed -i "s|__VERCEL_ENV_SUPABASE_URL__|$VERCEL_PUBLIC_SUPABASE_URL|g" supabaseClient.js
sed -i "s|__VERCEL_ENV_SUPABASE_ANON_KEY__|$VERCEL_PUBLIC_SUPABASE_ANON_KEY|g" supabaseClient.js

echo "Supabase credentials injected successfully."
