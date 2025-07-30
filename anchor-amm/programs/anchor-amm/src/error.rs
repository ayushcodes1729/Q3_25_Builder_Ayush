use anchor_lang::error_code;
use constant_product_curve::CurveError;

#[error_code]
pub enum AmmError {
    #[msg("Invalid amount provided")]
    InvalidAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Pool is locked")]
    PoolLocked,
    #[msg("Fee exceeds maximum allowed")]
    InvalidFee,
}

impl From<CurveError> for AmmError {
    fn from(error: CurveError) -> AmmError {
        match error {
            CurveError::SlippageLimitExceeded => AmmError::SlippageExceeded,
            CurveError::InsufficientBalance => AmmError::InsufficientLiquidity,
            _ => AmmError::InvalidAmount,
        }
    }
}