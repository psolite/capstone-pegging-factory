use anchor_lang::prelude::*;

use crate::{error::PegError, state::Config};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [b"pegconfig", admin.key().as_ref()],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn init(&mut self, fee: u16, bumps: InitializeBumps) -> Result<()> {
        require!(fee > 0, PegError::FeeIsZero);
        require!(fee < 10000, PegError::FeeOverFlow);

        self.config.set_inner(
            Config {
            admin: self.admin.key(),
            fee,
            bump: bumps.config,
        });

        Ok(())
    }
}
