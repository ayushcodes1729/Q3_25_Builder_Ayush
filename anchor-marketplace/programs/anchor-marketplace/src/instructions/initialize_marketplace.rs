use anchor_lang::prelude::*;

use crate::{error::MarketplaceError, state::Marketplace};

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [b"marketplace"],
        bump
    )]
    pub marketplace: Account<'info, Marketplace>,

    #[account(
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeMarketplace<'info> {

    pub fn initialize_marketplace(
        &mut self,
        fee_percentage: u8,
        bumps: InitializeMarketplaceBumps,
    ) -> Result<()> {
        require!(
            fee_percentage <= 100,
            MarketplaceError::InvalidFeePercentage
        );

        self.marketplace.set_inner(Marketplace {
            admin: self.admin.key(),
            fee_percentage,
            bump: bumps.marketplace,
            treasury_bump: bumps.treasury, 
        });

        Ok(())
    }
}