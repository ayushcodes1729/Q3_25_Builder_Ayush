#[cfg(test)]
mod tests {
    use solana_client::rpc_client::RpcClient;
    use solana_program::{pubkey::Pubkey, system_instruction::transfer};
    use solana_sdk::blake3::hash;
    use solana_sdk::instruction::{self, AccountMeta, Instruction};
    use solana_sdk::{
        self,
        message::Message,
        signature::{Keypair, Signer, read_keypair_file},
        transaction::Transaction,
    };
    use solana_sdk::{signature, system_program, transaction};
    use std::io::{self, BufRead};
    use std::str::FromStr;

    const RPC_URL: &str = "https://api.devnet.solana.com";

    #[test]
    fn keygen() {
        // let kp = Keypair::new();
        // println!(
        //     "You have generated a new Solana wallet: {}",
        //     kp.pubkey().to_string()
        // );
        // println!();
        // println!("To save your wallet, copy and paste the following into a JSON file:");
        // println!("{:?}", kp.to_bytes());

        let keypair = read_keypair_file("turbin3_wallet.json").expect("Couldn't find wallet");

        println!("Pubkey is {}", keypair.pubkey());

    }

    #[test]
    fn base58_to_wallet() {
        println!("Input your private key as a base58 string:");
        let stdin = io::stdin();
        let base58 = stdin.lock().lines().next().unwrap().unwrap();
        println!("Your wallet file format is:");
        let wallet = bs58::decode(base58).into_vec().unwrap();
        println!("{:?}", wallet);
    }
    #[test]
    fn wallet_to_base58() {
        println!("Input your private key as a JSON byte array (e.g. [12,34,...]):");
        let stdin = io::stdin();
        let wallet = stdin
            .lock()
            .lines()
            .next()
            .unwrap()
            .unwrap()
            .trim_start_matches('[')
            .trim_end_matches(']')
            .split(',')
            .map(|s| s.trim().parse::<u8>().unwrap())
            .collect::<Vec<u8>>();
        println!("Your Base58-encoded private key is:");

        let base58 = bs58::encode(wallet).into_string();
        println!("{:?}", base58);
    }

    #[test]
    fn airdrop() {
        let keypair = read_keypair_file("dev_wallet.json").expect("Couldn't find wallet file");
        let client = RpcClient::new(RPC_URL.to_string());

        match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64) {
            Ok(sig) => {
                println!("Success! Check your TX here:");
                println!("https://explorer.solana.com/tx/{}?cluster=devnet", sig);
            }
            Err(err) => {
                println!("Airdrop failed: {}", err);
            }
        }
    }
    #[test]
    fn transfer_sol() {
        let keypair = read_keypair_file("dev_wallet.json").expect("Couldn't find the wallet");
        let pubkey = keypair.pubkey();
        let message_bytes = b"I verify my Solana Keypair!";
        let sig = keypair.sign_message(message_bytes);
        let sig_hashed = hash(sig.as_ref());

        match sig.verify(&pubkey.to_bytes(), &sig_hashed.to_bytes()) {
            true => println!("Signature Verified"),
            false => println!("Verification failed"),
        }

        let to_pubkey = Pubkey::from_str("3CPvFJ3RDJH9RjpzY3WYxn1vcrL7J63hZQc9YboMaCg9").unwrap();
        let rpc_client = RpcClient::new(RPC_URL);

        let balance = rpc_client
            .get_balance(&keypair.pubkey())
            .expect("Failed to get balance");

        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");

        let message = Message::new_with_blockhash(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance)],
            Some(&keypair.pubkey()),
            &recent_blockhash,
        );

        let fee = rpc_client
            .get_fee_for_message(&message)
            .expect("Failed to get fee calculator");

        let transaction = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)],
            Some(&keypair.pubkey()),
            &vec![&keypair],
            recent_blockhash,
        );

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");

        println!(
            "Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        )
    }

    #[test]
    fn enroll() {
        let rpc_client = RpcClient::new(RPC_URL);
        let signer =
            read_keypair_file("turbin3_wallet.json").expect("Couldn't find the wallet file");

        println!("{}", signer.pubkey());
        let mint = Keypair::new();
        let turbin3_prereq_program =
            Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap();
        let collection = Pubkey::from_str("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2").unwrap();
        let mpl_core_program =
            Pubkey::from_str("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d").unwrap();
        let system_program = system_program::id();

        let signer_pubkey = signer.pubkey();
        let seeds = &[b"prereqs", signer_pubkey.as_ref()];

        let (prereq_pda, _bump) = Pubkey::find_program_address(seeds, &turbin3_prereq_program);
        let data = vec![77, 124, 82, 163, 21, 133, 181, 206];

        let mint_seeds = &[b"collection", collection.as_ref()];
        let (authority, _bump) = Pubkey::find_program_address(mint_seeds, &turbin3_prereq_program);

        let accounts = vec![
            AccountMeta::new(signer_pubkey, true),
            AccountMeta::new(prereq_pda, false),
            AccountMeta::new(mint.pubkey(), true),
            AccountMeta::new(collection, false),
            AccountMeta::new_readonly(authority, false),
            AccountMeta::new_readonly(mpl_core_program, false),
            AccountMeta::new_readonly(system_program, false),
        ];

        let blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");

        let instruction = Instruction {
            program_id: turbin3_prereq_program,
            accounts,
            data,
        };

        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&signer.pubkey()),
            &[&signer, &mint],
            blockhash,
        );

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");
        println!(
            "Success! Check out your TX here:\nhttps://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );
    }
}
