import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

let kp = Keypair.generate()
console.log(`You have generated a new Solana Wallet: ${kp.publicKey.toBase58()}`);
console.log(`[${kp.secretKey.toString()}]`);

function walletToBase58() {
    const secretKey = bs58.encode([62,251,77,84,18,90,188,52,226,174,64,99,69,118,157,18,60,59,178,141,24,1,250,214,63,171,100,39,186,55,84,65,87,239,95,226,182,112,133,46,43,226,199,172,75,194,97,130,127,197,221,137,164,166,130,92,131,220,204,250,143,190,146,32]);
    const wallet = Keypair.fromSecretKey(bs58.decode(secretKey));
    console.log(`Wallet Public Key: ${wallet.publicKey.toBase58()}`);
    console.log(`Wallet Secret Key: ${secretKey}`);
    return secretKey;
}

function base58ToWallet(base58String: string) {
    const secretKey = bs58.decode(base58String);
    const wallet = Keypair.fromSecretKey(secretKey);
    console.log(wallet.secretKey);
}

const secKey = walletToBase58();
base58ToWallet(secKey);