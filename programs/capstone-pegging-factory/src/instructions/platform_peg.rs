use crate::{
    state::{Config, PlatformPeg},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct PlatformPegging<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = owner,
        seeds = [b"peg", platform_peg.key().as_ref()],
        bump,
        mint::decimals = token_mint.decimals,
        mint::authority = platform_peg,
    )]
    pub platform_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = owner,
        seeds = [b"platform", token_mint.key().as_ref(), config.key().as_ref()],
        bump,
        space =  8 + PlatformPeg::INIT_SPACE
    )]
    pub platform_peg: Account<'info, PlatformPeg>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = platform_peg,
        associated_token::token_program = token_program
    )]
    pub platform_token_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> PlatformPegging<'info> {
    pub fn init_platform_peg(&mut self, bumps: PlatformPeggingBumps) -> Result<()> {
        self.platform_peg.set_inner(PlatformPeg {
            platform_mint: self.platform_mint.key(),
            token_mint: self.token_mint.key(),
            locked: false,
            platform_token_vault: self.platform_token_vault.key(),  
            treasury: self.treasury.key(),
            platform_mint_bump: bumps.platform_mint,
            bump: bumps.platform_peg,
        });

        Ok(())
    }
}
