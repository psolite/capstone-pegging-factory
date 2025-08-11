use crate::{
    error::PegError,
    state::{PlatformPeg, ProjectPeg},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct ProjectPegging<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mint::authority = platform_peg,
    )]
    pub platform_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = owner,
        seeds = [b"peg", project_peg.key().as_ref()],
        bump,
        mint::decimals = platform_mint.decimals,
        mint::authority = project_peg,
    )]
    pub project_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = owner,
        seeds = [b"project", owner.key().as_ref(), platform_mint.key().as_ref()],
        bump,
        space =  8 + ProjectPeg::INIT_SPACE
    )]
    pub project_peg: Account<'info, ProjectPeg>,

    pub platform_peg: Account<'info, PlatformPeg>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = platform_mint,
        associated_token::authority = project_peg,
        associated_token::token_program = token_program
    )]
    pub project_token_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ProjectPegging<'info> {
    pub fn init_project_peg(
        &mut self,
        ratio_numerator: u64,
        ratio_denominator: u64,
        bumps: ProjectPeggingBumps,
    ) -> Result<()> {
        require!(
            ratio_numerator > 0 && ratio_denominator > 0,
            PegError::InvalidAmount
        );

        self.project_peg.set_inner(ProjectPeg {
            owner: self.owner.key(),
            platform_mint: self.platform_mint.key(),
            project_mint: self.project_mint.key(),
            ratio_numerator,
            ratio_denominator,
            project_token_vault: self.project_token_vault.key(),
            project_mint_bump: bumps.project_mint,
            bump: bumps.project_peg,
        });

        Ok(())
    }
}
