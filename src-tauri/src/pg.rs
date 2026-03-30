//! password generator
//! 
//! This module provides functionality to generate secure random passwords with configurable options.
use rand::seq::{IndexedRandom, SliceRandom};
use rand::rng;


/// 密码字符类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CharType {
    Digit,      // 0-9
    Upper,      // A-Z
    Lower,      // a-z
    Special,    // 特殊字符
}

/// 生成随机密码
///
/// # 参数
/// - `length`: 密码长度，必须在 6..=16 之间
/// - `types`: 需要包含的字符类型集合（至少一种）
///
/// # 返回
/// - `Ok(String)`: 生成的密码
/// - `Err(String)`: 错误信息（中文提示）
pub fn generate_password(length: usize, types: &[CharType]) -> Result<String, String> {
    // 1. 长度范围检查
    if length < 6 || length > 16 {
        return Err("密码长度必须在 6-16 位之间（包含 6 和 16）".to_string());
    }

    // 2. 类型检查：至少选择一种字符类型
    if types.is_empty() {
        return Err("必须至少选择一种字符类型！".to_string());
    }

    // 3. 检查长度是否足够容纳所有选中的类型
    if length < types.len() {
        return Err(format!(
            "密码长度至少需要 {} 位才能保证每种选中类型都至少出现一次", 
            types.len()
        ));
    }

    // 定义各字符池
    const DIGITS: &[u8] = b"0123456789";
    const UPPER: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const LOWER: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
    const SPECIAL: &[u8] = b"!@#$%^&*()_+-=[]{}|;':\",./<>?";

    // 根据用户选择的类型，收集对应的字符池
    let mut pools: Vec<&[u8]> = Vec::new();
    for &t in types {
        match t {
            CharType::Digit => pools.push(DIGITS),
            CharType::Upper => pools.push(UPPER),
            CharType::Lower => pools.push(LOWER),
            CharType::Special => pools.push(SPECIAL),
        }
    }

    let mut rng = rng();                     
    let mut password: Vec<u8> = Vec::with_capacity(length);

    // 4. 强制每种选中的类型至少出现一个字符
    for &pool in &pools {
        if let Some(&ch) = pool.choose(&mut rng) {
            password.push(ch);
        }
    }

    // 5. 构建所有可选字符的并集（用于填充剩余位置）
    let all_chars: Vec<u8> = pools.iter()
        .flat_map(|&pool| pool.iter().cloned())
        .collect();

    // 6. 填充剩余的字符
    for _ in pools.len()..length {
        if let Some(&ch) = all_chars.choose(&mut rng) {
            password.push(ch);
        }
    }

    // 7. 打乱顺序，保证密码字符分布完全随机
    password.shuffle(&mut rng);

    // 8. 转为 String
    String::from_utf8(password)
        .map_err(|_| "密码生成失败：UTF-8 转换错误".to_string())
}