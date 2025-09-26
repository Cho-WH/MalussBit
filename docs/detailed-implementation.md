# MalussBit UX 기반 구현 계획 (v0.2 초안)

> `docs/ux-plan.md`에서 정의한 사용자 친화 흐름을 현재 코드베이스에 반영하기 위한 구체적인 개발 계획입니다. 기존 UI/로직과의 차이를 명확히 하고, 필요한 모듈 수정·추가 작업을 단계별로 정리했습니다.

---

## 1. 현재 상태 요약 vs UX 요구사항 간 격차

| 영역 | 현재 구현 | UX 요구사항 | 격차 |
| --- | --- | --- | --- |
| 단계 안내 | 고정 레이아웃, 단계 구분 없음 | 준비→보정→측정→분석 스텝 안내 | 단계 네비게이션 UI 필요 |
| 자동 보정 | 수동 입력 필드(0점, 스케일, 속도) | 원클릭 자동 보정, 수동은 숨김 옵션 | auto calibration 로직/버튼 추가, 입력 UI 단순화 |
| 측정 흐름 | 수동 피팅 버튼, 측정/스윕 제어 없음 | “측정 시작/중지” 토글, 진행률 표시 | 스윕 제어 UI와 상태 관리 필요 |
| 피팅 결과 | 숫자 나열 | 해석 메시지, 결과 카드 강조, 자동 실행 | 결과 카드 재구성, 자동 피팅 트리거 |
| 교사용 옵션 | 없음 | 고급 설정 토글 | Instructor 모드 토글/상세 패널 |
| 수업 메모 | 간단 문구 | 노트 필드, 저장/복사 | 노트 UI 및 상태 저장 |
| 접근성 | 기본 텍스트 업데이트 | 단계 안내, aria-live, 대비 향상 | 상태 메시지/토스트 구성 필요 |

---

## 2. 레이아웃/HTML 개편 계획

1. **스텝 헤더 추가 (`index.html`)**
   - `<nav class="steps">`에 네 단계 표시 및 현재 단계 강조 클래스.
   - 단계마다 `data-step="prepare" | "calibrate" | "measure" | "analyze"` 속성.

2. **좌측 패널 재구성**
   - 기존 연결 패널을 “준비” 섹션으로 확장: 장비 체크리스트 + 연결 버튼.
   - “보정” 섹션: `자동 보정` 버튼, 진행 상태 텍스트, “수동 보정 열기” 토글 및 숨겨진 입력 필드.
   - “측정” 섹션: `측정 시작/중지` 버튼, 진행률 바(조도/각도 스윕 %), 남은 시간 표시.
   - “분석” 섹션: `결과 저장`, `피팅 다시 실행` 버튼.

3. **우측 메인 영역**
   - 그래프 카드 상단에 단계별 안내 문구(`aria-live`).
   - 피팅 결과 카드를 재작성: 핵심 값 + 해석 메시지 + 정상/주의 배지.
   - 실험 노트 카드: 텍스트 영역, “복사” 버튼.

---

## 3. 상태/로직 확장 계획 (`js/state.js` 및 관련 액션)

1. **추가 필드**
   - `currentStep`: `'prepare' | 'calibrate' | 'measure' | 'analyze'`.
   - `workflow`: `{ autoCalibrationRunning: boolean, measurementRunning: boolean, sweepProgress: number (0–100), sweepDurationMs, lastRunAt }`.
   - `messages`: `{ status?: string, warning?: string }` (상태 안내용).
   - `notes`: `string` (실험 메모 저장).

2. **액션 추가**
   - `setStep(step)`, `setWorkflow(partial)`, `setMessage(partial)`, `setNotes(text)`.
   - 기존 `reset` 시 `notes` 유지 여부 결정(기본 유지).

3. **리듀서 수정**
   - 새 필드 포함.
   - 측정 종료 시 `currentStep`을 자동으로 `analyze`로 전환.

---

## 4. 자동 보정 UX 구현 계획

1. **UI (`index.html` + `js/ui/calibration-panel.js`)**
   - “자동 보정 실행” 버튼, 상태 텍스트, 성공/실패 메시지 표시.
   - “수동 보정 열기” 토글 → 기존 입력 필드(0점, 스케일, 속도) 표시.

2. **로직**
   - `js/bluetooth.js`: `sendCalibrationRequest()` 함수 추가 (예: `writeLine('CALIBRATE')`).
   - 펌웨어가 응답 데이터(`CAL,zero,scale,speed`)를 보내면 `parseSample`과 별도로 처리할 수 있도록 `startNotifications` 핸들러에 제어 메시지 분기.
   - `state.setCalibration` 호출 후 `setWorkflow({ autoCalibrationRunning: false })`, `setMessage({ status: '보정 완료' })`.

3. **자동 추정** (펌웨어에서 raw 데이터만 보낼 경우)
   - 초기 N개 샘플을 수집하여 zero/scale 추정 알고리즘 작성 (후속 작업으로 문서화).

---

## 5. 측정 제어 UX 구현 계획

