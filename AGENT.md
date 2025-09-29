# AGENT Guide

> 상세 코딩 단계는 항상 `docs/detailed-coding-plan.md`에 기록하며, 이 문서는 **다음 스텝**의 구체적인 작업 지침만 포함합니다. 다음 스텝을 완료하면 여기에서 새 스텝을 정의하고, 세부 계획 문서도 그 스텝에 맞춰 갱신하세요.
> 전체 구조와 흐름은 `docs/ux-plan.md`와 `docs/main-plan.md`를 기준으로 하며, 모든 다음 스텝 계획은 반드시 두 문서를 교차 참조하여 작성합니다.

## Last Update
- 펌웨어가 스윕 중복을 방지하고 RESET 명령 시 즉시 루프를 탈출하며 `END` 신호를 송신하도록 개편했습니다.
- 웹앱은 스윕 진행 상태(`running/resetting/idle`)를 추적하면서 스윕 버튼을 잠그고, `END` 수신·연결 해제 시 안전하게 복원합니다.
- README와 UX 문서를 새 인터랙션(END 신호, RESET 버튼) 기준으로 갱신했습니다.

## Next Step

## Current Snapshot
- 장치는 항상 0°에서 스윕을 시작하고 종료 후에도 각도를 초기화하며 `END` 메시지로 완료를 알립니다.
- 웹앱은 RESET 버튼을 통해 언제든 측정 히스토리를 비우고 상태를 초기화할 수 있으며, Mock 모드도 동일한 흐름을 재현합니다.

## Migration Plan
### Reuse (as-is)
- `vendor/chart.umd.js`, `js/dialog-polyfill.js`, `js/utils/format.js`, `js/utils/malusFit.js` 등 공용 모듈은 그대로 유지한다.

### Adapted
- `index.html`/`styles.css`: 측정 제어 섹션에 스윕/RESET 이중 버튼과 상태에 따른 비활성화를 구현.
- `js/state.js`: `measurementStatus`와 `resetMeasurement` 흐름을 도입해 버튼 상태와 히스토리/피팅 초기화를 일괄 관리.
- `js/bluetooth.js`: `END` 메시지 처리를 염두에 둔 단일 명령 흐름을 유지하며, RESET 송신은 기존 함수 재사용.
- UI 모듈(`connection-panel`, `measurement-controls`, `intensity-chart`, `fit-summary`, `data-log`, `banner`)을 종료 신호·오류 상태에 맞게 업데이트.
- Mock 텔레메트리를 실제 장치와 동일하게 `running → idle` 상태 전환이 이뤄지도록 조정.

### New / Remaining
- 통합 테스트 체크리스트 및 오류 처리 가이드 작성.
- 반복 스윕, 메모, 보고서 내보내기 등 교사용 확장 기능 기획.
- 실제 장치 연결 시 예외 상황(연결 실패, 데이터 누락) 대응 전략 수립.

### Procedure Outline
1. 스윕/RESET 안정화 흐름을 실장 장치에서 검증하고 경계 조건(중복 명령, 연결 끊김)을 체크한다.
2. 종료 타임아웃 및 오류 배너 정책을 정의하고 문서화한다.
3. 반복 스윕·교사용 확장 요구를 다시 정리해 다음 단계 계획을 수립한다.

## On Deck (after Next Step)
- 테스트 체크리스트 기반의 QA 실행 및 자동화 도구 검토.
- 교사용 확장 기능 프로토타입 설계.
- 문서 및 배포 흐름 정비.

## Notes / Open Questions
- 피팅 최소 샘플 수(현재 12개)와 메시지 문구를 수업 맥락에 맞게 조정할 필요가 있는가?
- Mock 데이터의 위상/노이즈 파라미터를 어떻게 다양화할지 결정 필요.
- 실제 장치에서 스윕 도중 통신 장애가 발생하면 어떻게 복구할지 전략이 필요함.
