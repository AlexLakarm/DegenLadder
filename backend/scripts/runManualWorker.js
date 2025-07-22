// Ce script est conçu pour être lancé manuellement depuis votre machine locale.
// Il exécute la logique complète du worker sans la contrainte de temps de Vercel.

const path = require('path');
// S'assurer que les variables d'environnement du backend sont chargées
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { runWorker } = require('../worker');

async function main() {
  console.log('--- Lancement manuel du Worker ---');
  console.log('Ce processus peut prendre plusieurs minutes. Laissez ce terminal ouvert.');
  
  try {
    // On appelle runWorker sans argument pour un scan global incrémental
    await runWorker();
    console.log('\n✅ --- Worker finished successfully (all materialized views refreshed) ---');
    process.exit(0); // Termine le script avec un code de succès
  } catch (error) {
    console.error('\n❌ --- Le Worker a rencontré une erreur fatale ---');
    console.error(error);
    process.exit(1); // Termine le script avec un code d'erreur
  }
}

main(); 