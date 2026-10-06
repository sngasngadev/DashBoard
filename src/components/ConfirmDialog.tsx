interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = '삭제', onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="modal confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={e => e.stopPropagation()}>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="button secondary" onClick={onCancel}>취소</button>
          <button className="button danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
