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

    generate_password(length, &char_types)
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

// 辅助函数：获取安全的存储路径（推荐）
fn get_vault_path(app: &AppHandle) -> String {
    let data_dir = app.path().app_data_dir().expect("无法获取数据目录");
    data_dir.join("vault.dat").to_string_lossy().into_owned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_password_cmd,
            save_vault_cmd,
            load_vault_cmd])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
