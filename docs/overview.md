# MalussBit 프로젝트 개요(Overview)

목적: 프로젝트에 참여한 신규 개발자가 코드의 큰 구조와 흐름을 파악하고, 특정 변경 작업 시 어떤 파일을 손대야 하는지 빠르게 결정할 수 있게 합니다.

## 1) 무엇을 만드는가
- micro:bit v2 + 서보모터 + 내장 조도 센서로 말루스의 법칙을 계측하고, 브라우저(Web Bluetooth)에서 연결·스윕·시각화·피팅까지 제공하는 정적 웹앱입니다.
- 단일 스윕(0→180°)으로 각도/조도 데이터를 수집하고, cos² 모델로 자동 피팅해 A, B, φ₀, R²를 보여 줍니다.

## 2) 개발/실행 빠른 시작
- Mock 모드: `index.html?mock=1` 로 열면 장치 없이 스윕/피팅 흐름을 재현할 수 있습니다.
- 실제 장치: micro:bit에 `firmware/v1.0-mal.js` 플래시 → 페이지에서 “디바이스 연결” → 자동 RESET → “스윕 실행”.
- 로컬 접속은 Web Bluetooth 제약상 `https://` 또는 `http://localhost` 에서만 동작합니다. 간단한 정적 서버를 사용하세요.(예: VSCode Live Server 등)

## 3) 전체 아키텍처(요약)
- 정적 웹 프런트엔드만으로 구성됩니다. 번들러 없이 ES 모듈을 직접 로딩합니다.
- 전역 상태는 경량 스토어(`js/state.js`)로 관리하며, UI 모듈은 모두 `initXxx()` 패턴으로 구독/렌더합니다.
- 장치 통신은 `js/bluetooth.js`가 담당하고, 텍스트 기반 BLE UART로 줄 단위 데이터를 처리합니다.
- 차트는 Chart.js(UMD)를 직접 로딩합니다.

## 4) 디렉터리/파일 지도(역할 중심)
- 루트 자산
  - `index.html`: 레이아웃/스크립트 로딩 진입점
  - `styles.css`: 공용 스타일
- 애플리케이션 코드(`js/`)
  - 코어: `app.js`(부트/정리), `state.js`(스토어/액션), `bluetooth.js`(Web Bluetooth)
  - UI: `ui/banner.js`, `ui/connection-panel.js`, `ui/measurement-controls.js`, `ui/intensity-chart.js`, `ui/fit-summary.js`, `ui/data-log.js`
  - 유틸: `utils/malusFit.js`, `utils/parseSample.js`, `utils/csv.js`, `utils/format.js`
  - 모의: `mockTelemetry.js`
- 장치 코드(`firmware/`)
  - `v1.0-mal.js`: 프로젝트용 펌웨어(서보 스윕/조도 샘플 전송)
  - `*-reference.js`: 과거 프로젝트 참고용 스크립트
- 외부 라이브러리(`vendor/`)
  - `chart.umd.js`: Chart.js UMD 빌드

## 5) 런타임 데이터 파이프라인
- 장치→앱: BLE UART 문자 라인 수신 → `js/ui/connection-panel.js`의 라인 핸들러 → `js/utils/parseSample.js`로 CSV 파싱 → `js/state.js`에 샘플 축적
- 앱 내 처리: `fit-summary`가 자동/수동 피팅 실행(`js/utils/malusFit.js`) → 차트(`intensity-chart`)에 곡선 오버레이 → 로그/CSV(`data-log`)
- 종료: 펌웨어 `END` 수신 시 `measurementStatus`를 `idle`로 복귀, 버튼 상태 업데이트

## 6) 상태 모델(State) 핵심
- 주요 필드
  - `connectionStatus`: `disconnected | connecting | connected`
  - `measurementStatus`: `idle | running | resetting`
  - `history`, `latestSample`, `lastUpdatedAt`
  - `fit`: `{ status, result, error }`
- 주요 액션
  - 연결: `setStatus`, `setDevice`, `reset`
  - 샘플: `setSample`, `clearHistory`, `resetMeasurement`
  - 측정: `setMeasurementStatus`
  - 피팅: `setFitStatus`
  - 오류: `setError`
