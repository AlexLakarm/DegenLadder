// Ce script permet d'ajouter une ou plusieurs adresses Solana à la base de données
// en appelant l'endpoint /user/connect, ce qui déclenche également le scan du worker.
// Usage: node addUser.js <adresse1> <adresse2> ...

const API_ENDPOINT = 'http://localhost:3000/user/connect';

async function addUser(address) {
  console.log(`Adding address: ${address}...`);
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add address ${address}. Status: ${response.status}. Error: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log(`✅ Successfully added or found address: ${address}. Message: ${result.message}`);
  } catch (error) {
    console.error(`❌ Error for address ${address}:`, error.message);
  }
}

async function main() {
  const addresses = process.argv.slice(2);

  if (addresses.length === 0) {
    console.log('Usage: node scripts/addUser.js <address1> <address2> ...');
    console.log('Please provide at least one Solana address.');
    process.exit(1);
  }

  console.log(`Starting to process ${addresses.length} address(es)...`);
  
  for (const address of addresses) {
    await addUser(address);
  }

  console.log('\nScript finished.');
}

main(); 