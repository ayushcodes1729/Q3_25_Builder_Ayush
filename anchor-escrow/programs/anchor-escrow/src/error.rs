use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid mint_a key")]
    InvalidMintA,
    
    #[msg("Invalid mint_b key")]
    InvalidMintB,

    #[msg("Invalid maker key")]
    InvalidMaker,
}