- 세부 리듀서/구독 패턴
  - 샘플 축적: `setSample(sample)`은 `latestSample` 갱신과 함께 `history`에 푸시하고, `HISTORY_LIMIT=400`을 넘으면 앞에서 절단합니다. 수신 시각은 `sample.timestamp`를 `lastUpdatedAt`으로 저장하며, 이 시점에 `errorMessage`는 클리어됩니다.
  - 피팅 상태: `setFitStatus({ status, result?, error? })`는 `result`를 생략할 경우 기존 결과를 유지합니다. 실행 전 `running`, 성공 시 `success+result`, 실패 시 `idle+error`로 전환합니다.
  - 측정 리셋: `resetMeasurement()`는 `latestSample/history/lastUpdatedAt`을 비우고 피팅 상태(`fit`)와 `errorMessage`를 초기화합니다. 반면 `clearHistory()`는 데이터만 비우고 기존 피팅 결과는 유지합니다.
  - 연결/리셋: `reset()`은 초기 상태로 완전 복구합니다(연결/디바이스/서비스/측정 상태 포함). 연결 패널 단절 처리 시 `reset()`과 `setStatus('disconnected')`를 함께 호출합니다.
  - 디스패치/구독: `store.subscribe(listener)`는 즉시 1회 현재 상태를 전달하고 언서브스크립션 함수를 반환합니다. `dispatch`는 유효하지 않은 액션을 무시하며, 리듀서 결과가 참조 동등성이 달라질 때만 `notify()`를 통해 모든 리스너를 호출합니다.
  - 상태 불변성: 리듀서는 기존 상태를 변경하지 않고 얕은 복사로 새 상태를 작성합니다. UI는 `connectionStatus/measurementStatus/errorMessage/fit/history`를 구독해 렌더를 제어합니다.
  - UI 불변식: `measurementStatus='running'|'resetting'` 동안 시작/리셋 버튼을 상태 기반으로 비활성화해 중복 명령을 방지합니다. 펌웨어의 `END` 수신 시 `measurementStatus`를 `idle`로 되돌립니다.

