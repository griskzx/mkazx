import React from 'react';
import { Plus, Copy, Dices } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export interface PasswordGeneratorModalProps {
  show: boolean;
  onClose: () => void;
  genLength: number;
  setGenLength: (v: number) => void;
  genTypes: { lower: boolean, upper: boolean, digit: boolean, special: boolean };
  setGenTypes: (v: { lower: boolean, upper: boolean, digit: boolean, special: boolean }) => void;
  generatedPwd: string;
  setGeneratedPwd: (v: string) => void;
  copyToClipboard: (text: string) => void;
  showAlert: (msg: string) => void;
}

export function PasswordGeneratorModal({
  show, onClose, genLength, setGenLength, genTypes, setGenTypes, generatedPwd, setGeneratedPwd, copyToClipboard, showAlert
}: PasswordGeneratorModalProps) {
  if (!show) return null;

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

  return (
    <div className="modal-backdrop" style={{ zIndex: 2000 }}>
      <div className="modal-content glass-panel" style={{ width: '400px' }}>
        <div className="modal-header">
          <h3>随机密码生成器</h3>
          <button className="icon-btn" onClick={onClose}><Plus size={24} style={{ transform: 'rotate(45deg)' }}/></button>
        </div>
        <div className="flex-col">
          <div className="password-box" style={{ justifyContent: 'center', height: '60px', fontSize: '18px' }}>
             {generatedPwd || <span style={{ color: 'var(--text-secondary)' }}>点击下方生成按钮</span>}
          </div>
          {generatedPwd && (
             <button className="secondary" onClick={() => copyToClipboard(generatedPwd)} style={{ marginTop: '-8px' }}>
               <Copy size={16} /> 复制密码
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
}
