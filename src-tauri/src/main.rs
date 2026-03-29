// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use mkazx_lib::core::*;
fn main()-> Result<(), Box<dyn std::error::Error>> {
    let vault_path = "mkazx/data/vault.dat";
    let master_password = "my_master_password_123";
    let mut vault = Vault { items: Vec::new() };
    vault.items.push(Account {
        account_type: "QQ".into(),
        username: "12345678".into(),
        password: "qq_password_abc".into(),
        remark: "常用大号".into(),
    });
    vault.items.push(Account {
        account_type: "GitHub".into(),
        username: "eirian".into(),
        password: "github_xyz".into(),
        remark: "".into(),
    });
    save_vault(vault_path, &vault, master_password)?;
     println!("已加密保存到 vault.dat");

    // 2. 加载并解密
    let loaded_vault = load_vault(vault_path, master_password)?;
    println!("\n解密成功，读取到 {} 条账号", loaded_vault.items.len());
    for (i, item) in loaded_vault.items.iter().enumerate() {
        println!("\n【第 {} 条】", i + 1);
        println!("类型: {}", item.account_type);
        println!("账号: {}", item.username);
        println!("密码: {}", item.password);
        println!("说明: {}", item.remark);
    }

    mkazx_lib::run();
    Ok(())
}
