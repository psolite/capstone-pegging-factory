#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

mod error;
mod instructions;
mod state;

use instructions::*;

declare_id!("dyFJPHPcRjotpHgwohSRi2uWgWSLfvfNDL2zzN6yndo");

#[program]
pub mod capstone_pegging_factory {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee: u16) -> Result<()> {
        ctx.accounts.init(fee, ctx.bumps)?;
        Ok(())
    }

    pub fn platform_peg(ctx: Context<PlatformPegging>) -> Result<()> {
        ctx.accounts.init_platform_peg(ctx.bumps)?;
        Ok(())
    }

    pub fn project_peg(
        ctx: Context<ProjectPegging>,
        ratio_numerator: u64,
        ratio_denominator: u64,
    ) -> Result<()> {
        ctx.accounts
            .init_project_peg(ratio_numerator, ratio_denominator, ctx.bumps)?;
        Ok(())
    }

    pub fn swap_platform_peg(
        ctx: Context<SwapPlatformPeg>,
        amount: u64,
        is_platform_mint: bool,
    ) -> Result<()> {
        ctx.accounts.swap(amount, is_platform_mint)
    }

    pub fn swap_project_peg(
        ctx: Context<SwapProjectPeg>,
        amount: u64,
        is_project_mint: bool,
    ) -> Result<()> {
        ctx.accounts.swap(amount, is_project_mint)
    }

    pub fn deposit_yield(
        ctx: Context<DepositYield>,
        amount: u64
    ) -> Result<()> {
        ctx.accounts.deposit_yield(amount)
    }

    pub fn claim_fees(
        ctx: Context<Claim>
    ) -> Result<()> {
        ctx.accounts.claim_fees()
    }
}
