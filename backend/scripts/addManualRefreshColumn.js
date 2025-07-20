const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement SUPABASE_URL ou SUPABASE_KEY manquantes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addManualRefreshColumn() {
  console.log('🔧 Adding last_manual_refresh_at column to users table...');
  
  try {
    // Add the column
    const { error } = await supabase.rpc('add_column_if_not_exists', {
      table_name: 'users',
      column_name: 'last_manual_refresh_at',
      column_definition: 'timestamp with time zone'
    });
    
    if (error) {
      console.error('❌ Error adding column:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Column last_manual_refresh_at added successfully to users table');
    
  } catch (error) {
    console.error('❌ Exception during column addition:', error.message);
    process.exit(1);
  }
}

addManualRefreshColumn(); 