import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Lock, Unlock, ShieldCheck, Search, Plus, Key, 
  Eye, EyeOff, Copy, Edit2, Trash2, Globe, Server, User, LayoutGrid
} from 'lucide-react';
import type { Account } from './types';

// ========================
// 辅助图标映射组件
// ========================
const getIconForType = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('web') || t.includes('http') || t.includes('网站')) return <Globe size={20} />;
  if (t.includes('服务器') || t.includes('server') || t.includes('ssh')) return <Server size={20} />;
  if (t.includes('qq') || t.includes('wx') || t.includes('wechat')) return <User size={20} />;
  return <LayoutGrid size={20} />;
};

function App() {
  const [step, setStep] = useState<'setup' | 'unlock' | 'main'>('unlock');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 账号相关
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Account>({ accountType: '', username: '', password: '', remark: '' });

  // 密码可见性管理 (key: index, value: boolean)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  // 检查是否已有 vault
  useEffect(() => {
    invoke<boolean>('is_vault_exists').then((exists) => {
      setStep(exists ? 'unlock' : 'setup');
    }).catch(console.error);
  }, []);

  // 加载 / 搜索账号
  const fetchAccounts = async (query?: string) => {
    if (!masterPassword) return;
    setLoading(true);
    setError('');
    try {
      if (query && query.trim() !== '') {
        const result = await invoke<Account[]>('search_accounts', {
          masterPassword,
          accountType: query.trim(),
          username: query.trim(),
        });
        setAccounts(result);
      } else {
        const vault = await invoke<{ items: Account[] }>('get_all_accounts', { masterPassword });
        setAccounts(vault.items);
      }
    } catch (e: any) {
      console.error(e);
      // 如果搜索失败或者加载失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'main') fetchAccounts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, step]);

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

  const handleSaveAccount = async () => {
    if (!form.accountType || !form.username || !form.password) {
      return alert("类型、账号和密码为必填项！");
    }
    
    try {
      if (editingIndex !== null) {
        await invoke('update_account', { masterPassword, index: editingIndex, updatedAccount: form });
      } else {
        await invoke('add_account', { masterPassword, newAccount: form });
      }
      setShowModal(false);
      resetForm();
      fetchAccounts(searchQuery);
    } catch (e: any) {
      alert('保存失败: ' + e);
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('确定要删除这条凭证吗？此操作不可逆。')) return;
    try {
      await invoke('delete_account', { masterPassword, index });
      fetchAccounts(searchQuery);
    } catch (e: any) {
      alert('删除失败: ' + e);
    }
  };

  const resetForm = () => {
    setForm({ accountType: '', username: '', password: '', remark: '' });
    setEditingIndex(null);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (acc: Account, index: number) => {
    setForm(acc);
    setEditingIndex(index);
    setShowModal(true);
  };

  const togglePassword = (idx: number) => {
    setVisiblePasswords(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("已复制到剪贴板");
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
        <div className="auth-bg-glow" />
        <div className="auth-card glass-panel">
          <div className="auth-icon">
            {step === 'setup' ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <h1 className="auth-title">
            {step === 'setup' ? '初始化保险箱' : '解锁 mkazx'}
          </h1>
          <p className="auth-subtitle">
            {step === 'setup' ? '设置强主密码以加密您的所有凭证数据' : '请输入您的主密码进行验证'}
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
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <ShieldCheck size={24} color="var(--accent)" />
          <span>mkazx Vault</span>
        </div>
        <div className="sidebar-content">
          <div className="nav-item active">
            <Key size={18} /> 全部凭证
          </div>
          <div className="nav-item">
            <Globe size={18} /> 网站登录
          </div>
          <div className="nav-item">
            <Server size={18} /> 服务器/SSH
          </div>
        </div>
        <div className="sidebar-footer">
          <button className="secondary" style={{ width: '100%' }} onClick={() => setStep('unlock')}>
             锁定并退出
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
              placeholder="搜索账号或类型..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-actions">
            {success && <span className="text-success" style={{ margin: 0 }}>{success}</span>}
            <button onClick={openAdd}>
              <Plus size={18} /> 添加凭证
            </button>
          </div>
        </div>

        <div className="accounts-grid">
          {accounts.length === 0 && !loading && (
            <div className="empty-state">
              <Search />
              <p>没有找到任何记录，点击右上角添加。</p>
            </div>
          )}

          {accounts.map((acc, idx) => {
            const isVisible = !!visiblePasswords[idx];
            return (
              <div className="account-card glass-panel" key={idx}>
                <div className="account-card-header">
                  <div className="account-info">
                    <div className="account-type">
                      <div className="type-icon">{getIconForType(acc.accountType)}</div>
                      {acc.accountType}
                    </div>
                    <div className="account-username">{acc.username}</div>
                  </div>
                  <div className="account-actions">
                    <button className="icon-btn" onClick={() => openEdit(acc, idx)} title="编辑"><Edit2 size={16} /></button>
                    <button className="icon-btn" onClick={() => handleDelete(idx)} title="删除"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="password-box">
                  <span className={isVisible ? "password-visible" : "password-hidden"}>
                    {isVisible ? acc.password : "••••••••"}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="icon-btn" onClick={() => togglePassword(idx)} title={isVisible ? "隐藏" : "显示"}>
                      {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button className="icon-btn" onClick={() => copyToClipboard(acc.password)} title="复制密码">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {acc.remark && (
                  <div className="account-remark">
                    {acc.remark}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Add / Edit */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>{editingIndex !== null ? '编辑凭证' : '添加新凭证'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><Plus size={24} style={{ transform: 'rotate(45deg)' }}/></button>
            </div>
            
            <div className="flex-col">
              <div className="form-group">
                <label>类别 / 标签</label>
                <input 
                  placeholder="如: Github / 服务器 / 微信" 
                  value={form.accountType} 
                  onChange={e => setForm({...form, accountType: e.target.value})} 
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>账号 / 用户名</label>
                <input 
                  placeholder="Username / Email" 
                  value={form.username} 
                  onChange={e => setForm({...form, username: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>密码</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type={visiblePasswords[-1] ? "text" : "password"} 
                    placeholder="Password" 
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                  />
                  <button className="secondary" style={{ padding: '0 12px' }} onClick={() => togglePassword(-1)}>
                    {visiblePasswords[-1] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>备注描述 (可选)</label>
                <textarea 
                  placeholder="URL 或其他描述信息..." 
                  value={form.remark} 
                  onChange={e => setForm({...form, remark: e.target.value})} 
                />
              </div>

              <div className="flex-row mt-4">
                <button className="flex-1" onClick={handleSaveAccount}>保存凭证</button>
                <button className="secondary flex-1" onClick={() => setShowModal(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;