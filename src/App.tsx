// src/App.tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Account } from './types';

function App() {
  const [step, setStep] = useState<'setup' | 'unlock' | 'main'>('unlock');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // 主界面状态
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchType, setSearchType] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // 添加/编辑模态框
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Account>({
    accountType: '',
    username: '',
    password: '',
    remark: '',
  });

  // 检查是否已有 vault 文件
  useEffect(() => {
    invoke<boolean>('is_vault_exists').then((exists) => {
      setStep(exists ? 'unlock' : 'setup');
    }).catch(console.error);
  }, []);

  // 加载所有账号
  const loadAllAccounts = async () => {
    if (!masterPassword) return;
    setLoading(true);
    setError('');
    try {
      const vault = await invoke<{ items: Account[] }>('get_all_accounts', {
        masterPassword,
      });
      setAccounts(vault.items);
      setSearchType('');
      setSearchUsername('');
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  // 模糊搜索
  const performSearch = async () => {
    if (!masterPassword) return;
    setLoading(true);
    setError('');
    try {
      const result = await invoke<Account[]>('search_accounts', {
        masterPassword,
        accountType: searchType.trim() || undefined,
        username: searchUsername.trim() || undefined,
      });
      setAccounts(result);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  // 实时搜索（输入后 300ms 自动搜索）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'main' && (searchType || searchUsername)) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchType, searchUsername, step, masterPassword]);

  // 进入主界面后自动加载账号
  useEffect(() => {
    if (step === 'main' && masterPassword) {
      loadAllAccounts();
    }
  }, [step, masterPassword]);

  // 设置主密码
  const handleSetup = async () => {
    if (masterPassword !== confirmPassword) {
      setError("两次输入的主密码不一致");
      return;
    }
    if (masterPassword.length < 8) {
      setError("主密码至少需要 8 位");
      return;
    }

    try {
      await invoke('setup_master_password', { masterPassword, confirmPassword });
      setError('');
      setStep('main');
      alert('主密码设置成功！');
    } catch (e: any) {
      setError(e.toString());
    }
  };

  // 解锁
  const handleUnlock = async () => {
    try {
      await invoke('unlock_vault', { masterPassword });
      setError('');
      setStep('main');
    } catch (e: any) {
      setError(e.toString());
    }
  };

  // 添加账号
  const addAccount = async () => {
    try {
      const vault = await invoke<{ items: Account[] }>('add_account', {
        masterPassword,
        newAccount: form,
      });
      setAccounts(vault.items);
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      alert('添加失败：' + e);
    }
  };

  // 更新账号
  const updateAccount = async () => {
    if (editingIndex === null) return;
    try {
      const vault = await invoke<{ items: Account[] }>('update_account', {
        masterPassword,
        index: editingIndex,
        updatedAccount: form,
      });
      setAccounts(vault.items);
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      alert('更新失败：' + e);
    }
  };

  // 删除账号
  const deleteAccount = async (index: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      const vault = await invoke<{ items: Account[] }>('delete_account', {
        masterPassword,
        index,
      });
      setAccounts(vault.items);
    } catch (e: any) {
      alert('删除失败：' + e);
    }
  };

  const resetForm = () => {
    setForm({ accountType: '', username: '', password: '', remark: '' });
    setEditingIndex(null);
  };

  const openEdit = (acc: Account, index: number) => {
    setForm(acc);
    setEditingIndex(index);
    setShowModal(true);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>🔐 mkazx 密码管理器</h1>

      {/* 设置主密码界面 */}
      {step === 'setup' && (
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '12px' }}>
          <h2>首次使用，请设置主密码</h2>
          <p>主密码用于加密所有数据，请务必牢记</p>
          <input
            type="password"
            placeholder="输入主密码（至少8位）"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            style={{ display: 'block', margin: '10px 0', width: '300px', padding: '8px' }}
          />
          <input
            type="password"
            placeholder="再次确认主密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ display: 'block', margin: '10px 0', width: '300px', padding: '8px' }}
          />
          <button onClick={handleSetup}>创建主密码</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}

      {/* 解锁界面 */}
      {step === 'unlock' && (
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '12px' }}>
          <h2>输入主密码解锁</h2>
          <input
            type="password"
            placeholder="请输入主密码"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            style={{ display: 'block', margin: '10px 0', width: '300px', padding: '8px' }}
          />
          <button onClick={handleUnlock}>解锁保险箱</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}

      {/* 主管理界面 */}
      {step === 'main' && (
        <div>
          <h2>账号管理（已解锁）</h2>

          <div style={{ marginBottom: '15px' }}>
            <input
              placeholder="按账号类型模糊搜索（如 qq、git）"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              style={{ marginRight: '10px', padding: '8px', width: '220px' }}
            />
            <input
              placeholder="按用户名模糊搜索"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              style={{ marginRight: '10px', padding: '8px', width: '220px' }}
            />
            <button onClick={loadAllAccounts}>显示全部</button>
          </div>

          {loading && <p>加载中...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button onClick={() => { setShowModal(true); resetForm(); }} style={{ marginBottom: '15px' }}>
            + 添加新账号
          </button>

          <div>
            {accounts.length === 0 ? (
              <p>暂无账号或没有找到匹配项</p>
            ) : (
              accounts.map((acc, index) => (
                <div key={index} style={{ border: '1px solid #ddd', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
                  <strong>{acc.accountType}</strong> — {acc.username}
                  <br />
                  密码: {acc.password}
                  <br />
                  备注: {acc.remark || '无'}
                  <br /><br />
                  <button onClick={() => openEdit(acc, index)}>编辑</button>
                  <button onClick={() => deleteAccount(index)} style={{ marginLeft: '10px', color: 'red' }}>删除</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 添加 / 编辑模态框 */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '25px',
          border: '2px solid #333',
          borderRadius: '10px',
          zIndex: 1000,
          minWidth: '400px'
        }}>
          <h3>{editingIndex !== null ? '编辑账号' : '添加新账号'}</h3>
          
          <input
            placeholder="账号类型（如 QQ、GitHub）"
            value={form.accountType}
            onChange={(e) => setForm({ ...form, accountType: e.target.value })}
            style={{ display: 'block', margin: '10px 0', width: '100%', padding: '8px' }}
          />
          <input
            placeholder="用户名 / 账号"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            style={{ display: 'block', margin: '10px 0', width: '100%', padding: '8px' }}
          />
          <input
            placeholder="密码"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ display: 'block', margin: '10px 0', width: '100%', padding: '8px' }}
          />
          <textarea
            placeholder="备注（可选）"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
            style={{ display: 'block', margin: '10px 0', width: '100%', padding: '8px', minHeight: '60px' }}
          />

          <div style={{ marginTop: '15px' }}>
            <button onClick={editingIndex !== null ? updateAccount : addAccount}>
              {editingIndex !== null ? '保存修改' : '添加账号'}
            </button>
            <button onClick={() => { setShowModal(false); resetForm(); }} style={{ marginLeft: '10px' }}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;