## 7) 통신 프로토콜(BLE UART)
- 서비스 UUID: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`(Nordic UART)
- 명령(앱→장치)
  - `SWEEP`: 0→180° 스윕 수행, 각 스텝 샘플 전송
  - `RESET`: 스윕 중단 및 0° 복귀, 내부 상태 초기화
- 메시지(장치→앱)
  - 샘플 CSV: `timestamp_ms,angle_cmd,light`
  - 종료 신호: `END`(스윕 종료/RESET 완료 시)
- 특성/알림 처리(실장 상세)
  - 디바이스 선택: `requestDevice()`는 `namePrefix`가 `BBC micro:bit|micro:bit|BBC microbit`인 장치만 필터링, `optionalServices`에 UART 서비스(UUID: `6e400001-...`)를 요청합니다.
  - 특성 탐색: `connect()`에서 `getPrimaryService(UART)` 후 `getCharacteristics()`로 열거, 각 특성의 `properties`와 CCCD(`00002902-0000-1000-8000-00805f9b34fb`) 존재 여부로 기능을 분류합니다.
    - TX(쓰기) 특성: `write|writeWithoutResponse` 속성 중 하나라도 있으면 후보로 채택.
    - RX(알림) 특성: `notify|indicate` 플래그 또는 CCCD 존재 시 후보로 채택.
    - 폴백: 위에서 찾지 못하면 UUID 고정값(TX=`6e400002-...`, RX=`6e400003-...`)으로 재탐색합니다. 최종 미발견 시 명확한 에러를 throw 합니다.
  - 알림 수신: `startNotifications(listener)`에서 RX 특성에 `characteristicvaluechanged`를 바인딩하고 알림을 시작합니다. 바이트 스트림은 `TextDecoder`로 UTF‑8 디코딩 후 내부 버퍼에 축적, `\n` 기준으로 라인 분할하고 끝의 `\r` 제거·`trim()` 뒤 비어 있지 않은 라인만 콜백에 전달합니다.
  - 송신 규칙: `sendSweepCommand()`는 `SWEEP\n`, `sendResetCommand()`는 `RESET\n`을 TX로 전송합니다. Mock 모드에서는 동일한 API가 `window.__malussMock.startSweep/reset`를 우선 호출합니다.
  - 단절 처리: 하드 단절 시 `gattserverdisconnected` 이벤트를 받아 RX 알림 해제→GATT disconnect→내부 레퍼런스 초기화→외부 단절 리스너 호출 순으로 종료합니다. 앱 측에서는 이를 받아 상태를 `disconnected`로 전환하고 초기화합니다.
  - 명령 호환: 펌웨어는 `STOP` 명령도 `RESET`과 동등하게 수용하지만, 앱은 호환성 단순화를 위해 `RESET`만 송신합니다.

## 8) 모듈 카탈로그(편집 포인트 중심)

- 코어
  - `js/app.js`
    - 역할: 앱 부트스트랩, 모듈 초기화/정리, Mock 모드 주입
    - 편집 포인트: 시작 파라미터 추가, 모듈 초기화 순서 변경, 글로벌 이벤트 바인딩
    - 상세:
      - 초기화 순서: `banner` → `connection-panel` → `measurement-controls` → `intensity-chart` → `fit-summary` → `data-log` (각 `initXxx()`가 정리 함수를 반환하고 내부 `cleanupTasks`에 등록됨)
      - URL 파라미터: `?mock=`에 대해 `1|true|yes`(대소문자 무시)만 참으로 인식. 참이면 `initMockTelemetry()` 호출해 Mock 인터페이스(`window.__malussMock`)를 주입
      - 정리 타이밍: `beforeunload`에서 등록된 모든 정리 함수를 FIFO로 호출(에러는 콘솔 경고로만 기록)
      - 부수효과: 전역 스토어에 직접 접근하지 않음. 초기화와 정리, Mock 주입만 담당
      - 이벤트 바인딩: `DOMContentLoaded` 시점에 `boot()` 등록
  - `js/state.js`
    - 역할: 전역 상태/리듀서/액션, 구독/알림
    - 편집 포인트: 새로운 상태 필드/액션 추가, 히스토리 용량 조정, 초기값 변경
    - 상세:
      - 상태 필드: `connectionStatus`, `device/service/txCharacteristic`, `latestSample`, `history[]`, `fit{status,result,error}`, `lastUpdatedAt`, `errorMessage`, `measurementStatus`
      - 히스토리: `HISTORY_LIMIT=400` 유지. `setSample` 시 `appendSample`로 제한 슬라이딩(초과분 앞에서 절단) 및 `lastUpdatedAt=sample.timestamp` 갱신, `errorMessage` 초기화
      - 피팅 상태: `setFitStatus({status,result?,error?})`는 `result` 생략 시 기존 결과 유지. `resetMeasurement`는 히스토리/피팅/오류 초기화. `clearHistory`는 피팅 유지한 채 데이터만 비움
      - 리셋: `reset` 액션은 초기 상태로 완전 복귀(연결 정보 포함). `subscribe`는 즉시 1회 호출 후 언서브스크립션 함수 반환
      - 액션 목록: `setStatus/setDevice/setSample/setFitStatus/setMeasurementStatus/setError/clearHistory/resetMeasurement/reset`
  - `js/bluetooth.js`
    - 역할: 장치 검색/연결/해제, 알림 수신, 라인 버퍼링, 명령 송신
    - 편집 포인트: 새로운 BLE 명령 추가, 라인 파서 규칙 변경, 연결 처리 정책/타임아웃 추가
    - 상세:
      - UART 서비스: `6e400001-...` 사용. 특성은 속성 검사(`write|writeWithoutResponse`, `notify|indicate`)와 CCCD 존재로 분류하고, 부족 시 알려진 UUID(TX/RX) 폴백
      - 연결 수명주기: `requestDevice`에서 micro:bit namePrefix 필터 후 `gattserverdisconnected` 리스너 부착 → `connect`에서 서비스/특성 확보 → 실패 시 명확한 에러 메시지로 throw
      - 알림 처리: `TextDecoder`로 청크 결합 → `\n` 기준 라인 분할 → 끝의 `\r` 제거 후 `trim()` → 비어있지 않은 라인만 상위 콜백에 전달
      - 라인 수신 시작/중단: `startNotifications(listener)`가 내부 리스너 저장 및 시작, `stopNotifications()`는 버퍼 초기화와 이벤트 제거를 함께 수행
      - 명령 송신: `sendSweepCommand()/sendResetCommand()`는 `window.__malussMock` 존재 시 실제 BLE 대신 Mock의 `startSweep()/reset()` 호출. 실제 전송 시 줄바꿈 포함해 TX에 기록
      - 디스커넥트: 알림 중지→GATT 디스커넥트→내부 상태 초기화→콜백 통지. 외부에서 `setDisconnectedListener`로 단절 이벤트 구독 가능

- UI
  - `js/ui/connection-panel.js`
    - 역할: 연결 UI, 상태/시간/오류 표시, 라인 핸들러 진입점(`END` 처리 포함)
    - 편집 포인트: 연결 흐름 변경, 초기 RESET 정책, 오류 메시지/도움말
    - 상세:
      - DOM: 루트 `[data-component="connection-panel"]`, 상태/시간 바인딩(`data-bind=status/last-updated/relative-time/error`), 버튼(`data-action=connect|disconnect`), 지원 브라우저 다이얼로그(id `supported-browsers-dialog` + `data-action=show-supported`)
      - 지원 안내: Web Bluetooth 미지원 시 helper 텍스트로 가이드 표시. 다이얼로그 폴리필이 있으면 등록해 접근성 유지
      - 연결 흐름: 클릭→`setStatus('connecting')`→`requestDevice()`→`connect()`→`setDevice(...)`→`startNotifications(handleLine)`→`setMeasurementStatus('resetting')`→`sendResetCommand()`→`resetMeasurement()`→`setStatus('connected')`
      - 라인 핸들러: `END` 수신 시 `measurementStatus='idle'` 및 오류 해제. 그 외 CSV 라인은 `parseSample`로 파싱해 `setSample`
      - 단절 처리: `setDisconnectedListener`로 하드 단절 수신 시 `reset()`+`setStatus('disconnected')`. 사용자가 직접 끊은 경우(플래그)만 오류 배너 미표시
      - 버튼 상태: 내부 `isBusy`와 `connectionStatus`로 활성화 제어. 상대 시간 라벨은 1초 간격으로 `formatRelative` 갱신
  - `js/ui/measurement-controls.js`
    - 역할: 스윕/RESET 버튼 상태머신 제어
    - 편집 포인트: 버튼 활성화 규칙, 중복 방지 로직, 진행중 표시
    - 상세:
      - 버튼 규칙: `connected & idle`일 때만 스윕 가능. RESET은 `connected`이며 `resetting`이 아닐 때 가능
      - 스윕: 오류 초기화→`resetMeasurement()`→`setMeasurementStatus('running')`→`sendSweepCommand()`(실패 시 `idle`로 되돌리고 오류 배너)
      - RESET: 오류 초기화→`setMeasurementStatus('resetting')`→`sendResetCommand()`→`resetMeasurement()`(실패 시 `idle` 및 오류 배너)
      - 중복 방지: 상태 기반 비활성화로 연속 클릭/경합 차단
  - `js/ui/intensity-chart.js`
    - 역할: 실시간 산점도, 피팅 곡선 오버레이
    - 편집 포인트: 스타일/축/툴팁, 곡선 샘플링 전략, 데이터 매핑
    - 상세:
      - 의존성: 전역 `window.Chart`(UMD). 미존재 시 사용자에게 에러 문구 표시 후 조기 종료
      - 데이터셋: 0번 산점도(실측), 1번 선형(피팅). 피팅은 결과 없으면 `hidden`
      - 곡선 생성: 데이터 각도 범위[min,max] 기반, 스텝 수 60~240 사이 자동 결정, `fitResult.predict(angle)`로 y 계산
      - 서브타이틀: `samples.length`와 성공 시 `R²`를 같이 표시. 툴팁은 각도/조도를 `formatNumber`로 포맷
      - 업데이트: 상태 변경마다 `chart.update('none')`로 즉시 반영, 빈 상태에서는 안내 문구 노출
  - `js/ui/fit-summary.js`
    - 역할: 자동/수동 피팅 트리거, 결과 표시
    - 편집 포인트: 최소 샘플/범위 기준, 메시지 정책, 자동 실행 조건
    - 상세:
      - 기준: 최소 `12` 샘플, 유효 각도 범위가 `>= 60°`일 때만 실행 가능(`hasSufficientCoverage`)
      - 자동 실행: 데이터 시그니처(`length:firstTs:lastTs`)가 바뀌고 실행 가능하면 150ms 지연 후 자동 피팅. 진행 중엔 버튼/자동 실행 모두 차단
      - 결과 표시: A/B/φ₀/R² 숫자 포맷팅, 메시지는 진행/성공/부족/오류 상황별로 안내
      - 상태 동기화: 실행 전 `setFitStatus('running')`, 성공 시 결과+시그니처를 `success`로 저장, 실패 시 `error`와 함께 `idle`로 복귀 및 전역 오류 배너 업데이트
  - `js/ui/data-log.js`
    - 역할: 최근 로그 테이블, CSV 다운로드
    - 편집 포인트: 열 구성/포맷, 다운로드 포맷, 행 수 제한
    - 상세:
      - 렌더링: 최신 N(기본 12)개 역순 표시. 시간은 `formatTimestamp`, 숫자는 `formatNumber` 적용
      - 비어있음: 데이터 없으면 1행 안내 문구 출력, 다운로드 버튼 비활성화
      - CSV: 버튼 클릭 시 전체 히스토리를 `utils/csv.downloadCsv`로 저장(BOM 포함, 기본 파일명 `malussbit-log.csv`)
  - `js/ui/banner.js`
    - 역할: 지원/오류/Mock 배너 표시
    - 편집 포인트: 경고 조건, 메시지 텍스트, 다국어
    - 상세:
      - 구조: `#banner-root` 아래 `data-role`로 배너 식별(`support-warning`, `mock-info`, `runtime-error`). 있으면 업데이트, 없으면 생성
      - 지원 경고: Web Bluetooth 미지원 환경에서 경고 배너 1회 고정 출력
      - Mock 안내: `?mock` 활성화 시 정보 배너 출력
      - 런타임 오류: `state.errorMessage` 구독해 동적으로 에러 배너 토글

