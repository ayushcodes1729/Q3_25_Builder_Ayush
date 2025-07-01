import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import wallet from './dev-wallet.json'

const keyPair = Keypair.fromSecretKey(new Uint8Array(wallet))
const connection = new Connection('https://api.devnet.solana.com');

(async () => {
    try {
        const txhash = await connection.requestAirdrop( keyPair.publicKey, 2 * LAMPORTS_PER_SOL);
        console.log(`Success! Check your transaction here: https://explorer.solana.com/tx/${txhash}?cluster=devnet`);

    } catch (error) {
        console.error('Oops, something went wrong:', error);
    }
})();