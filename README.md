# MalussBit

MalussBit는 micro:bit v2와 서보모터, 내장 조도 센서를 이용해 말루스의 법칙을 실험하는 웹앱 초안입니다. 이 디렉터리는 기존 MagnetometerBit 프로젝트에서 공통으로 활용 가능한 HTML/CSS/JS 자산을 가져와 새로운 실험 도구를 설계하기 위한 출발점을 제공합니다.

## 포함된 구성요소

- `index.html`: MalussBit 전용 레이아웃과 UI 골격
- `styles.css`: 기존 프로젝트의 베이스 스타일을 재사용
- `js/bluetooth.js`: Nordic UART 기반 Web Bluetooth 연결 및 명령 송신 유틸리티
- `js/dialog-polyfill.js`: `<dialog>` 호환성 확보용 폴리필
- `js/state.js`: MalussBit 전용 전역 상태 스토어와 액션
- `js/ui/connection-panel.js`, `js/ui/calibration-panel.js`, `js/ui/measurement-panel.js`, `js/ui/analysis-actions.js`, `js/ui/mode-toggle.js`, `js/ui/step-indicator.js`, `js/ui/status-banner.js`, `js/ui/live-stats.js`, `js/ui/light-chart.js`, `js/ui/data-log.js`, `js/ui/fitting-panel.js`, `js/ui/session-notes.js`: UX 패널 및 보조 UI 모듈
- `js/utils/format.js`, `js/utils/csv.js`, `js/utils/parseSample.js`: 포맷/CSV/샘플 파서 유틸리티
- `js/analysis/malusFit.js`: 말루스 피팅 로직과 보정 헬퍼
- `vendor/chart.umd.js`: 차트 렌더링을 위한 Chart.js 번들
- `firmware/`: MagnetometerBit 펌웨어 사본과 참조용 문서

세부 개발 항목과 기존 모듈에서 추가로 재사용할 컴포넌트는 `docs/development-plan.md`를 참고하세요.

## 상태

현재 UX 흐름(준비→측정→분석)과 자동 보정/측정/피팅을 위한 UI 패널, 상태 관리, 메시지 시스템이 구축되어 있습니다. 펌웨어 연동 세부 로직과 보정 알고리즘 고도화 등은 계속 진행 중이며, `docs/ux-plan.md`와 `docs/detailed-implementation.md`를 참고해 후속 작업을 진행하세요.
