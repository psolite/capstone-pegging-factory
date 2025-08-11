use crate::{
    error::PegError,
    instructions::{burn_tokens, mint_tokens, transfer_tokens},
    state::{Config, PlatformPeg},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct SwapPlatformPeg<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub platform_mint: InterfaceAccount<'info, Mint>,

    pub config: Account<'info, Config>,

    #[account(
        mut,
        has_one = token_mint,
        has_one = platform_mint,
        seeds = [b"platform", token_mint.key().as_ref(), config.key().as_ref()],
        bump = platform_peg.bump
    )]
    pub platform_peg: Account<'info, PlatformPeg>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = platform_peg,
        associated_token::token_program = token_program
    )]
    pub platform_token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = platform_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_platform_token_account: InterfaceAccount<'info, TokenAccount>,

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

impl<'info> SwapPlatformPeg<'info> {
    pub fn swap(&mut self, amount: u64, is_platform_mint: bool) -> Result<()> {
        require!(self.platform_peg.locked == false, PegError::PoolLocked);
        require!(amount > 0, PegError::InvalidAmount);

        match is_platform_mint {
            true => {
                let _ = self.deposit_tokens(amount);
            }
            false => {
                let _ = self.withdraw_tokens(amount);
            }
        };

        Ok(())
    }

    fn deposit_calulation(&mut self, amount: u64) -> Result<(u64, u64, u64)> {
        let fee_percentage = self.config.fee;

        let fee = (fee_percentage as u64 * amount) / 10000;
        let main_amount = amount - fee;

        let has_supply = self.platform_mint.supply > 0;

        let p_amount = if has_supply {
            (self.platform_token_vault.amount / self.platform_mint.supply) * main_amount
        } else {
            main_amount
        };

        Ok((fee, main_amount, p_amount))
    }

    fn withdraw_calulation(&mut self, amount: u64) -> Result<(u64, u64, u64)> {
        let fee_percentage = self.config.fee;

        let real_amount = (self.platform_mint.supply / self.platform_token_vault.amount) * amount;

        let fee = (fee_percentage as u64 * real_amount) / 10000;
        let main_amount = real_amount - fee;
        let p_amount = amount;

        Ok((fee, main_amount, p_amount))
    }

    fn deposit_tokens(&mut self, amount: u64) -> Result<()> {
        let (fee, main_amount, p_amount) = self.deposit_calulation(amount)?;

        self.add_fee(fee, true)?;

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

        self.mint_platform_tokens(p_amount)?;

        Ok(())
    }

    fn withdraw_tokens(&mut self, amount: u64) -> Result<()> {
        let (fee, main_amount, p_amount) = self.withdraw_calulation(amount)?;
        self.add_fee(fee, false)?;
        self.burn_platform_tokens(p_amount)?;

        let seeds = &[
            b"platform",
            self.token_mint.to_account_info().key.as_ref(),
            self.config.to_account_info().key.as_ref(),
            &[self.platform_peg.bump],
        ];

        let signer_seeds = &[&seeds[..]];

        transfer_tokens(
            &self.token_program.to_account_info(),
            &self.platform_token_vault.to_account_info(),
            &self.user_token_account.to_account_info(),
            &self.token_mint.to_account_info(),
            &self.platform_peg.to_account_info(),
            main_amount,
            self.token_mint.decimals,
            Some(signer_seeds),
        )?;

        Ok(())
    }

    fn mint_platform_tokens(&mut self, amount: u64) -> Result<()> {
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
            self.user_platform_token_account.to_account_info(),
            self.platform_peg.to_account_info(),
            amount,
            Some(signer_seeds),
        )
    }

    fn burn_platform_tokens(&mut self, amount: u64) -> Result<()> {
        burn_tokens(
            &self.token_program.to_account_info(),
            &self.platform_mint.to_account_info(),
            &self.user_platform_token_account.to_account_info(),
            &self.user.to_account_info(),
            amount,
            None,
        )
    }

    fn add_fee(&mut self, fee: u64, is_platform_mint: bool) -> Result<()> {
        let seeds = &[
            b"platform",
            self.token_mint.to_account_info().key.as_ref(),
            self.config.to_account_info().key.as_ref(),
            &[self.platform_peg.bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let (from, authority, seed) = if is_platform_mint {
            (
                &self.user_token_account.to_account_info(),
                &self.user.to_account_info(),
                None,
            )
        } else {
            (
                &self.platform_token_vault.to_account_info(),
                &self.platform_peg.to_account_info(),
                Some(&signer_seeds[..]),
            )
        };

        transfer_tokens(
            &self.token_program.to_account_info(),
            from,
            &self.treasury.to_account_info(),
            &self.token_mint.to_account_info(),
            authority,
            fee,
            self.token_mint.decimals,
            seed,
        )?;

        Ok(())
    }
}
