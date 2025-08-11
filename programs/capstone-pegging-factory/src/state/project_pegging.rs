use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProjectPeg {
    pub owner: Pubkey,
    pub platform_mint: Pubkey,
    pub project_mint: Pubkey,
    pub ratio_numerator: u64,
    pub ratio_denominator: u64,
    pub project_token_vault: Pubkey,
    pub project_mint_bump: u8,
    pub bump: u8
}