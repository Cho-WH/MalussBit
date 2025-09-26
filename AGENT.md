# AGENT Guide

> 상세 코딩 단계는 항상 `docs/detailed-coding-plan.md`에 기록하며, 이 문서는 **다음 스텝**의 구체적인 작업 지침만 포함합니다. 다음 스텝을 완료하면 여기에서 새 스텝을 정의하고, 세부 계획 문서도 그 스텝에 맞춰 갱신하세요.
> 전체 구조와 흐름은 `docs/ux-plan.md`와 `docs/development-plan.md`를 기준으로 하며, 모든 다음 스텝 계획은 반드시 두 문서를 교차 참조하여 작성합니다.

## Last Update
- MakeCode 펌웨어 초안(`firmware/v1.0-mal.js`)을 작성해 `SWEEP`/`STOP`/`RESET` 명령과 50ms 간격의 `timestamp,angle,,light` 데이터 스트림을 구현했습니다.
- 펌웨어는 스윕 진행/완료/중단 시 `MSG:` 메시지를 전송해 웹앱의 자동 분석 및 오류 안내와 연동되도록 설계되었습니다.
- 웹앱 쪽에서는 3단계 UX·BLE 제어·자동 피팅이 완료된 상태로, 펌웨어 데이터 계약을 소비할 준비가 된 상황입니다.

## Next Step
- `docs/firmware-implementation-plan.md`와 `docs/development-plan.md` 5장을 참고하여 펌웨어-웹앱 통합 테스트를 수행하고, 명령/데이터 계약과 플래시 절차를 문서화합니다. 세부 계획은 `docs/detailed-coding-plan.md` 확인.

## Current Snapshot
- 웹앱은 3단계 UX와 BLE 제어, 자동 피팅을 지원하며, 펌웨어에서 전송되는 스윕 데이터와 제어 메시지를 처리할 준비가 되었습니다.
- MakeCode 펌웨어 초안이 존재하지만 실제 장비 검증, 오류 처리 문서화, 배포 절차 정리 등은 미완료입니다.
- 실험 노트/고급 옵션/메시지 큐 등 보조 UX 기능은 추후 단계로 보류 중입니다.

## On Deck (after Next Step)
- 측정 결과 공유/리포트 기능 설계.
- 보조 UX 기능(실험 노트, 고급 설정) 재도입.
- 국제화 및 접근성 세부 조정 검토.

## Notes / Open Questions
- SWEEP 기본 파라미터(범위, 지속 시간, 샘플링 주기)에 대한 확정 및 문서화 필요.
- 피팅 검증용 실제 데이터 수집과 평가 전략을 마련해야 합니다.
- 하드웨어 확보 일정과 검증 담당자를 지정해야 합니다.
