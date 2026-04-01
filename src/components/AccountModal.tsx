import { useState } from 'react';
import { Plus, Eye, EyeOff, Dices } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { Account } from '../types';

export interface AccountModalProps {
  show: boolean;
  onClose: () => void;
  form: Account;
  setForm: (v: Account) => void;
  isEditing: boolean;
  onSave: () => void;
  showAlert: (msg: string) => void;
  genTypes: { lower: boolean, upper: boolean, digit: boolean, special: boolean };
  setGenTypes: (v: { lower: boolean, upper: boolean, digit: boolean, special: boolean }) => void;
}

export function AccountModal({ show, onClose, form, setForm, isEditing, onSave, showAlert, genTypes, setGenTypes }: AccountModalProps) {
  if (!show) return null;

  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h3>{isEditing ? '编辑凭证' : '添加新凭证'}</h3>
          <button className="icon-btn" onClick={onClose}><Plus size={24} style={{ transform: 'rotate(45deg)' }}/></button>
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
                    setPasswordVisible(true);
                  } catch (e: any) {
                    showAlert("生成失败: " + e);
                  }
                }}
              >
                <Dices size={14} /> 根据下方选项生成
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type={passwordVisible ? "text" : "password"} 
                placeholder="Password" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
              />
              <button className="secondary" style={{ padding: '0 12px' }} onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
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
            <button className="flex-1" onClick={onSave}>保存凭证</button>
            <button className="secondary flex-1" onClick={onClose}>取消</button>
          </div>
        </div>
      </div>
    </div>
  );
}
