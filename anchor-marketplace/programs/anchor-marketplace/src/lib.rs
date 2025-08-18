#![allow(deprecated)]
#![allow(unexpected_cfgs)]
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Ewtaxy2RcdZ9jfmpJzSL8jmuhbiPAUUGg3unLaFBWGFu");

#[program]
pub mod anchor_marketplace {
    use super::*;

    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>, fee_percentage: u8) -> Result<()> {
        ctx.accounts.initialize_marketplace(fee_percentage, ctx.bumps)?;
        Ok(())
    }
}
