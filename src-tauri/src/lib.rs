pub mod core;
pub mod pg;

use core::*;
use pg::*;
use tauri::{AppHandle, Manager};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ==================== 暴露给前端的 Commands ====================
#[tauri::command]
fn generate_password_cmd(length: usize, types: Vec<String>) -> Result<String, String> {
    // 把前端传来的字符串数组转为 CharType
    let char_types: Vec<CharType> = types.iter().map(|s| match s.as_str() {
        "digit" => CharType::Digit,
        "upper" => CharType::Upper,
        "lower" => CharType::Lower,
        "special" => CharType::Special,
        _ => CharType::Lower, // 默认
    }).collect();

    pg::generate_password(length, &char_types)
}

#[tauri::command]
async fn save_vault_cmd(
    app: AppHandle,
    master_password: String,
    accounts: Vec<Account>,   // 前端传整个列表
) -> Result<(), String> {
    let vault = Vault { items: accounts };
    let path = get_vault_path(&app);   // 建议用 app data 目录
    save_vault(&path, &vault, &master_password)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_vault_cmd(
    app: AppHandle,
    master_password: String,
) -> Result<Vault, String> {
    let path = get_vault_path(&app);
    load_vault(&path, &master_password)
        .map_err(|e| e.to_string())
}

// ==================== 主密码相关命令 ====================

// 检查是否已经设置过主密码（即 vault 文件是否存在）
#[tauri::command]
fn is_vault_exists(app: AppHandle) -> bool {
    let path = get_vault_path(&app);
    std::path::Path::new(&path).exists()
}

// 创建主密码（第一次设置）
#[tauri::command]
async fn setup_master_password(
    app: AppHandle,
    master_password: String,
    confirm_password: String,
) -> Result<(), String> {
    if master_password != confirm_password {
        return Err("两次输入的主密码不一致".to_string());
    }
    if master_password.len() < 8 {
        return Err("主密码长度至少需要 8 位".to_string());
    }

    let vault = Vault { items: Vec::new() }; // 空保险箱
    let path = get_vault_path(&app);

    save_vault(&path, &vault, &master_password)
        .map_err(|e| format!("设置主密码失败: {}", e))
}

// 解锁保险箱
#[tauri::command]
async fn unlock_vault(
    app: AppHandle,
    master_password: String,
) -> Result<Vault, String> {
    let path = get_vault_path(&app);

    if !std::path::Path::new(&path).exists() {
        return Err("尚未设置主密码，请先创建主密码".to_string());
    }

    load_vault(&path, &master_password)
        .map_err(|e| format!("主密码错误或文件已损坏: {}", e))
}

// 辅助函数：获取安全的存储路径（推荐）
fn get_vault_path(app: &AppHandle) -> String {
    let data_dir = app.path().app_data_dir().expect("无法获取数据目录");
    data_dir.join("vault.dat").to_string_lossy().into_owned()
}


// ==================== 账号管理命令 ====================

// 获取所有账号（解锁后调用）
#[tauri::command]
async fn get_all_accounts(app: AppHandle, master_password: String) -> Result<Vault, String> {
    let path = get_vault_path(&app);
    load_vault(&path, &master_password)
        .map_err(|e| format!("加载失败: {}", e))
}

// 添加新账号
#[tauri::command]
async fn add_account(
    app: AppHandle,
    master_password: String,
    new_account: Account,
) -> Result<Vault, String> {
    let path = get_vault_path(&app);
    let mut vault = load_vault(&path, &master_password)
        .map_err(|e| format!("加载失败: {}", e))?;

    vault.items.push(new_account);

    save_vault(&path, &vault, &master_password)
        .map_err(|e| format!("保存失败: {}", e))?;

    Ok(vault)
}

// 删除账号（通过索引）
#[tauri::command]
async fn delete_account(
    app: AppHandle,
    master_password: String,
    index: usize,
) -> Result<Vault, String> {
    let path = get_vault_path(&app);
    let mut vault = load_vault(&path, &master_password)
        .map_err(|e| format!("加载失败: {}", e))?;

    if index >= vault.items.len() {
        return Err("账号索引无效".to_string());
    }

    vault.items.remove(index);

    save_vault(&path, &vault, &master_password)
        .map_err(|e| format!("保存失败: {}", e))?;

    Ok(vault)
}

// 更新账号
#[tauri::command]
async fn update_account(
    app: AppHandle,
    master_password: String,
    index: usize,
    updated_account: Account,
) -> Result<Vault, String> {
    let path = get_vault_path(&app);
    let mut vault = load_vault(&path, &master_password)
        .map_err(|e| format!("加载失败: {}", e))?;

    if index >= vault.items.len() {
        return Err("账号索引无效".to_string());
    }

    vault.items[index] = updated_account;

    save_vault(&path, &vault, &master_password)
        .map_err(|e| format!("保存失败: {}", e))?;

    Ok(vault)
}

// 搜索账号（支持按类型、账号名、或两者组合）
#[tauri::command]
async fn search_accounts(
    app: AppHandle,
    master_password: String,
    account_type: Option<String>,
    username: Option<String>,
) -> Result<Vec<Account>, String> {
    let path = get_vault_path(&app);
    let vault = load_vault(&path, &master_password)
        .map_err(|e| format!("加载失败: {}", e))?;

    let mut result = vault.items;

    if let Some(t) = account_type {
        if !t.is_empty() {
            result = result
                .into_iter()
                .filter(|acc| acc.account_type.to_lowercase().contains(&t.to_lowercase()))
                .collect();
        }
    }

    if let Some(u) = username {
        if !u.is_empty() {
            result = result
                .into_iter()
                .filter(|acc| acc.username.to_lowercase().contains(&u.to_lowercase()))
                .collect();
        }
    }

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_password_cmd,
            save_vault_cmd,
            load_vault_cmd,
            is_vault_exists,
            setup_master_password,
            unlock_vault,
            get_all_accounts,
            add_account,
            delete_account,
            update_account,
            search_accounts,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
