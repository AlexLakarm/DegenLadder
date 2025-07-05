const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase URL and Key are required. Make sure .env is loaded.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase; 