- 유틸/모의
  - `js/utils/malusFit.js`
    - 역할: cos² 모델 선형화/최소제곱, `predict` 제공
    - 편집 포인트: 로버스트화, 파라미터 바운드, 품질지표 확장
    - 상세:
      - 모델: I(θ) = B + A·cos²(θ+φ). 선형화로 `1, cos(2θ), sin(2θ)` 기저를 사용해 정규방정식으로 3계수(c0,c1,c2) 추정
      - 해법: 대칭 3×3 역행렬 직접 계산(`invertSymmetric3`) 후 계수 벡터 산출, 특이 시 피팅 실패 처리
      - 파생값: `amplitude=2·sqrt(c1²+c2²)`, `offset=c0-sqrt(c1²+c2²)`, `phaseDeg=normalize([-180,180])`, `r2`, `residuals`, `sampleCount`
      - API: `fitMalus(samples,{minSamples=12}) -> { ok, result|error }`, `result.predict(angleDeg)`로 예측값 계산
  - `js/utils/parseSample.js`
    - 역할: CSV → `{ timestamp, deviceTimestamp, angleCmd, illuminance }`
    - 편집 포인트: 포맷 확장(`angle_est` 등), 유효성/정규화 정책
    - 상세:
      - 입력: 문자열 `timestamp_ms,angle_cmd,light`(최소 3세그먼트). 공백 트리밍 후 유한수만 채택
      - 출력: `timestamp=Date.now()`(수신 시각), `deviceTimestamp`(장치 밀리초), `angleCmd`(도), `illuminance`
      - 실패: 항목 누락/NaN 시 `null` 반환하여 호출자가 무시 가능
  - `js/utils/csv.js`, `js/utils/format.js`
    - 역할: CSV 빌더/다운로드, 숫자/시간 포맷
    - 편집 포인트: 구분자/헤더, 지역화 포맷
    - 상세:
      - CSV: 헤더 `timestamp,angle_cmd,illuminance`. ISO 시각으로 직렬화, UTF-8 BOM 포함 Blob을 a-tag 클릭으로 다운로드
      - 포맷: `formatTimestamp`는 로컬 타임 문자열, `formatNumber(value,digits)`는 고정소수, `formatRelative`는 `Xs/Xm/Xh 전` 또는 `방금`
  - `js/mockTelemetry.js`
    - 역할: Mock 스윕 생성기(노이즈/위상 포함)
    - 편집 포인트: 파라미터 다양화, 시나리오 모드 추가
    - 상세:
      - 동작: 연결 상태를 강제로 `connected`로 설정 후, `startSweep()`에서 0→180°를 50ms 간격·1° 스텝으로 진행하며 샘플 발행
      - 파라미터: `amplitude=40`, `offset=10`, `phaseDeg=15`, 잡음 U(-1.5,1.5), 음수는 하한 0으로 클램프
      - 인터페이스: `window.__malussMock = { startSweep, reset }` 주입. BLE 명령 함수들이 존재 시 이를 우선 호출
      - 정리: init 반환 정리 함수가 전역 인터페이스를 제거

