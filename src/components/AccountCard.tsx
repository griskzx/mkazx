import { useState } from 'react';
import { Eye, EyeOff, Copy, Edit2, Trash2, Globe, Server, User, LayoutGrid } from 'lucide-react';
import type { Account } from '../types';

export const getIconForType = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('web') || t.includes('http') || t.includes('网站')) return <Globe size={20} />;
  if (t.includes('服务器') || t.includes('server') || t.includes('ssh') || t.includes('云')) return <Server size={20} />;
  if (t.includes('qq') || t.includes('wx') || t.includes('wechat') || t.includes('微信')) return <User size={20} />;
  return <LayoutGrid size={20} />;
};

export interface AccountCardProps {
  acc: Account;
  onEdit: () => void;
  onDelete: () => void;
  copyToClipboard: (text: string) => void;
}

export function AccountCard({ acc, onEdit, onDelete, copyToClipboard }: AccountCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [remarkExpanded, setRemarkExpanded] = useState(false);

  return (
    <div className="account-card glass-panel">
      <div className="account-card-header">
        <div className="account-info">
          <div className="account-type">
            <div className="type-icon">{getIconForType(acc.accountType)}</div>
            {acc.accountType}
          </div>
          <div className="account-username">{acc.username}</div>
        </div>
        <div className="account-actions">
          <button className="icon-btn" onClick={onEdit} title="编辑"><Edit2 size={16} /></button>
          <button className="icon-btn" onClick={onDelete} title="删除"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="password-box">
        <span className={isVisible ? "password-visible" : "password-hidden"}>
          {isVisible ? acc.password : "••••••••"}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="icon-btn" onClick={() => setIsVisible(!isVisible)} title={isVisible ? "隐藏" : "显示"}>
            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button className="icon-btn" onClick={() => copyToClipboard(acc.password)} title="复制密码">
            <Copy size={16} />
          </button>
        </div>
      </div>

      {acc.remark && (
        <div 
          className={`account-remark ${remarkExpanded ? '' : 'collapsed'}`}
          onClick={() => setRemarkExpanded(!remarkExpanded)}
          title={remarkExpanded ? "点击折叠" : "点击展开查看完整备注"}
        >
          {acc.remark}
        </div>
      )}
    </div>
  );
}
