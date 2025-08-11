use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlatformPeg {
    pub platform_mint: Pubkey,
    pub token_mint: Pubkey,
    pub locked: bool,
    pub platform_token_vault: Pubkey,
    pub treasury: Pubkey,
    pub platform_mint_bump: u8,
    pub bump: u8
}