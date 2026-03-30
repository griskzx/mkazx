use aes_gcm::{AeadCore, Aes256Gcm, KeyInit, aead::{Aead, OsRng}};
use argon2::{Argon2, PasswordHasher, password_hash::SaltString,Params};
use serde::{Deserialize, Serialize};

///定义账号结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct Account {
    pub account_type:String,
    pub username: String,
    pub password: String,
    pub remark: String,
}

///保险箱结构体存储所有账号
#[derive(Debug, Serialize, Deserialize)]
pub struct Vault{
    pub items:Vec<Account>,
}

#[derive(Serialize, Deserialize)]
///加密后的保险箱结构体
pub struct EncryptedVault{
    ///盐
    salt:String,
    ///随机数
    ///用于加密时的随机数，确保每次加密结果不同
    ///同时，解密时也需要使用相同的随机数
    ///否则会解密失败
    nonce:Vec<u8>,
    ///加密后的数据
    ciphertext:Vec<u8>,
}

///密钥派生
pub fn derive_key(password:&str,salt:&SaltString)->[u8;32]{
    // 推荐配置（可根据你的平台调整，目标 ~200-500ms）
    let params = Params::new(
        47_104,      // m=46 MiB（推荐起点）
        2,           // t=2 iterations
        1,           // p=1 parallelism（桌面端可设 2-4）
        Some(32),    // 输出 32 字节
    ).expect("Invalid Argon2 params");
    // let argon2=Argon2::default();
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let hash=argon2.hash_password(password.as_bytes(),salt).expect("core::derive_key: hash_password failed");
    let mut key=[0u8;32];
    key.copy_from_slice(&hash.hash.unwrap().as_bytes()[0..32]);
    key
}

///用postcard序列化
pub fn save_vault(path:&str,vault:&Vault,master_password:&str)->Result<(),Box<dyn std::error::Error>>{
    //序列化
    let plain_bytes = postcard::to_allocvec(vault)?;
    
    let salt = SaltString::generate(&mut OsRng);
    let salt_str=salt.to_string();
    let key=derive_key(master_password,&salt);
    let cipher=Aes256Gcm::new(&key.into());
    let nonce=Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext=cipher.encrypt(&nonce, plain_bytes.as_ref())
                                  .map_err(|e| e.to_string())?;

    let encrypted=EncryptedVault{
        salt:salt_str,
        nonce:nonce.to_vec(),
        ciphertext,
    };
    let file_bytes=postcard::to_allocvec(&encrypted)?;
    if let Some(parent) = std::path::Path::new(path).parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, file_bytes)?;
    Ok(())
}
    
/// postcard 反序列化
pub fn load_vault(
    path: &str,
    master_password: &str
) -> Result<Vault, Box<dyn std::error::Error>> {
    let file_bytes = std::fs::read(path)?;
    // 反序列化：bincode → postcard
    let encrypted: EncryptedVault = postcard::from_bytes(&file_bytes)?;
    if encrypted.nonce.len() != 12 {
        return Err("Invalid nonce length".into());
    }
    let salt = SaltString::from_b64(&encrypted.salt).unwrap();
    let key = derive_key(master_password, &salt);
    let cipher = Aes256Gcm::new(&key.into());
    let nonce = aes_gcm::Nonce::from_slice(&encrypted.nonce);
    
    let plain_bytes = cipher.decrypt(nonce, encrypted.ciphertext.as_ref())
                                     .map_err(|e| e.to_string())?;

    // 反序列化 Vault：bincode → postcard
    let vault: Vault = postcard::from_bytes(&plain_bytes)?;
    Ok(vault)
}