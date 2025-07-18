// Ce script permet d'ajouter une ou plusieurs adresses Solana à la base de données
// et lance directement le worker avec la bonne logique pour chaque adresse.
// Usage: node addUser.js <adresse1> <adresse2> ...

const { runWorker, refreshDegenRank } = require('../worker.js');

async function addUser(address) {
  console.log(`Ajout de l'adresse: ${address}...`);
  try {
    // Lancer le worker directement pour cet utilisateur
    await runWorker(address, 'full');
    console.log(`✅ Utilisateur ajouté et scanné: ${address}`);
  } catch (error) {
    console.error(`❌ Erreur pour l'adresse ${address}:`, error.message);
  }
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
    // Petite pause pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Rafraîchir la vue matérialisée après l'ajout
  try {
    await refreshDegenRank();
    console.log('✅ Vue matérialisée rafraîchie après ajout des utilisateurs.');
  } catch (error) {
    console.error('❌ Échec du rafraîchissement de la vue matérialisée:', error.message);
  }

  console.log('\nScript terminé.');
}

main(); 