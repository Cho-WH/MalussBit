# MalussBit 개발 계획 (v0.1 초안)

- 작성자: (작성자 입력)
- 작성일: (작성일 입력)
- 참조 문서: “말루스의 법칙 실험 장비 및 웹앱 구상 (micro:bit)” 초안

---

## 1. 프로젝트 개요

상세 구현 순서는 `docs/detailed-implementation.md`에서 단계별로 확인할 수 있습니다.

MalussBit는 micro:bit v2, 서보모터, 편광 필름, 내장 조도 센서를 이용해 말루스의 법칙 \(I = I_0 \cos^2(\theta + \phi_0)\)을 검증할 수 있는 실험 장비 및 웹 애플리케이션입니다. 이 저장소는 기존 MagnetometerBit 웹앱의 구조와 유틸리티를 재사용해 말루스 실험에 맞춘 UI/데이터 파이프라인을 구축하는 것을 목표로 합니다.

## 2. 재사용 및 차용 요소

| 영역 | 재사용 대상 | 메모 |
| --- | --- | --- |
| UI 레이아웃 | `index.html`, `styles.css` | 레이아웃, 컬러, 폰트 등 기본 뼈대를 유지하되 컴포넌트 내용은 말루스 실험에 맞춰 개편 |
| Web Bluetooth | `js/bluetooth.js` | Nordic UART 연결 및 Notification 파이프라인 로직 재사용. 명령 전송 API는 신규 정의 필요 |
| 대화상자 폴리필 | `js/dialog-polyfill.js` | 동일하게 재사용 |
| 유틸리티 | `js/utils/format.js`, `js/utils/csv.js` | CSV 유틸은 각도/조도 컬럼으로 수정 완료, 추가 변환 함수는 향후 확장 |
| 외부 라이브러리 | `vendor/chart.umd.js` | 차트 렌더링용 Chart.js 번들 유지 |
| 펌웨어 참고 | `firmware/v1.1-mg-reference.js` | MagnetometerBit v1.1 스크립트 사본. 데이터 포맷/구조 파악용 참고 자료 |

추후 MagnetometerBit에서 참고할 추가 컴포넌트 후보:
- `js/ui/connection-panel.js`: 상태 관리 및 연결 흐름 로직 참고용 (직접 복사 대신 말루스용으로 재작성)
- `js/state.js`: 전역 스토어 패턴 재사용 가능 (필드 재정의 필요)
- `js/ui/banner.js`, `js/ui/data-log.js`: 데이터 바인딩 패턴 참고

## 3. 남은 구현 항목 (우선순위별)

1. **상태 관리 및 데이터 모델**
   - 전역 상태 구조 설계: `connectionStatus`, `servoConfig`, `latestSample`, `history` (angle/light), `fitResult` 등 정의
   - 샘플 파서 구현: `ms,angle_cmd[,angle_est],light` 포맷 처리, 숫자/결측 예외 대응

2. **BLE 상호작용 확장**
   - `bluetooth.js`에 일반 텍스트 송신 (`writeLine`) 및 펌웨어 제어 명령 래퍼 추가
   - 연결/해제 시 상태 업데이트, 오류 메시지 처리 로직 구축

3. **UI 컴포넌트 구현**
   - 연결 패널: 버튼 상태, 타임스탬프, 오류 표시 (MagnetometerBit 로직 참고)
   - 실시간 통계 카드: 조도/각도 현재값 업데이트
   - 차트 영역: Chart.js 기반 light vs angle 산점도, time-series 보조 차트 설계
   - 데이터 로그 테이블: 최근 N개 샘플 표시 및 `downloadCsv` 연동
   - 피팅 결과 표시 및 보정 파라미터 입력 UI (angle zero/scale, SERVO_SPEED_DEG_S 등)

4. **데이터 분석 기능**
   - Malus 모델 \(S(\theta) = A \cos^2(\theta + \phi_0) + B\) 피팅 알고리즘 구현 (초기 그리드 + 국소 탐색)
   - 정규화 옵션, 잔차/결정계수 계산, 결과 표시

5. **펌웨어 연동 고려 사항 (문서 차원)**
   - UART 전송 레이트 및 명령 응답 프로토콜 정리
   - 서보 스윕 파라미터 (속도, 각도 범위)와 샘플링 주기 설정
   - 향후 펌웨어 저장 위치 및 배포 절차 정의 (MakeCode/TypeScript 스크립트 포함 예정)
   - `v1.1-mg-reference.js`에서 데이터 포맷/블루투스 처리 패턴을 추출해 MalussBit 전용 스크립트 설계

6. **교육용 기능**
   - 수업 모드 vs 전문가 모드 UI 토글
   - 실험 메모/결과 공유 기능(간단한 노트 저장 또는 Markdown 내보내기)

## 4. 개발 로드맵 제안

| 단계 | 목표 | 주요 산출물 |
| --- | --- | --- |
| 1단계 | BLE 연결 및 데이터 수집 파이프라인 | 상태 스토어, 연결 패널, CSV 파서/버퍼, 기본 로그 |
| 2단계 | 실시간 시각화 | light vs angle 산점도, 시간축 그래프, 통계 카드 |
| 3단계 | 피팅 및 보정 도구 | 말루스 모델 피팅 모듈, UI 컨트롤, 결과 표시 |
| 4단계 | 수업 지원 기능 | 데이터 다운로드 개선, 이미지 캡처(선택), 수업 모드 인터랙션 |
| 5단계 | 품질 보증 | 브라우저 호환성 테스트, ESLint/Prettier 설정(필요 시), 접근성 체크 |

## 5. 문서화 및 후속 작업

- 펌웨어 스펙 문서: UART 데이터 포맷, 서보 제어 명령 세부사항, 캘리브레이션 절차 정리
- 실험 가이드: 장비 구성, 수업 운영 시나리오, 평가 루브릭 (초안 문서 기반 확장)
- 변경 이력 관리: 주요 기능 단위로 README 및 문서 업데이트

---

> **주의:** 이 디렉터리는 아직 초기 골격만 포함합니다. 실제 기능 구현 시에는 해당 계획을 참고해 단계적으로 모듈을 추가하고 테스트를 병행하세요.
