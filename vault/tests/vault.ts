import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { expect } from "chai";

describe("vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.vault as Program<Vault>;

  const vaultState = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("state"), provider.publicKey.toBytes()], program.programId)[0];
  const vault = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("vault"), vaultState.toBytes()], program.programId)[0];
  
  let initialVaultBalance: number;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().accountsPartial({
      user: provider.wallet.publicKey,
      vault: vault,
      vaultState: vaultState,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    console.log("Your transaction signature", tx);
    console.log("Your vault info:", (await provider.connection.getAccountInfo(vault)));
    
    // Capture initial vault balance after initialization
    initialVaultBalance = (await provider.connection.getBalance(vault));
    console.log("Initial vault balance:", initialVaultBalance.toString());
    expect((typeof(provider.connection.getAccountInfo(vault))!== null) && (initialVaultBalance !==0));
  });

  it("Deosit 2 sols", async ()=> {
    const tx = await program.methods.deposit(new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL)).accountsPartial({
      user: provider.wallet.publicKey,
      vault,
      vaultState,
      systemProgram: anchor.web3.SystemProgram.programId
    }).rpc()

    console.log("Your transaction signature", tx);
    console.log("Your vault info:", (await provider.connection.getAccountInfo(vault)))
    console.log("Your vault balance:", (await provider.connection.getBalance(vault)).toString())
    const depositBalance = await provider.connection.getBalance(vault);
    expect(depositBalance).to.equal(initialVaultBalance + Number(new anchor.BN(2* anchor.web3.LAMPORTS_PER_SOL)))
  })

  it("Withdraw 2 sols", async ()=> {
    const tx = await program.methods.withdraw(new anchor.BN(2* anchor.web3.LAMPORTS_PER_SOL)).accountsPartial({
      user: provider.wallet.publicKey,
      vault,
      vaultState,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    console.log("Your transaction signature", tx);
    console.log("Your vault info:", (await provider.connection.getAccountInfo(vault)));
    console.log("Your vault balance:", (await provider.connection.getBalance(vault)).toString());
    
    // Check if vault balance has returned to initial balance
    const currentVaultBalance = (await provider.connection.getBalance(vault));
    expect(currentVaultBalance).to.equal(initialVaultBalance);
  })

  it("Close vault", async () => {
    const tx = await program.methods.close().accountsPartial({
      user: provider.wallet.publicKey,
      vault,
      vaultState,
      systemProgram: anchor.web3.SystemProgram.programId
    }).rpc();
    console.log("Your transaction signature:", tx);
    console.log("Your vault info:", (await provider.connection.getAccountInfo(vault)));
    console.log("Your wallet balance:", (await provider.connection.getAccountInfo(provider.wallet.publicKey)).toString());
    expect(typeof(await provider.connection.getAccountInfo(vault))== null);
  })
});