- 펌웨어(`firmware/v1.0-mal.js`)
  - 역할: `SWEEP` 시 0→180° 스윕, 각 스텝 CSV 전송, `RESET`/`STOP` 처리 후 0° 복귀, 종료 시 `END`
  - 편집 포인트: 스텝 간격/속도, 각도 범위, 포맷, 종료 신호 정책
  - 상세:
    - 인터페이스: BLE UART 수신 라인 기준 명령 파싱. `SWEEP` 수신 시 큐에 등록, 백그라운드 루프에서 실행. `RESET|STOP` 수신 시 즉시 취소/대기 상태 진입
    - 샘플 포맷: `millis,angle,lightLevel()` 형태로 `\n` 종결. 샘플 간 지연 50ms, 각도 1° 스텝
    - 스윕 완료/리셋: 서보 P1을 0°로 복귀시키고 `END` 한 줄 전송. BLE 단절 발생 시 `control.reset()`로 재가동
    - 파라미터: `SWEEP_START_DEG=0`, `SWEEP_END_DEG=180`, `SAMPLE_INTERVAL_MS=50`, `SWEEP_STEP_DEG=1`(고정 상수)

## 9) 작업 유형별 “어디를 고치나” 가이드
- BLE 명령/프로토콜을 바꾸고 싶다
  - `js/bluetooth.js`(명령 송신/라인 처리), `js/ui/connection-panel.js`(라인 핸들러), 필요 시 `js/utils/parseSample.js`(포맷)
