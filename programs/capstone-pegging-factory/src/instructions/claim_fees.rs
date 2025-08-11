use crate::{error::PegError, instructions::transfer_tokens, state::Config};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [b"pegconfig", user.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Claim<'info> {
    pub fn claim_fees(&mut self) -> Result<()> {
        require!(
            self.user.key() == self.config.admin.key(),
            PegError::UnAuthorized
        );

        let seeds = &[
            b"pegconfig", 
            self.user.to_account_info().key.as_ref(), 
            &[self.config.bump]];

        let signer_seeds = &[&seeds[..]];
        let amount = self.treasury.amount;
        transfer_tokens(
            &self.token_program.to_account_info(),
            &self.treasury.to_account_info(),
            &self.user_token_account.to_account_info(),
            &self.token_mint.to_account_info(),
            &self.config.to_account_info(),
            amount,
            self.token_mint.decimals,
            Some(signer_seeds),
        )?;

        Ok(())
    }
}
