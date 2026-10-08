# DashBoard

인터넷 연결 없이 PC에서 직접 사용하는 단일 HTML 개인 대시보드입니다.

## 실행 방식

빌드 결과는 `DashBoard.html` 한 파일입니다.

- 설치 프로그램 없음
- 웹 서버 없음
- 실행 중 외부 통신 없음
- Chrome / Edge에서 파일을 직접 열어 사용
- 데이터는 브라우저 로컬 저장소(IndexedDB)에 자동 저장
- IndexedDB 사용이 불가능한 환경에서는 localStorage로 fallback
- 다른 PC로 이동할 때는 JSON 백업 내보내기 / 불러오기 사용

## 핵심 기능

- 대시보드 제목 / 설명 편집
- 메인 탭 + 카드별 상세 탭
- ToDo / 일정 / 자유메모 / 메모보드
- 카드 추가 / 삭제 / 즐겨찾기
- 카드 이동 / 크기 조절 / 충돌 처리
- 선택형 빈 공간 자동 채우기
- 메모보드 포스트잇 이동 / 크기 조절 / 색상 변경
- 모바일에서는 카드 배치를 변경하지 않고 세로 스택으로 표시
- JSON 백업 / 복원

## 개발

```bash
npm install
npm run dev
```

검증:

```bash
npm test
npm run build
npm run test:e2e
```

GitHub Actions는 테스트를 모두 통과한 뒤 단일 `DashBoard.html` 파일을 artifact로 생성합니다.

## 구조

- `src/App.tsx`: 화면 조립과 대시보드 상태 연결
- `src/cards/`: 카드별 UI와 카드 내부 동작
- `src/components/`: 공통 UI
- `src/lib/state.ts`: 저장 데이터 생성 / 정규화 / 이전 호환
- `src/lib/storage.ts`: IndexedDB 저장, localStorage fallback, JSON 백업
- `src/lib/layout.ts`: 카드 충돌 / 밀어내기 / 빈 공간 채우기
- `src/types/dashboard.ts`: 영속 데이터 타입
- `e2e/`: 실제 사용자 동작 검증

`DashboardState.version`을 기준으로 저장 포맷 호환성을 관리합니다.
