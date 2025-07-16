// Ce script simule l'arrivée d'un nouvel utilisateur de manière synchrone
// pour permettre un débogage et une observation clairs du processus complet.
// 1. Il ajoute l'utilisateur à la base de données.
// 2. Il lance le worker pour cet utilisateur et ATTEND la fin du scan.
// Usage: node scripts/runNewUserSimulation.js <adresseSolana>

const supabase = require('../lib/supabaseClient');
const { runWorker } = require('../worker');

async function main() {
  const address = process.argv[2];

  if (!address) {
    console.log('Usage: node scripts/runNewUserSimulation.js <adresseSolana>');
    console.log('Veuillez fournir une adresse Solana.');
    process.exit(1);
  }

  console.log(`--- Début de la simulation pour le nouvel utilisateur: ${address} ---\n`);

  try {
    // --- ÉTAPE 1: Ajout de l'utilisateur dans la base de données ---
    console.log('[Étape 1/2] Ajout de l\'utilisateur à la table `users`...');
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({ address: address }, { onConflict: 'address' });

    if (upsertError) {
      throw new Error(`Erreur lors de l'ajout de l'utilisateur à Supabase: ${upsertError.message}`);
    }
    console.log('✅ Utilisateur ajouté/confirmé dans la base de données.\n');

    // --- ÉTAPE 2: Lancement du worker et attente de la fin ---
    console.log('[Étape 2/2] Lancement du worker en mode "scan initial"...');
    console.log('Le script va maintenant attendre la fin du traitement du worker.');
    console.log('-----------------------------------------------------------------');
    
    await runWorker(address);
    
    console.log('-----------------------------------------------------------------');
    console.log('\n✅ Le worker a terminé son exécution.');
    console.log('La vue matérialisée a été rafraîchie. Le nouvel utilisateur devrait maintenant apparaître dans le classement.');

  } catch (error) {
    console.error('\n❌ Une erreur est survenue pendant la simulation:', error.message);
    process.exit(1);
  }

  console.log(`\n--- Simulation terminée avec succès pour: ${address} ---`);
}

main(); 