/// Rent-exempt transfer utilities
///
/// SECURITY CRITICAL: Finding #2 from security audit (Week 2)
///
/// Problem: Transfers without rent checks can close accounts below rent-exempt
/// threshold, leading to permanent fund loss when accounts are automatically
/// garbage collected by Solana runtime.
///
/// Solution: Always check that sender maintains rent exemption after transfer.

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::error::ErrorCode;

/// Safely transfer SOL while maintaining rent exemption for sender
///
/// This function prevents account closure by ensuring the sender's balance
/// after transfer remains above the rent-exempt minimum threshold.
///
/// # Security Guarantees
///
/// * Sender will have sufficient balance for rent exemption after transfer
/// * Transfer is atomic (fails completely if rent check fails)
/// * Uses checked arithmetic to prevent overflow/underflow
/// * Validates all inputs before state changes
///
/// # Arguments
///
/// * `from` - Source account (must be mutable)
/// * `to` - Destination account
/// * `amount` - Amount to transfer in lamports
/// * `system_program` - System program for CPI transfer
///
/// # Errors
///
/// * `ErrorCode::InsufficientFunds` - from.lamports < amount
/// * `ErrorCode::WouldBreakRentExemption` - Transfer would leave `from` below rent-exempt threshold
///
/// # Example
///
/// ```rust
/// transfer_with_rent_check(
///     &ctx.accounts.user.to_account_info(),
///     &ctx.accounts.market.to_account_info(),
///     cost,
///     &ctx.accounts.system_program.to_account_info(),
/// )?;
/// ```
pub fn transfer_with_rent_check<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    system_program: &AccountInfo<'info>,
) -> Result<()> {
    // Get current rent exemption requirement for sender's account size
    let rent = Rent::get()?;
    let rent_exempt_minimum = rent.minimum_balance(from.data_len());

    // Calculate sender's balance after transfer (checked arithmetic)
    let from_balance_after = from
        .lamports()
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientFunds)?;

    // SECURITY CHECK: Ensure sender maintains rent exemption
    // This prevents account closure and permanent fund loss
    require!(
        from_balance_after >= rent_exempt_minimum,
        ErrorCode::WouldBreakRentExemption
    );

    // Perform the transfer via CPI (atomic operation)
    system_program::transfer(
        CpiContext::new(
            system_program.to_account_info(),
            system_program::Transfer {
                from: from.to_account_info(),
                to: to.to_account_info(),
            },
        ),
        amount,
    )
}

/// Check if an account has sufficient balance for rent exemption
///
/// Used for validation before operations that might reduce account balance.
///
/// # Arguments
///
/// * `account` - Account to check
///
/// # Returns
///
/// * `true` if account is rent-exempt
/// * `false` if account is below rent-exempt threshold
pub fn is_rent_exempt(account: &AccountInfo) -> Result<bool> {
    let rent = Rent::get()?;
    let rent_exempt_minimum = rent.minimum_balance(account.data_len());
    Ok(account.lamports() >= rent_exempt_minimum)
}

/// Get the minimum rent-exempt balance for an account
///
/// Useful for calculating maximum transfer amounts while maintaining rent exemption.
///
/// # Arguments
///
/// * `account` - Account to check
///
/// # Returns
///
/// Minimum lamports required for rent exemption
pub fn get_rent_exempt_minimum(account: &AccountInfo) -> Result<u64> {
    let rent = Rent::get()?;
    Ok(rent.minimum_balance(account.data_len()))
}

/// Calculate maximum transferable amount while maintaining rent exemption
///
/// Returns the maximum amount that can be safely transferred from an account
/// without breaking rent exemption.
///
/// # Arguments
///
/// * `from` - Source account
///
/// # Returns
///
/// Maximum transferable amount in lamports (may be 0 if already at or below rent-exempt minimum)
pub fn max_transferable_amount(from: &AccountInfo) -> Result<u64> {
    let rent = Rent::get()?;
    let rent_exempt_minimum = rent.minimum_balance(from.data_len());
    let current_balance = from.lamports();

    // If already below rent-exempt minimum, cannot transfer anything
    if current_balance <= rent_exempt_minimum {
        return Ok(0);
    }

    // Maximum is current balance minus rent-exempt minimum
    Ok(current_balance.saturating_sub(rent_exempt_minimum))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: Full integration tests for rent utilities are in tests/rent_checks.rs
    // These are unit tests for helper functions only

    #[test]
    fn test_max_transferable_calculation() {
        // Mock test - actual tests require Solana runtime
        // See integration tests for complete coverage
    }
}
