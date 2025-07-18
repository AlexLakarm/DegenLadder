// Ce script permet d'ajouter une ou plusieurs adresses Solana à la base de données
// et lance directement le worker avec la bonne logique pour chaque adresse.
// Usage: node addUser.js <adresse1> <adresse2> ...

const { runWorker, refreshDegenRank } = require('../worker.js');
const supabase = require('../lib/supabaseClient');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement SUPABASE_URL ou SUPABASE_KEY manquantes.\nAssurez-vous de lancer ce script depuis le dossier backend ou que le .env est bien chargé.');
  process.exit(1);
}

async function addUser(address) {
  console.log(`\n=== Traitement de l'adresse: ${address} ===`);
  let checklist = {
    address,
    userAdded: false,
    pumpTrades: null,
    bonkTrades: null,
    degenRankRefreshed: false
  };
  // 1. Vérifier si l'utilisateur existe déjà
  let existingUser = null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('address')
      .eq('address', address)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    existingUser = data;
  } catch (err) {
    console.error(`❌ Erreur lors de la vérification de l'existence de l'utilisateur:`, err.message);
    checklist.userAdded = 'Erreur';
    printChecklist(checklist);
    process.exit(1);
  }

  if (existingUser) {
    console.log(`ℹ️  L'utilisateur ${address} existe déjà dans la base. Aucun ajout, aucun scan.`);
    checklist.userAdded = 'Déjà présent';
    printChecklist(checklist);
    return;
  }

  // 2. Ajouter l'utilisateur
  try {
    const { error: insertError } = await supabase
      .from('users')
      .insert([{ address: address, last_scanned_at: new Date().toISOString() }]);
    if (insertError) throw insertError;
    console.log(`✅ Utilisateur ${address} ajouté à la table users.`);
    checklist.userAdded = true;
  } catch (err) {
    console.error(`❌ Erreur lors de l'ajout de l'utilisateur:`, err.message);
    checklist.userAdded = 'Erreur';
    printChecklist(checklist);
    process.exit(1);
  }

  // 3. Lancer le worker
  try {
    await runWorker(address, 'full');
    console.log(`✅ Scan initial terminé pour ${address}`);
  } catch (error) {
    console.error(`❌ Erreur lors du scan initial pour ${address}:`, error.message);
    printChecklist(checklist);
    process.exit(1);
  }

  // 4. Vérifier le nombre de trades pump/bonk
  try {
    const { count: pumpCount, error: pumpErr } = await supabase
      .from('trades_pump')
      .select('id', { count: 'exact', head: true })
      .eq('user_address', address);
    checklist.pumpTrades = pumpErr ? 'Erreur' : (pumpCount ?? 0);
  } catch (e) {
    checklist.pumpTrades = 'Erreur';
  }
  try {
    const { count: bonkCount, error: bonkErr } = await supabase
      .from('trades_bonk')
      .select('id', { count: 'exact', head: true })
      .eq('user_address', address);
    checklist.bonkTrades = bonkErr ? 'Erreur' : (bonkCount ?? 0);
  } catch (e) {
    checklist.bonkTrades = 'Erreur';
  }

  // 5. Rafraîchir la vue matérialisée après l'ajout
  try {
    await refreshDegenRank();
    console.log('✅ Vue matérialisée rafraîchie après ajout des utilisateurs.');
    checklist.degenRankRefreshed = true;
  } catch (error) {
    console.error('❌ Échec du rafraîchissement de la vue matérialisée:', error.message);
    checklist.degenRankRefreshed = false;
  }

  printChecklist(checklist);
}

function printChecklist(checklist) {
  console.log('\n--- CHECKLIST ---');
  console.log(`Adresse scannée : ${checklist.address}`);
  console.log(`Ajout à la table user : ${checklist.userAdded}`);
  console.log(`Trades pump : ${checklist.pumpTrades}`);
  console.log(`Trades bonk : ${checklist.bonkTrades}`);
  console.log(`Vue degenrank rafraichie : ${checklist.degenRankRefreshed ? 'Oui' : 'Non'}`);
  console.log('------------------\n');
}

async function main() {
  const addresses = process.argv.slice(2);

  if (addresses.length === 0) {
    console.log('Usage: node scripts/addUser.js <address1> <address2> ...');
    console.log('Merci de fournir au moins une adresse Solana.');
    process.exit(1);
  }

  console.log(`Traitement de ${addresses.length} adresse(s)...`);
  for (const address of addresses) {
    await addUser(address);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Rafraîchir la vue matérialisée après l'ajout
  try {
    await refreshDegenRank();
    console.log('✅ Vue matérialisée rafraîchie après ajout des utilisateurs.');
  } catch (error) {
    console.error('❌ Échec du rafraîchissement de la vue matérialisée:', error.message);
    process.exit(1);
  }

  console.log('\nScript terminé.');
}

main(); 