- 샘플 포맷에 필드 추가(`angle_est` 등)
  - `js/utils/parseSample.js`(파싱) → `js/state.js`(히스토리 구조 유지/확장) → 소비자(`intensity-chart`, `data-log`, `fit-summary`)
- 피팅 알고리즘/기준 변경
  - `js/utils/malusFit.js`(로직) → `js/ui/fit-summary.js`(실행 조건/표시) → `js/ui/intensity-chart.js`(곡선 계산)
- 차트/스타일/툴팁 수정
  - `js/ui/intensity-chart.js`, `styles.css`
- 버튼/상태머신/오류 메시지 정책 변경
  - `js/ui/measurement-controls.js`, `js/ui/connection-panel.js`, `js/state.js`, `js/ui/banner.js`
- Mock 시나리오 확장/파라미터화
  - `js/mockTelemetry.js`(노이즈/위상/속도 옵션) + `js/app.js`(파라미터 전달)
- CSV 다운로드 포맷 조정
  - `js/utils/csv.js`, `js/ui/data-log.js`

## 10) 배포/운영 노트
- 정적 호스팅(예: GitHub Pages)으로 충분합니다.
- Web Bluetooth 제약: HTTPS(또는 localhost) 요구, iOS Safari 미지원.
- 오류 수집/로깅: 현재 콘솔/배너 위주. 필요 시 외부 로깅 연동 지점은 `js/ui/banner.js`/전역 에러 핸들러(추후 정리).

## 11) 코딩 패턴과 합의
- 모듈 초기화는 `initXxx()`가 DOM을 찾고 구독을 등록, 해제 함수 반환.
- 전역 상태 변경은 반드시 `store.dispatch(actions.xxx())`를 통해 수행.
- 외부 라이브러리 의존성 최소화(Chart.js만 로컬 UMD).
- 네이밍/스타일은 기존 파일을 따릅니다.

## 12) 용어(Glossary)
- `angle_cmd`: 서보 지시각(도)
- `illuminance`: 조도 측정값(상대 단위)
- `END`: 스윕 종료/RESET 완료 신호(장치→앱)
- `measurementStatus`: `idle | running | resetting`

## 13) 남은 상세 문서화(플래그)
- 리듀서/액션 상세, BLE 특성 탐색/폴백 처리, 피팅 수학/수치안정화, Mock 시나리오 옵션: 추후 정리
