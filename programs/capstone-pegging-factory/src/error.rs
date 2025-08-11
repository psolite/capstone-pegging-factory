use anchor_lang::error_code;


#[error_code]
pub enum PegError {
    #[msg("fees can not be zero")]
    FeeIsZero,
    #[msg("fees can not be greater than 10000")]
    FeeOverFlow,
    #[msg("Invalid Ammount")]
    InvalidAmount,
    #[msg("The Pool is locked")]
    PoolLocked,
    #[msg("Numerical Overflow")]
    NumericalOverflow,
    #[msg("Unauthorized access")]
    UnAuthorized,
}