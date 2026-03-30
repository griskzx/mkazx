import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Lock, Unlock, ShieldCheck, Search, Plus, Key, Globe, Server, Dices } from 'lucide-react';
import type { Account } from './types';

import { Dialog } from './components/Dialog';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { AccountCard } from './components/AccountCard';
import { AccountModal } from './components/AccountModal';

function App() {
  const [step, setStep] = useState<'setup' | 'unlock' | 'main'>('unlock');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 账号相关
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'web' | 'server'>('all');
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Account>({ accountType: '', username: '', password: '', remark: '' });

  // 密码生成器状态
  const [showGenModal, setShowGenModal] = useState(false);
  const [genLength, setGenLength] = useState(12);
  const [genTypes, setGenTypes] = useState({ lower: true, upper: true, digit: true, special: true });
  const [generatedPwd, setGeneratedPwd] = useState("");

  // 全局对话框状态
  const [dialog, setDialog] = useState<{show: boolean, type: 'alert' | 'confirm', message: string, onConfirm?: () => void}>({show: false, type: 'alert', message: ''});
  const showAlert = (message: string) => setDialog({ show: true, type: 'alert', message });
  const showConfirm = (message: string, onConfirm: () => void) => setDialog({ show: true, type: 'confirm', message, onConfirm });

  // 初始化检查
  useEffect(() => {
    invoke<boolean>('is_vault_exists').then((exists) => {
      setStep(exists ? 'unlock' : 'setup');
    }).catch(console.error);
  }, []);

  // 本地请求所有数据
  const fetchAccounts = async () => {
    if (!masterPassword) return;
    setLoading(true);
    setError('');
    try {
      const vault = await invoke<{ items: Account[] }>('get_all_accounts', { masterPassword });
      setAccounts(vault.items);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'main') fetchAccounts();
  }, [step]); 

  // 本地计算属性：根据分类与搜索实时过滤卡片
  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (activeCategory === 'web') {
      list = list.filter(a => {
        const t = a.accountType.toLowerCase();
        return t.includes('web') || t.includes('http') || t.includes('网站');
      });
    } else if (activeCategory === 'server') {
      list = list.filter(a => {
        const t = a.accountType.toLowerCase();
        return t.includes('server') || t.includes('ssh') || t.includes('服务器') || t.includes('云');
      });
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => 
        a.accountType.toLowerCase().includes(q) || 
        a.username.toLowerCase().includes(q)
      );
    }
    return list;
  }, [accounts, activeCategory, searchQuery]);

  // Auth 操作
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword !== confirmPassword) return setError('两次输入的密码不一致');
    if (masterPassword.length < 8) return setError('主密码至少需要 8 位');

    try {
      await invoke('setup_master_password', { masterPassword, confirmPassword });
      setError('');
      setStep('main');
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invoke('unlock_vault', { masterPassword });
      setError('');
      setStep('main');
    } catch (e: any) {
      setError(e.toString());
    }
  };

  // CRUD
  const handleSaveAccount = async () => {
    if (!form.accountType || !form.username || !form.password) {
      return showAlert("类型、账号和密码为必填项！");
    }
    try {
      if (editingIndex !== null) {
        await invoke('update_account', { masterPassword, index: editingIndex, updatedAccount: form });
      } else {
        await invoke('add_account', { masterPassword, newAccount: form });
      }
      setShowModal(false);
      resetForm();
      fetchAccounts(); 
    } catch (e: any) {
      showAlert('保存失败: ' + e);
    }
  };

  const handleDelete = (index: number) => {
    const realAcc = filteredAccounts[index];
    const realIndex = accounts.findIndex(a => a === realAcc);
    
    if (realIndex === -1) return;
    showConfirm('确定要彻底删除这条凭证吗？此操作非常危险且不可逆。', async () => {
      try {
        await invoke('delete_account', { masterPassword, index: realIndex });
        fetchAccounts();
      } catch (e: any) {
        showAlert('删除失败: ' + e);
      }
    });
  };

  const resetForm = () => {
    setForm({ accountType: '', username: '', password: '', remark: '' });
    setEditingIndex(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("已复制到剪贴板！");
      setTimeout(() => setSuccess(""), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // =====================
  // 渲染 Auth 界面
  // =====================
  if (step === 'setup' || step === 'unlock') {
    return (
      <div className="auth-container">
        <Dialog dialog={dialog} setDialog={setDialog} />
        <PasswordGeneratorModal 
           show={showGenModal} onClose={() => setShowGenModal(false)}
           genLength={genLength} setGenLength={setGenLength}
           genTypes={genTypes} setGenTypes={setGenTypes}
           generatedPwd={generatedPwd} setGeneratedPwd={setGeneratedPwd}
           copyToClipboard={copyToClipboard} showAlert={showAlert}
        />
        {success && <div style={{ position: 'absolute', top: 30, background: 'var(--success)', color: '#fff', padding: '10px 20px', borderRadius: '8px' }}>{success}</div>}
        
        <button 
           className="secondary" 
           style={{ position: 'absolute', top: 30, right: 30, background: 'var(--bg-card)' }}
           onClick={() => { setGeneratedPwd(""); setShowGenModal(true); }}
        >
          <Dices size={16} /> 随机密码生成器
        </button>

        <div className="auth-bg-glow" />
        <div className="auth-card glass-panel">
          <div className="auth-icon">
            {step === 'setup' ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <h1 className="auth-title">
            {step === 'setup' ? '初始化保险箱' : '解锁 mkazx'}
          </h1>
          <p className="auth-subtitle">
            {step === 'setup' ? '设置强主密码以加密您的所有凭证数据' : '请输入您的主密码 (或者尝试点右上角生成密码)'}
          </p>
          
          <form onSubmit={step === 'setup' ? handleSetup : handleUnlock} className="flex-col">
            <input
              type="password"
              placeholder="主密码"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              autoFocus
            />
            {step === 'setup' && (
              <input
                type="password"
                placeholder="确认主密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
            <button type="submit" style={{ width: '100%', marginTop: '8px' }}>
              {step === 'setup' ? '初始化并加密' : '解密本地保险箱'}
              {step === 'unlock' && <Unlock size={16} />}
            </button>
            {error && <div className="text-danger">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  // =====================
  // 渲染 Dashboard 界面
  // =====================
  return (
    <div className="dashboard-layout">
      <Dialog dialog={dialog} setDialog={setDialog} />
      <PasswordGeneratorModal 
         show={showGenModal} onClose={() => setShowGenModal(false)}
         genLength={genLength} setGenLength={setGenLength}
         genTypes={genTypes} setGenTypes={setGenTypes}
         generatedPwd={generatedPwd} setGeneratedPwd={setGeneratedPwd}
         copyToClipboard={copyToClipboard} showAlert={showAlert}
      />
      <AccountModal 
         show={showModal} onClose={() => setShowModal(false)}
         form={form} setForm={setForm} isEditing={editingIndex !== null}
         onSave={handleSaveAccount} showAlert={showAlert}
         genTypes={genTypes} setGenTypes={setGenTypes}
      />

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <ShieldCheck size={24} color="var(--accent)" />
          <span>mkazx Vault</span>
        </div>
        <div className="sidebar-content">
          <div className={`nav-item ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>
            <Key size={18} /> <span className="responsive-text">全部凭证</span>
          </div>
          <div className={`nav-item ${activeCategory === 'web' ? 'active' : ''}`} onClick={() => setActiveCategory('web')}>
            <Globe size={18} /> <span className="responsive-text">网站登录</span>
          </div>
          <div className={`nav-item ${activeCategory === 'server' ? 'active' : ''}`} onClick={() => setActiveCategory('server')}>
            <Server size={18} /> <span className="responsive-text">服务器/SSH</span>
          </div>
        </div>
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="secondary" style={{ width: '100%' }} onClick={() => { setGeneratedPwd(""); setShowGenModal(true); }}>
             <Dices size={18} /> <span className="responsive-text">生成密码</span>
          </button>
          <button className="secondary" style={{ width: '100%', borderColor: 'transparent', color: 'var(--text-secondary)' }} onClick={() => setStep('unlock')}>
             <Lock size={18} /> <span className="responsive-text">锁定并退出</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="search-bar">
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="搜索账号或类型（实时匹配）..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-actions">
            {success && <span className="text-success" style={{ margin: 0 }}>{success}</span>}
            <button onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={18} /> <span className="responsive-text">添加凭证</span>
            </button>
          </div>
        </div>

        <div className="accounts-grid">
          {filteredAccounts.length === 0 && !loading && (
            <div className="empty-state">
              <Search />
              <p>没有找到任何符合的记录，请尝试更改搜索词或分类。</p>
            </div>
          )}

          {filteredAccounts.map((acc, renderIdx) => {
            const globalIdx = accounts.findIndex(a => a === acc);
            return (
              <AccountCard 
                 key={globalIdx} 
                 acc={acc} 
                 onEdit={() => {
                   setForm(acc);
                   setEditingIndex(globalIdx);
                   setShowModal(true);
                 }} 
                 onDelete={() => handleDelete(renderIdx)} 
                 copyToClipboard={copyToClipboard}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;