1. **UI (`js/ui/measurement-panel.js`)**
   - “측정 시작/중지” 토글 버튼.
   - 진행률 바: `sweepProgress` 상태 기반.
   - 진행 중일 때 예상 종료 시간/남은 시간 텍스트.

2. **로직**
   - `startMeasurement()` 함수: `startSweep({fromDeg, toDeg, durationMs})` 호출 + 상태 갱신.
   - `stopMeasurement()` 함수: `stopSweep()`, 상태 초기화.
   - `startNotifications` 콜백 내에서 timestamp 기반으로 진행률 추정 (`(current - start) / duration`).
   - 스윕 종료 후 자동으로 `fitMalus` 실행 → `setFitResult` → `setStep('analyze')`.

---

## 6. 피팅 결과 카드 개편 계획

1. **UI (`js/ui/fitting-panel.js` 개편)**
   - 필드 최소화: 자동 피팅 결과만 표시, “고급 설정 열기”에 수동 보정/피팅 재실행 컨트롤 위치.
   - 결과 해석 함수 추가: R² 범위에 따라 “매우 양호/보통/주의” 메시지.
   - 그래프와 연동: 결과가 나오면 Chart.js에 피팅 곡선 데이터셋 추가.

2. **로직**
   - `fitMalus` 호출 후 결과에서 `interpretFit(result)` 함수로 메시지 생성.
   - `store.actions.setMessage({ status: '피팅 완료', warning: ... })` 등으로 상태 전달.
   - 측정 종료 시 자동으로 실행, 버튼은 재실행 용도로 유지.

---

## 7. 스텝 네비게이션 및 메시지 시스템

1. **UI (`js/ui/step-indicator.js`)**
   - `store` 구독하여 `currentStep`에 따라 강조 클래스를 토글.
   - 각 스텝 클릭 시 `setStep(step)` dispatch (단, 진행 가능 단계만 허용).

2. **메시지/토스트 (`js/ui/status-banner.js`)**
   - `messages.status`/`messages.warning`을 상단 배너로 표시.
   - `aria-live="polite"`로 상태 읽기 지원.

---

## 8. 교사용 고급 설정 및 모드 토글

1. **상태**
   - `state.calibration.showAdvanced: boolean` 혹은 `state.uiMode: 'student' | 'instructor'`.

2. **UI (`js/ui/mode-toggle.js`)**
   - 토글 스위치 추가.
   - Instructor 모드일 때만 고급 설정 섹션(`manual calibration`, `sweep config`) 노출.

---

## 9. 실험 노트 UI

1. **UI (`js/ui/session-notes.js`)**
   - 텍스트 영역 + “복사”, “초기화” 버튼.
   - `store.actions.setNotes(value)` 호출로 상태 저장.

2. **상태 유지 전략**
   - `localStorage`에 자동 저장 (선택 사항) → 추후 고려.

---

## 10. 스타일/레이아웃 조정

- `styles.css` 개편
  - `.steps`, `.card.measurement`, `.progress-bar` 등 신규 클래스 정의.
  - 반응형 고려: 모바일/태블릿에서 단계 카드가 수직으로 정렬되도록 CSS Grid 수정.
  - 접근성: 배경/텍스트 대비, 버튼 색상, 포커스 스타일 강화.

---

## 11. 작업 순서 제안

1. **상태 확장**: `state.js` 업데이트, 신규 액션 추가.
2. **스텝 헤더 & 메시지 배너**: HTML 구조/스타일 초기 개편.
3. **보정/측정 패널 분리**: 기존 UI 모듈 리팩터링 (`calibration-panel`, `measurement-panel`).
4. **BLE 헬퍼 확장**: 보정/측정 명령 함수, 진행률 계산 로직 추가.
5. **피팅 카드 개편**: 자동 실행 흐름 및 메시지 해석.
6. **교사용 모드, 노트 UI**: 토글/상태/데이터 바인딩.
7. **접근성 점검**: aria 속성, 키보드 네비게이션, 색상 대비 수정.
8. **문서 업데이트**: UX 계획과 일치하도록 README/문서 보완.

---

## 12. 남은 리스크/선행 과제

- 펌웨어가 자동 보정/진행률 계산에 필요한 데이터를 반환하는지 확인 필요.
- Chart.js에 피팅 곡선을 겹치는 로직의 성능/가독성 검토.
- 다중 사용자(교사/학생) 시나리오에서 브라우저 스토리지 활용 여부 결정.

---

## 진행 현황 (업데이트)

- 전역 상태에 단계/워크플로/메시지/메모/UI 모드 필드를 추가했습니다.
- `index.html` 레이아웃을 단계 헤더·상태 배너·보정/측정/분석 패널 구조로 개편했습니다.
- 단계 인디케이터, 상태 배너, 모드 토글, 자동 보정 패널, 측정 패널, 분석 액션, 실험 메모 모듈을 구현했습니다.
- 피팅 카드와 차트 서브타이틀을 새 UX 흐름에 맞게 갱신했습니다.
