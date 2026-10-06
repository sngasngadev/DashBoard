# DashBoard

PC에서 주로 사용하고 모바일에서도 같은 화면을 사용할 수 있는 개인용 카드 대시보드입니다.

## 핵심 기능

- 직접 편집하는 대시보드 제목/설명, 메인 탭 + 카드별 상세 탭
- ToDo / 자유메모 / 메모보드 카드
- 카드 추가, 제목 즉시 편집, 즐겨찾기 잠금, 삭제 확인
- PC 카드 드래그 이동/리사이즈, 충돌 방지, 수동/자동 빈 공간 채우기
- 모바일에서는 배치를 건드리지 않고 카드가 세로로 정렬되는 반응형 UI
- Electron 포터블 EXE 옆 `dashboard-data.json`에 자동 저장
- 저장 시 `dashboard-data.backup.json` 자동 생성 + 수동 백업 내보내기/불러오기
- 웹/PWA에서는 LocalStorage 저장

## 개발

```bash
npm install
npm run dev
```

웹만 실행:

```bash
npm run dev:web
```

테스트/빌드:

```bash
npm test
npm run build
```

Windows 포터블 EXE:

```bash
npm run dist:win
```

## 데이터 구조

`DashboardState.version`으로 저장 포맷 버전을 관리합니다. 각 카드는 공통 메타데이터와 `type`, `layout`, `data`를 가지며 카드별 데이터는 `data`에만 들어갑니다. 새 카드 종류를 추가할 때 공통 저장 구조와 배치 엔진은 그대로 유지할 수 있습니다.
