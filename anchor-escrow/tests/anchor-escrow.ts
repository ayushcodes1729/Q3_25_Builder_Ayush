import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorEscrow } from "../target/types/anchor_escrow";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  Account,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

// One party not fulfilling their side of the deal
// Front-running attacks
// Double-spending attempts
// Malicious actors taking advantage of trust

// initialize 2 accounts maker and taker
// Initialize 2 mint accounts mintA and mintB
// Airdrop some sols to both maker and taker
// mint token A in makerAtaA and B in takerAtaB

// Faulty test cases

// Check for refund instrcution
// Initialize escrow
// Make an offer of x amount of token A and deposit to the vault in escrow
// Don't send back any tokens from Taker
// Refund token A to makerAtaA

// Check for maker betraying
// Try sending y amount of token B to maker_ata_B before checking the vault, when no money is in the vault, don't complete the action in that case

// Check for front-running attacks
// Make another player and try sending >x amount of token A in the vault before the maker at the same time (just after maker does this), but don't let this happen, make the second transaction fail and complete all other things in the same way as correct test case

// Check for double spending attempts
// Initialize escrow
// Make an offer x amount of token A to vault in the escrow
// Make another offer z amount of token A to vault in the escrow and don't let that happen
// Perform all other instructions of escrow as the normal case

describe("anchor-escrow", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.anchorEscrow as Program<AnchorEscrow>;

  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerAtaA: Account;
  let makerAtaB: Account;
  let takerAtaA: Account;
  let takerAtaB: Account;
  let escrowPda: PublicKey;
  let vault: PublicKey;
  let escrowBump: number;
  let vaultBump: number;

  const tokenA_decimals = 1_000_000;
  const tokenB_decimals = 1_000_000_000;

  //Test parameters
  const seed = new anchor.BN(1);
  const deposit_amount = new anchor.BN(10 * 10 ** 6);
  const recieve_amount = new anchor.BN(100 * 10 ** 9);
  const maker = Keypair.generate();
  const taker = Keypair.generate();
  before(async () => {
    try {
      console.log("Started");

      console.log(maker.publicKey);
      console.log(taker.publicKey);
      const tx1 = await connection.requestAirdrop(
        maker.publicKey,
        2 * LAMPORTS_PER_SOL
      );

      const tx2 = await connection.requestAirdrop(
        taker.publicKey,
        2 * LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(tx1);
      await connection.confirmTransaction(tx2);

      console.log("Tx1:", tx1);
      console.log("Tx2:", tx2);

      mintA = await createMint(connection, maker, maker.publicKey, null, 6);
      mintB = await createMint(connection, maker, maker.publicKey, null, 9);
      console.log(mintA);
      console.log(mintB);

      makerAtaA = await getOrCreateAssociatedTokenAccount(
        connection,
        maker,
        mintA,
        maker.publicKey
      );

      makerAtaB = await getOrCreateAssociatedTokenAccount(
        connection,
        maker,
        mintB,
        maker.publicKey
      );

      takerAtaA = await getOrCreateAssociatedTokenAccount(
        connection,
        taker,
        mintA,
        taker.publicKey
      );

      takerAtaB = await getOrCreateAssociatedTokenAccount(
        connection,
        taker,
        mintB,
        taker.publicKey
      );

      await mintTo(
        connection,
        maker,
        mintA,
        makerAtaA.address,
        maker.publicKey,
        100 * tokenA_decimals
      );

      await mintTo(
        connection,
        maker,
        mintB,
        takerAtaB.address,
        maker.publicKey,
        1000 * tokenB_decimals
      );

      [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          maker.publicKey.toBuffer(),
          seed.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      vault = await getAssociatedTokenAddress(mintA, escrowPda, true);
    } catch (error) {
      console.log("Couldn't do the before actions", error);
    }
  });

  it("Make", async () => {
    const tx = await program.methods
      .make(seed, deposit_amount, recieve_amount)
      .accountsPartial({
        maker: maker.publicKey,
        escrow: escrowPda,
        mintA,
        mintB,
        vault,
        makerAtaA: makerAtaA.address,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
    console.log("Your transaction signature", tx);
    const escrowAccount = await program.account.escrow.fetch(escrowPda);
    const vaultAccount = await getAccount(connection, vault);

    assert.equal(escrowAccount.seed.toString(), seed.toString());
    assert.equal(escrowAccount.maker.toString(), maker.publicKey.toString());

    assert.equal(escrowAccount.bump.toString(), escrowBump.toString());
    assert.equal(escrowAccount.mintA.toString(), mintA.toString());
    assert.equal(escrowAccount.mintB.toString(), mintB.toString());

    console.log("Vault amount: ", vaultAccount.amount.toString());
    assert.equal(vaultAccount.mint.toString(), mintA.toString());
    assert.equal(vaultAccount.owner.toString(), escrowPda.toString());
    assert.equal(vaultAccount.amount.toString(), deposit_amount.toString());
  });

  console.log("Take Instructions");

  it("Take", async () => {
    const tx = await program.methods
      .take()
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        escrow: escrowPda,
        mintA: mintA,
        mintB: mintB,
        vault: vault,
        takerAtaA: takerAtaA.address,
        takerAtaB: takerAtaB.address,
        makerAtaB: makerAtaB.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    console.log("Your take transaction signature", tx);
    const updatedMakerAtaA = await getAccount(connection, makerAtaA.address);
    const updatedMakerAtaB = await getAccount(connection, makerAtaB.address);
    const updatedTakerAtaA = await getAccount(connection, takerAtaA.address);
    const updatedTakerAtaB = await getAccount(connection, takerAtaB.address);

    try {
      await getAccount(connection, vault);
      assert.fail("Vault Account is closed");
    } catch (error) {
      expect(error.name).to.equal("TokenAccountNotFoundError");
    }

    assert.equal(updatedMakerAtaB.amount.toString(), recieve_amount.toString());
    assert.equal(
      updatedMakerAtaA.amount.toString(),
      (100 * tokenA_decimals - deposit_amount.toNumber()).toString()
    );
    assert.equal(updatedTakerAtaA.amount.toString(), deposit_amount.toString());
    assert.equal(
      updatedTakerAtaB.amount.toString(),
      (1000 * tokenB_decimals - recieve_amount.toNumber()).toString()
    );
  });

  it("Make and Refund", async () => {
    const newSeed = new anchor.BN(2);
    [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        newSeed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    vault = await getAssociatedTokenAddress(mintA, escrowPda, true);
    const tx = await program.methods
      .make(newSeed, deposit_amount, recieve_amount)
      .accountsPartial({
        maker: maker.publicKey,
        escrow: escrowPda,
        mintA,
        mintB,
        vault,
        makerAtaA: makerAtaA.address,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    const oldMakerAtaA = await getAccount(connection, makerAtaA.address);
    const beforeBalance = oldMakerAtaA.amount;

    const refundTx = await program.methods
      .refund()
      .accountsPartial({
        maker: maker.publicKey,
        escrow: escrowPda,
        mintA,
        vault,
        makerAtaA: makerAtaA.address,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    const newMakerAtaA = await getAccount(connection, makerAtaA.address);
    const afterBalance = newMakerAtaA.amount;

    assert.equal(afterBalance.toString(), (Number(beforeBalance)+ deposit_amount.toNumber()).toString());

    try {
      await getAccount(connection, vault);
      assert.fail("Vault Account is closed");
    } catch (error) {
      expect(error.name).to.equal("TokenAccountNotFoundError");
    }
  });
});
