use crate::{
    error::PegError,
    instructions::{burn_tokens, mint_tokens, transfer_tokens},
    state::{Config, PlatformPeg, ProjectPeg},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct SwapProjectPeg<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub platform_mint: InterfaceAccount<'info, Mint>,

    pub config: Account<'info, Config>,

    #[account(mut)]
    pub project_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        has_one = platform_mint,
        seeds = [b"project", project_peg.owner.key().as_ref(), platform_mint.key().as_ref()],
        bump = project_peg.bump
    )]
    pub project_peg: Account<'info, ProjectPeg>,

    #[account(
        mut,
        has_one = token_mint,
        seeds = [b"platform", token_mint.key().as_ref(), config.key().as_ref()],
        bump = platform_peg.bump
    )]
    pub platform_peg: Account<'info, PlatformPeg>,

    #[account(mut)]
    pub platform_token_vault: InterfaceAccount<'info, TokenAccount>,

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
        associated_token::mint = project_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_project_token_account: InterfaceAccount<'info, TokenAccount>,

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

impl<'info> SwapProjectPeg<'info> {
    pub fn swap(&mut self, amount: u64, is_project_mint: bool) -> Result<()> {
        require!(self.platform_peg.locked == false, PegError::PoolLocked);
        require!(amount > 0, PegError::InvalidAmount);

        if is_project_mint {
            self.is_project_mint_true(amount)?;
        } else {
            self.is_project_mint_false(amount)?;
        }

        Ok(())
    }

    fn deposit_calulation(&mut self, amount: u64) -> Result<(u64, u64, u64, u64)> {
        let fee_percentage = self.config.fee;

        let fee = (fee_percentage as u64 * amount) / 10000;
        let main_amount = amount - fee;

        let has_platform_supply = self.platform_mint.supply > 0;

        let p_amount = if has_platform_supply {
            (self.platform_token_vault.amount / self.platform_mint.supply) * main_amount
        } else {
            main_amount
        };

        let has_project_supply = self.project_mint.supply > 0;

        let project_amount = if has_project_supply {
            (self.project_mint.supply / self.project_token_vault.amount) * p_amount
        } else {
            (self.project_peg.ratio_numerator * p_amount) / self.project_peg.ratio_denominator
        };

        Ok((fee, main_amount, p_amount, project_amount))
    }

    fn withdraw_calulation(&mut self, amount: u64) -> Result<(u64, u64, u64, u64)> {
        let fee_percentage = self.config.fee;

        let p_amount = ((amount as u128 * self.project_token_vault.amount as u128)
            / self.project_mint.supply as u128) as u64;

        let real_amount = (self.platform_mint.supply / self.platform_token_vault.amount) * p_amount;

        let fee = (fee_percentage as u64 * real_amount) / 10000;
        let main_amount = real_amount - fee;

        let project_amount = amount;

        Ok((fee, main_amount, p_amount, project_amount))
    }

    fn is_project_mint_true(&mut self, amount: u64) -> Result<()> {
         let (fee, main_amount, p_amount, project_amount) = self.deposit_calulation(amount)?;
        self.deposit_tokens(main_amount, p_amount, fee)?;
        self.mint_project_tokens(project_amount)?;
        Ok(())
    }

    pub fn is_project_mint_false(&mut self, amount: u64) -> Result<()> {
        let (fee, main_amount, p_amount, project_amount) = self.withdraw_calulation(amount)?;
        self.burn_project_tokens(project_amount)?;
        self.withdraw_tokens(main_amount, p_amount, fee)?;
        Ok(())
    }

    fn mint_project_tokens(&mut self, amount: u64) -> Result<()> {
        let seeds = &[
            b"project",
            self.project_peg.owner.as_ref(),
            self.platform_mint.to_account_info().key.as_ref(),
            &[self.project_peg.bump], // checking project_peg
        ];

        let signer_seeds = &[&seeds[..]];

        mint_tokens(
            self.token_program.to_account_info(),
            self.project_mint.to_account_info(),
            self.user_project_token_account.to_account_info(),
            self.project_peg.to_account_info(),
            amount,
            Some(signer_seeds),
        )
    }

    fn burn_project_tokens(&mut self, amount: u64) -> Result<()> {
        burn_tokens(
            &self.token_program.to_account_info(),
            &self.project_mint.to_account_info(),
            &self.user_project_token_account.to_account_info(),
            &self.user.to_account_info(),
            amount,
            None,
        )
    }

    fn add_fee(&mut self, fee: u64, is_project_mint: bool) -> Result<()> {
        let seeds = &[
            b"platform",
            self.token_mint.to_account_info().key.as_ref(),
            self.config.to_account_info().key.as_ref(),
            &[self.platform_peg.bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let (from, authority, seed) = if is_project_mint {
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

// Platform Swap

impl<'info> SwapProjectPeg<'info> {

    fn deposit_tokens(&mut self, amount: u64, p_amount: u64, fee: u64) -> Result<()> {
        self.add_fee(fee, true)?;
        transfer_tokens(
            &self.token_program.to_account_info(),
            &self.user_token_account.to_account_info(),
            &self.platform_token_vault.to_account_info(),
            &self.token_mint.to_account_info(),
            &self.user.to_account_info(),
            amount,
            self.token_mint.decimals,
            None,
        )?;
        self.mint_platform_tokens(p_amount)?;

        Ok(())
    }

    fn withdraw_tokens(&mut self, amount: u64, p_amount: u64, fee: u64) -> Result<()> {
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
            amount,
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
            self.project_token_vault.to_account_info(),
            self.platform_peg.to_account_info(),
            amount,
            Some(signer_seeds),
        )
    }

    fn burn_platform_tokens(&mut self, amount: u64) -> Result<()> {
        let seeds = &[
            b"project",
            self.project_peg.owner.as_ref(),
            self.platform_mint.to_account_info().key.as_ref(),
            &[self.project_peg.bump],
        ];

        let signer_seeds = &[&seeds[..]];
        burn_tokens(
            &self.token_program.to_account_info(),
            &self.platform_mint.to_account_info(),
            &self.project_token_vault.to_account_info(),
            &self.project_peg.to_account_info(),
            amount,
            Some(signer_seeds),
        )
    }
}
