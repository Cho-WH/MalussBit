# MalussBit Detail Coding Plan — Next Step

## Focus
- 목표: `docs/firmware-implementation-plan.md`와 `docs/development-plan.md` 5장을 참고해 펌웨어-웹앱 통합 테스트를 수행하고, 명령/데이터 계약 및 플래시 절차를 문서화한다.
- 범위: 펌웨어 빌드·플래시 검증, SWEEP/STOP 명령 시나리오 테스트, 데이터 로그 확인, 문서 업데이트.
- 제외: 보정/고급 설정, UX 확장, 자동 배포 스크립트 등은 후속 단계에서 처리한다.

## Outputs
1. **통합 테스트 리포트**
   - `SWEEP,0,180,6000` 등 표준 시나리오 실행 결과 기록.
   - STOP/재연결/에러 케이스 로그.
2. **문서 업데이트**
   - `docs/firmware-implementation-plan.md`에 실제 핀, 샘플링 주기, 메시지 목록, 테스트 결과 추가.
   - README 또는 `firmware/firmwareREADME.md`에 플래시 가이드, 요구 부품, 주의사항 정리.
3. **버그 피드백**
   - 테스트 중 발견된 문제를 이슈화하거나 TODO로 기록.

## Task Breakdown

### 1. 테스트 준비
- MakeCode 편집기에서 `firmware/v1.0-mal.js` 가져와 빌드/플래시 절차 정리.
- 서보/조도 센서 배선 확인, 각도/조도 범위 초기 추정.

### 2. 명령 시나리오 실행
- 기본 스윕: `SWEEP,0,180,6000` → 그래프/데이터 확인.
- 짧은 스윕: `SWEEP,30,120,4000`.
- STOP 명령 중도 중단 테스트.
- 잘못된 파라미터(`SWEEP,0,200,300`) → 오류 메시지 확인.
- BLE 연결 해제 후 상태 리셋 동작 점검.

### 3. 데이터 검증
- 수신 로그 저장(`timestamp,angle,,light`) → 각도 진행률/조도 일관성 확인.
- `MSG:` 메시지 타이밍과 웹앱 반응 확인.

### 4. 문서화
- 테스트 결과/이슈를 `docs/firmware-implementation-plan.md`와 `firmware/firmwareREADME.md`에 반영.
- 플래시 가이드를 README에 추가(예: MakeCode 프로젝트 링크, 버튼 조작 순서).

## Acceptance Criteria
- 통합 테스트를 통해 SWEEP/STOP/에러 시나리오가 정상 동작함을 확인하고 로그를 남겼다.
- 문서가 실제 장비 세팅·플래시·테스트 절차를 포함하도록 업데이트되었다.
- 문제점이 발견되면 추후 작업을 위한 TODO/이슈로 명확히 기록되었다.

## Open TODOs for Future Steps
- 고급 설정/보정 명령 확장 검토.
- UX 보조 기능 재도입.
- 펌웨어 버전 관리 및 배포 자동화 전략 마련.
