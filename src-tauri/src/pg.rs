//! password generator
//! 
//! This module provides functionality to generate secure random passwords with configurable options.

use rand;
use std::error::Error;
use std::fmt;

/// Error types for password generation
#[derive(Debug)]
pub enum PasswordError {
    /// Invalid password length (must be between 6-16 characters)
    InvalidLength,
    /// No character types selected
    NoCharacterTypes,
}

impl fmt::Display for PasswordError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            PasswordError::InvalidLength => write!(f, "Password length must be between 6 and 16 characters"),
            PasswordError::NoCharacterTypes => write!(f, "At least one character type must be selected"),
        }
    }
}

impl Error for PasswordError {}

/// Configuration for password generation
#[derive(Debug, Default)]
pub struct PasswordConfig {
    /// Include numbers (0-9)
    pub include_numbers: bool,
    /// Include uppercase letters (A-Z)
    pub include_uppercase: bool,
    /// Include lowercase letters (a-z)
    pub include_lowercase: bool,
    /// Include special characters (!@#$%^&*()_+-=[]{}|;':,.<>?)
    pub include_special: bool,
}

impl PasswordConfig {
    /// Creates a new config with all character types enabled (default)
    pub fn new() -> Self {
        Self {
            include_numbers: true,
            include_uppercase: true,
            include_lowercase: true,
            include_special: true,
        }
    }
}

/// Generates a random password based on the provided length and configuration
/// 
/// # Parameters
/// - `length`: The length of the password (must be between 6-16)
/// - `config`: The password configuration specifying which character types to include
/// 
/// # Returns
/// - `Ok(String)`: A randomly generated password
/// - `Err(PasswordError)`: If the length is invalid or no character types are selected
pub fn generate_password(length: u8, config: &PasswordConfig) -> Result<String, PasswordError> {
    // Validate password length
    if length < 6 || length > 16 {
        return Err(PasswordError::InvalidLength);
    }

    // Check if at least one character type is selected
    if !config.include_numbers && !config.include_uppercase && !config.include_lowercase && !config.include_special {
        return Err(PasswordError::NoCharacterTypes);
    }

    // Define character sets
    const NUMBERS: &[u8] = b"0123456789";
    const UPPERCASE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const LOWERCASE: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
    const SPECIAL: &[u8] = b"!@#$%^&*()_+-=[]{}|;':,.<>?";

    // Build the character pool based on config
    let mut char_pool: Vec<u8> = Vec::new();
    let mut selected_types: Vec<&[u8]> = Vec::new();

    if config.include_numbers {
        char_pool.extend_from_slice(NUMBERS);
        selected_types.push(NUMBERS);
    }

    if config.include_uppercase {
        char_pool.extend_from_slice(UPPERCASE);
        selected_types.push(UPPERCASE);
    }

    if config.include_lowercase {
        char_pool.extend_from_slice(LOWERCASE);
        selected_types.push(LOWERCASE);
    }

    if config.include_special {
        char_pool.extend_from_slice(SPECIAL);
        selected_types.push(SPECIAL);
    }

    // Generate password
    let mut password = Vec::with_capacity(length as usize);

    // Ensure at least one character from each selected type
    for char_set in &selected_types {
        let idx = (rand::random::<u32>() as usize) % char_set.len();
        password.push(char_set[idx]);
    }

    // Fill the rest of the password with random characters from the pool
    for _ in selected_types.len()..length as usize {
        let idx = (rand::random::<u32>() as usize) % char_pool.len();
        password.push(char_pool[idx]);
    }

    // Shuffle the password to ensure randomness
    for i in 0..password.len() {
        let j = (rand::random::<u32>() as usize) % password.len();
        password.swap(i, j);
    }

    // Convert to string
    String::from_utf8(password).map_err(|_| PasswordError::InvalidLength)
}

/// Generates a password with default configuration (all character types enabled)
/// 
/// # Parameters
/// - `length`: The length of the password (must be between 6-16)
/// 
/// # Returns
/// - `Ok(String)`: A randomly generated password
/// - `Err(PasswordError)`: If the length is invalid
pub fn generate_default_password(length: u8) -> Result<String, PasswordError> {
    let config = PasswordConfig::new();
    generate_password(length, &config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invalid_length() {
        let config = PasswordConfig::new();
        assert!(generate_password(5, &config).is_err());
        assert!(generate_password(17, &config).is_err());
    }

    #[test]
    fn test_no_character_types() {
        let config = PasswordConfig {
            include_numbers: false,
            include_uppercase: false,
            include_lowercase: false,
            include_special: false,
        };
        assert!(generate_password(8, &config).is_err());
    }

    #[test]
    fn test_valid_password() {
        let config = PasswordConfig::new();
        for length in 6..=16 {
            let result = generate_password(length, &config);
            assert!(result.is_ok());
            let password = result.unwrap();
            assert_eq!(password.len(), length as usize);
        }
    }

    #[test]
    fn test_default_password() {
        for length in 6..=16 {
            let result = generate_default_password(length);
            assert!(result.is_ok());
            let password = result.unwrap();
            assert_eq!(password.len(), length as usize);
        }
    }
}
