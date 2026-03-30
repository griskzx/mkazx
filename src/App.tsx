import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Lock, Unlock, ShieldCheck, Search, Plus, Key, 
  Eye, EyeOff, Copy, Edit2, Trash2, Globe, Server, User, LayoutGrid, Dices
} from 'lucide-react';
import type { Account } from './types';

// ========================
// 辅助图标映射组件
// ========================
const getIconForType = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('web') || t.includes('http') || t.includes('网站')) return <Globe size={20} />;
  if (t.includes('服务器') || t.includes('server') || t.includes('ssh') || t.includes('云')) return <Server size={20} />;
  if (t.includes('qq') || t.includes('wx') || t.includes('wechat') || t.includes('微信')) return <User size={20} />;
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

  // 密码可见性与备注展开管理
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [expandedRemarks, setExpandedRemarks] = useState<Record<number, boolean>>({});

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

  // 生成密码
  const handleGeneratePwd = async () => {
    try {
      const types = [];
      if (genTypes.lower) types.push("lower");
      if (genTypes.upper) types.push("upper");
      if (genTypes.digit) types.push("digit");
      if (genTypes.special) types.push("special");
      
      if (types.length === 0) return showAlert("至少得选择一种字符类型吧？");
      
      const pwd = await invoke<string>('generate_password_cmd', { length: genLength, types });
      setGeneratedPwd(pwd);
    } catch (e: any) {
      showAlert("生成失败: " + e);
    }
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
  // 自定义对话框组件
  // =====================
  const renderDialog = () => {
    if (!dialog.show) return null;
    return (
      <div className="modal-backdrop" style={{ zIndex: 3000 }}>
        <div className="modal-content glass-panel" style={{ width: '380px', padding: '30px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px', fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {dialog.message}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {dialog.type === 'confirm' && (
              <button className="secondary flex-1" onClick={() => setDialog({ ...dialog, show: false })}>取消</button>
            )}
            <button className={dialog.type === 'confirm' ? "danger flex-1" : "flex-1"} onClick={() => {
              setDialog({ ...dialog, show: false });
              if (dialog.onConfirm) dialog.onConfirm();
            }}>
              确定
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =====================
  // 密码生成器 弹窗组件
  // =====================
  const renderGenModal = () => {
    if (!showGenModal) return null;
    return (
      <div className="modal-backdrop" style={{ zIndex: 2000 }}>
        <div className="modal-content glass-panel" style={{ width: '400px' }}>
          <div className="modal-header">
            <h3>随机密码生成器</h3>
            <button className="icon-btn" onClick={() => setShowGenModal(false)}><Plus size={24} style={{ transform: 'rotate(45deg)' }}/></button>
          </div>
          <div className="flex-col">
            <div className="password-box" style={{ justifyContent: 'center', height: '60px', fontSize: '18px' }}>
               {generatedPwd || <span style={{ color: 'var(--text-secondary)' }}>点击下方生成按钮</span>}
            </div>
            {generatedPwd && (
               <button className="secondary" onClick={() => copyToClipboard(generatedPwd)} style={{ marginTop: '-8px' }}>
                 <Copy size={16} /> 复制大密码
               </button>
            )}

            <div className="form-group" style={{ marginTop: '10px' }}>
              <label>密码长度: {genLength}位</label>
              <input 
                 type="range" min="6" max="16" value={genLength} 
                 onChange={e => setGenLength(parseInt(e.target.value))} 
                 style={{ padding: '0', cursor: 'pointer', height: '4px', background: 'var(--accent)' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={genTypes.upper} onChange={e => setGenTypes({...genTypes, upper: e.target.checked})} style={{ width: '18px' }}/> 大写字母
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={genTypes.lower} onChange={e => setGenTypes({...genTypes, lower: e.target.checked})} style={{ width: '18px' }}/> 小写字母
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={genTypes.digit} onChange={e => setGenTypes({...genTypes, digit: e.target.checked})} style={{ width: '18px' }}/> 数字 0-9
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={genTypes.special} onChange={e => setGenTypes({...genTypes, special: e.target.checked})} style={{ width: '18px' }}/> 特殊符号
              </label>
            </div>

            <button onClick={handleGeneratePwd} style={{ marginTop: '10px', height: '44px', fontWeight: 'bold' }}>
              <Dices size={18} /> 随机生成
            </button>
          </div>
        </div>
      </div>
    );
  };


  // =====================
  // 渲染 Auth 界面
  // =====================
  if (step === 'setup' || step === 'unlock') {
    return (
      <div className="auth-container">
        {renderDialog()}
        {renderGenModal()}
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
      {renderDialog()}
      {renderGenModal()}

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <ShieldCheck size={24} color="var(--accent)" />
          <span>mkazx Vault</span>
        </div>
        <div className="sidebar-content">
          <div className={`nav-item ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>
            <Key size={18} /> 全部凭证
          </div>
          <div className={`nav-item ${activeCategory === 'web' ? 'active' : ''}`} onClick={() => setActiveCategory('web')}>
            <Globe size={18} /> 网站登录
          </div>
          <div className={`nav-item ${activeCategory === 'server' ? 'active' : ''}`} onClick={() => setActiveCategory('server')}>
            <Server size={18} /> 服务器/SSH
          </div>
        </div>
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="secondary" style={{ width: '100%' }} onClick={() => { setGeneratedPwd(""); setShowGenModal(true); }}>
             <Dices size={18} /> 生成密码
          </button>
          <button className="secondary" style={{ width: '100%', borderColor: 'transparent', color: 'var(--text-secondary)' }} onClick={() => setStep('unlock')}>
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
              placeholder="搜索账号或类型（实时匹配）..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-actions">
            {success && <span className="text-success" style={{ margin: 0 }}>{success}</span>}
            <button onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus size={18} /> 添加凭证
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
            const isVisible = !!visiblePasswords[globalIdx];

            return (
              <div className="account-card glass-panel" key={globalIdx}>
                <div className="account-card-header">
                  <div className="account-info">
                    <div className="account-type">
                      <div className="type-icon">{getIconForType(acc.accountType)}</div>
                      {acc.accountType}
                    </div>
                    <div className="account-username">{acc.username}</div>
                  </div>
                  <div className="account-actions">
                    <button className="icon-btn" onClick={() => {
                        setForm(acc);
                        setEditingIndex(globalIdx);
                        setShowModal(true);
                      }} title="编辑"><Edit2 size={16} /></button>
                    <button className="icon-btn" onClick={() => handleDelete(renderIdx)} title="删除"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="password-box">
                  <span className={isVisible ? "password-visible" : "password-hidden"}>
                    {isVisible ? acc.password : "••••••••"}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="icon-btn" onClick={() => setVisiblePasswords(p => ({ ...p, [globalIdx]: !p[globalIdx] }))} title={isVisible ? "隐藏" : "显示"}>
                      {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button className="icon-btn" onClick={() => copyToClipboard(acc.password)} title="复制密码">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {acc.remark && (
                  <div 
                    className={`account-remark ${expandedRemarks[globalIdx] ? '' : 'collapsed'}`}
                    onClick={() => setExpandedRemarks(p => ({ ...p, [globalIdx]: !p[globalIdx] }))}
                    title={expandedRemarks[globalIdx] ? "点击折叠" : "点击展开查看完整备注"}
                  >
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <label>密码</label>
                  <span 
                    style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={async () => {
                      const selTypes = [];
                      if (genTypes.lower) selTypes.push("lower");
                      if (genTypes.upper) selTypes.push("upper");
                      if (genTypes.digit) selTypes.push("digit");
                      if (genTypes.special) selTypes.push("special");
                      if (selTypes.length === 0) return showAlert("至少得选择一种字符类型吧？");
                      
                      try {
                        const pwd = await invoke<string>('generate_password_cmd', { length: 16, types: selTypes });
                        setForm({...form, password: pwd});
                        setVisiblePasswords(p => ({ ...p, [-1]: true })); // 自动显示明文以供查看
                      } catch (e) {
                        showAlert("生成失败: " + e);
                      }
                    }}
                  >
                    <Dices size={14} /> 根据下方选项生成
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type={visiblePasswords[-1] ? "text" : "password"} 
                    placeholder="Password" 
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                  />
                  <button className="secondary" style={{ padding: '0 12px' }} onClick={() => setVisiblePasswords(p => ({ ...p, [-1]: !p[-1] }))}>
                    {visiblePasswords[-1] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genTypes.upper} onChange={e => setGenTypes({...genTypes, upper: e.target.checked})} style={{ width: '13px', margin: 0 }}/> 大写
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genTypes.lower} onChange={e => setGenTypes({...genTypes, lower: e.target.checked})} style={{ width: '13px', margin: 0 }}/> 小写
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genTypes.digit} onChange={e => setGenTypes({...genTypes, digit: e.target.checked})} style={{ width: '13px', margin: 0 }}/> 数字
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genTypes.special} onChange={e => setGenTypes({...genTypes, special: e.target.checked})} style={{ width: '13px', margin: 0 }}/> 特殊符号
                  </label>
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