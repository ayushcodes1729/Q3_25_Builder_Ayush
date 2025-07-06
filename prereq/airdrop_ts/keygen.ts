import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
let kp = Keypair.generate()
console.log(`You have generated a new Solana Wallet: ${kp.publicKey.toBase58()}`);
console.log(`[${kp.secretKey.toString()}]`);

function walletToBase58() {
    const secretKey = bs58.encode(kp.secretKey);
    const wallet = Keypair.fromSecretKey(bs58.decode(secretKey));
    console.log(`Wallet Public Key: ${wallet.publicKey.toBase58()}`);
    console.log(`Wallet Secret Key: ${secretKey}`);
    return secretKey;
}

function base58ToWallet(base58String: string) {
    const secretKey = bs58.decode(base58String);
    const wallet = Keypair.fromSecretKey(secretKey);
    console.log(`Secret key: ${wallet.secretKey}`);
    console.log(`Secret key: ${wallet.publicKey}`);
}

const secKey = walletToBase58();
base58ToWallet(kp.secretKey.toString());