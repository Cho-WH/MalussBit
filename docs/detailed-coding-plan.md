# MalussBit Detail Coding Plan — Next Step

## Focus
- 목표: 스윕 종료 신호·RESET 흐름을 도입해 장치/웹앱 모두 안정적으로 재측정이 가능하도록 만든다.
- 범위: 펌웨어 MakeCode 스크립트, 웹앱 상태/버튼 제어, UI RESET 컨트롤 추가.
- 제외: 피팅 로직 개편, 그래프/스타일 변경, Mock 데이터 다양화.

## detailed plan
1. 펌웨어 종료/RESET 로직 정비
   - `performSweep` 내부에 `angle`을 지역 변수로 선언하거나 시작 시 0으로 재설정한다.
   - 스윕 루프 실행 중 `RESET`/`STOP` 명령을 감지할 수 있도록 플래그를 도입하고, 수신 시 즉시 루프를 탈출해 서보를 시작 각도로 돌린다.
   - 스윕 완료 시 `END`(또는 합의된 키워드) 메시지를 BLE로 전송하고, 루프 종료 직후 `angle`/플래그 등 내부 상태를 초기화한다.

2. 웹앱 스윕 상태 관리/버튼 제어
   - `state.js`에 `measurementStatus`(예: `idle | running | resetting | error`) 필드를 추가하고 기본값을 `idle`로 둔다.
   - `measurement-controls`에서 스윕 명령 발송 시 상태를 `running`으로 전환하고 버튼을 잠근다.
   - BLE 수신 핸들러에서 `END` 메시지를 구분하여 상태를 `idle`로 되돌리고 버튼을 재활성화한다. 타임아웃 혹은 연결 끊김 시에도 안전하게 복원한다.

3. RESET UI 및 흐름
   - 측정 컨트롤 영역에 `RESET` 버튼을 추가하고 `sendResetCommand` 호출과 함께 스토어 상태를 `resetting` → `idle`로 전환한다.
   - RESET 과정에서 히스토리/피팅 결과를 정리하고, `END` 수신 없이도 버튼이 재활성화되도록 방어 로직을 넣는다.
   - 연결이 끊기면 스토어를 `reset` 액션으로 초기화하고 두 버튼 상태를 동기화한다.
