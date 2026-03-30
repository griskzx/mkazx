import React from 'react';

export interface DialogProps {
  dialog: {
    show: boolean;
    type: 'alert' | 'confirm';
    message: string;
    onConfirm?: () => void;
  };
  setDialog: (v: any) => void;
}

export function Dialog({ dialog, setDialog }: DialogProps) {
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
}
