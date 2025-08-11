use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    burn, mint_to, transfer_checked, Burn, MintTo, TransferChecked,
};

pub fn mint_tokens<'info>(
    token_program: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
    seeds: Option<&[&[&[u8]]]>, // Optional PDA seeds for signing
) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: mint.clone(),
        to: to.clone(),
        authority: authority.clone(),
    };

    let cpi_ctx = match seeds {
        Some(s) => CpiContext::new_with_signer(token_program.clone(), cpi_accounts, s),
        None => CpiContext::new(token_program.clone(), cpi_accounts),
    };

    mint_to(cpi_ctx, amount)
}

pub fn burn_tokens<'info>(
    token_program: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    amount: u64,
    seeds: Option<&[&[&[u8]]]>, // Optional PDA seeds for signing
) -> Result<()> {
    let cpi_accounts = Burn {
        mint: mint.clone(),
        from: from.clone(),
        authority: authority.clone(),
    };

    let cpi_ctx = match seeds {
        Some(s) => CpiContext::new_with_signer(token_program.clone(), cpi_accounts, s),
        None => CpiContext::new(token_program.clone(), cpi_accounts),
    };

    burn(cpi_ctx, amount)
}

pub fn transfer_tokens<'info>(
    token_program: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    seeds: Option<&[&[&[u8]]]>, // Optional PDA seeds for signing
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from: from.clone(),
        to: to.clone(),
        mint: mint.clone(),
        authority: authority.clone(),
    };

    let cpi_ctx = match seeds {
        Some(s) => CpiContext::new_with_signer(token_program.clone(), cpi_accounts, s),
        None => CpiContext::new(token_program.clone(), cpi_accounts),
    };

    transfer_checked(cpi_ctx, amount, decimals)
}