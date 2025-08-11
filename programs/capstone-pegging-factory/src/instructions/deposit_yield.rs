use crate::{
    error::PegError,
    instructions::{mint_tokens, transfer_tokens},
    state::{Config, PlatformPeg, ProjectPeg},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct DepositYield<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        mint::authority = platform_peg,
    )]
    pub platform_mint: InterfaceAccount<'info, Mint>,

    pub config: Account<'info, Config>,

    #[account(mut)]
    pub platform_token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        has_one = platform_mint,
        seeds = [b"project", project_peg.owner.key().as_ref(), platform_mint.key().as_ref()],
        bump = project_peg.bump
    )]
    pub project_peg: Account<'info, ProjectPeg>,

    pub platform_peg: Account<'info, PlatformPeg>,

    #[account(mut)]
    pub project_token_vault: InterfaceAccount<'info, TokenAccount>,

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

impl<'info> DepositYield<'info> {
    pub fn deposit_yield(&mut self, amount: u64) -> Result<()> {
        require!(self.platform_peg.locked == false, PegError::PoolLocked);
        require!(amount > 0, PegError::InvalidAmount);

        let (fee, main_amount, p_amount) = self.deposit_calulation(amount)?;

        self.add_fee(fee)?;
        transfer_tokens(
            &self.token_program.to_account_info(),
            &self.user_token_account.to_account_info(),
            &self.platform_token_vault.to_account_info(),
            &self.token_mint.to_account_info(),
            &self.user.to_account_info(),
            main_amount,
            self.token_mint.decimals,
            None,
        )?;

        let seeds = &[
            b"platform",
            self.token_mint.to_account_info().key.as_ref(),
            self.config.to_account_info().key.as_ref(),
            &[self.platform_peg.bump],
        ];

        let signer_seeds = &[&seeds[..]];

        mint_tokens(
            self.token_program.to_account_info(),
            self.platform_mint.to_account_info(),
            self.project_token_vault.to_account_info(),
            self.platform_peg.to_account_info(),
            p_amount,
            Some(signer_seeds),
        )?;

        Ok(())
    }

    fn deposit_calulation(&mut self, amount: u64) -> Result<(u64, u64, u64)> {
        require!(self.platform_mint.supply > 0, PegError::InvalidAmount);
        let fee_percentage = self.config.fee;

        let fee = (fee_percentage as u64 * amount) / 10000;
        let main_amount = amount - fee;

        let p_amount = (self.platform_token_vault.amount / self.platform_mint.supply) * main_amount;

        Ok((fee, main_amount, p_amount))
    }

    fn add_fee(&mut self, fee: u64) -> Result<()> {
        transfer_tokens(
            &self.token_program.to_account_info(),
            &self.user_token_account.to_account_info(),
            &self.treasury.to_account_info(),
            &self.token_mint.to_account_info(),
            &self.user.to_account_info(),
            fee,
            self.token_mint.decimals,
            None,
        )?;

        Ok(())
    }
}
