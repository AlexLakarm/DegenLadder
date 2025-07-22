const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement SUPABASE_URL ou SUPABASE_KEY manquantes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteUser(userAddress) {
  console.log(`🗑️ Suppression de l'utilisateur: ${userAddress}\n`);
  
  try {
    // Supprimer de rank_history
    console.log('📊 Suppression de rank_history...');
    const { error: rankError } = await supabase
      .from('rank_history')
      .delete()
      .eq('user_address', userAddress);
    
    if (rankError) {
      console.error('❌ Erreur rank_history:', rankError.message);
    } else {
      console.log('✅ Supprimé de rank_history');
    }
    
    // Supprimer de trades_pump
    console.log('🟣 Suppression de trades_pump...');
    const { error: pumpError } = await supabase
      .from('trades_pump')
      .delete()
      .eq('user_address', userAddress);
    
    if (pumpError) {
      console.error('❌ Erreur trades_pump:', pumpError.message);
    } else {
      console.log('✅ Supprimé de trades_pump');
    }
    
    // Supprimer de trades_bonk
    console.log('🟡 Suppression de trades_bonk...');
    const { error: bonkError } = await supabase
      .from('trades_bonk')
      .delete()
      .eq('user_address', userAddress);
    
    if (bonkError) {
      console.error('❌ Erreur trades_bonk:', bonkError.message);
    } else {
      console.log('✅ Supprimé de trades_bonk');
    }
    
    // Supprimer de users
    console.log('👤 Suppression de users...');
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('address', userAddress);
    
    if (userError) {
      console.error('❌ Erreur users:', userError.message);
    } else {
      console.log('✅ Supprimé de users');
    }
    
    // Rafraîchir la vue
    console.log('🔄 Rafraîchissement de la vue degen_rank...');
    const { error: refreshError } = await supabase.rpc('refresh_degen_rank');
    
    if (refreshError) {
      console.error('❌ Erreur rafraîchissement:', refreshError.message);
    } else {
      console.log('✅ Vue degen_rank rafraîchie');
      // Rafraîchir aussi la vue 24h
      const { error: refresh24hError } = await supabase.rpc('refresh_degen_rank_24h');
      if (refresh24hError) {
        console.error('❌ Erreur rafraîchissement degen_rank_24h:', refresh24hError.message);
      } else {
        console.log('✅ Vue degen_rank_24h rafraîchie');
      }
    }
    
    console.log('\n✅ Utilisateur supprimé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Récupérer l'adresse depuis les arguments
const userAddress = process.argv[2];

if (!userAddress) {
  console.error('❌ Veuillez fournir une adresse utilisateur');
  console.log('Usage: node deleteUser.js <adresse>');
  process.exit(1);
}

deleteUser(userAddress); 