import { Download, FolderOpen, LayoutGrid, Upload, X } from 'lucide-react';

interface Props {
  open: boolean;
  autoCompact: boolean;
  dataLocation: string;
  onClose: () => void;
  onToggleAuto: (value: boolean) => void;
  onCompact: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function SettingsModal(props: Props) {
  if (!props.open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={props.onClose}>
      <div className="modal settings-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-heading">
          <div><h2>설정</h2><p>배치와 백업 방식을 관리합니다.</p></div>
          <button className="icon-button" onClick={props.onClose} aria-label="닫기"><X size={19}/></button>
        </div>
        <section className="settings-section">
          <h3>카드 배치</h3>
          <div className="setting-row">
            <div><strong>빈 공간 자동 채우기</strong><span>카드를 이동·추가·삭제한 뒤 위쪽과 왼쪽부터 자동 정리합니다.</span></div>
            <label className="switch"><input type="checkbox" checked={props.autoCompact} onChange={e => props.onToggleAuto(e.target.checked)} /><span /></label>
          </div>
          <button className="button secondary wide" onClick={props.onCompact}><LayoutGrid size={17}/> 빈 공간 채우기</button>
        </section>
        <section className="settings-section">
          <h3>백업</h3>
          <p className="setting-help">PC 포터블 버전에서는 데이터가 실행 파일과 같은 폴더에 저장됩니다. 저장할 때 이전 파일도 자동 백업합니다.</p>
          {props.dataLocation && <div className="data-location"><FolderOpen size={16}/><span>{props.dataLocation}</span></div>}
          <div className="button-row">
            <button className="button secondary" onClick={props.onExport}><Download size={17}/> 백업 내보내기</button>
            <button className="button secondary" onClick={props.onImport}><Upload size={17}/> 백업 불러오기</button>
          </div>
        </section>
      </div>
    </div>
  );
}
