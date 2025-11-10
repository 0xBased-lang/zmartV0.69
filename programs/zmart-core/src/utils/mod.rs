/// Utility functions for secure operations
///
/// This module contains helper functions for common security-critical operations
/// like rent-exempt transfers, accurate fee calculations, and account validation.

use anchor_lang::prelude::*;
use crate::error::ErrorCode;

pub mod rent;
pub mod fees;

pub use rent::*;
pub use fees::*;
