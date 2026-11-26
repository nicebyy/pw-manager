# pw-manager 데스크톱 앱 프로젝트 개발 규칙 (Development Rules)

본 문서는 `C:\Users\곽현기\Documents\old-calender\RULES.md`의 핵심 개발 원칙을 인용·적용하여 **pw-manager (암호화된 다단계 트리 비밀번호 & Key-Value 금고)** 프로젝트의 아키텍처, 테스트, 보안, 문서화 및 다국어(i18n) 규칙을 정의합니다.

---

## 1. 브랜치 전략 및 테스트 통과 게이트 (Test & Merge Gate)
*(인용: `old-calender/RULES.md` 제1장)*

- **배포 및 머지 필수 조건**:
  - **단위 테스트(Unit Test)** 및 **통합 테스트(Integration Test)**가 **100% 통과**(`npm test`)하고 빌드가 성공(`npm run build`)한 경우에만 병합·배포합니다.
  - 핵심 암호화 로직(`scrypt` + `AES-256-GCM`, 복구 문구 래핑, 변조 탐지), 다단계 트리 CRUD, 단일 인스턴스 잠금 로직, i18n 키 일치도는 단위 테스트로 검증합니다.
  - 파일 시스템 암호화 저장/복호화 및 UI 인증/트리/저장 흐름은 통합 테스트로 검증합니다.

---

## 2. 모듈화 및 아키텍처 원칙 (Modular Architecture)
*(인용: `old-calender/RULES.md` 제3장)*

UI 계층과 비즈니스·암호화 로직을 엄격히 분리하여 모듈화합니다:

```text
pw-manager/
├── electron/         # Electron 메인 프로세스, Preload, 단일 인스턴스 락, 암호화 파일 저장소
├── src/
│   ├── core/         # 순수 비즈니스/암호화 로직 (scrypt+AES-256-GCM, 다단계 트리, 비밀번호 생성기)
│   ├── views/        # 주요 화면 (초기 설정, 로그인, 복구 문구 복구, 메인 금고 뷰)
│   ├── components/   # 재사용 UI 컴포넌트 (TreeSidebar, NodeDetail, NodeIcon, Modals)
│   ├── storage/      # Zustand 상태 관리 및 IPC 브리지 클라이언트
│   ├── constants/    # 매직 넘버/스트링 없는 상수, 암호화 규격, 아이콘 프리셋 중앙화
│   ├── locales/      # 다국어(i18n) 번역 사전 (ko.ts, en.ts) 및 translate 헬퍼
│   ├── types/        # TypeScript 타입 및 인터페이스 정의
│   └── utils/        # 클라이언트 이미지 리사이저 등 순수 유틸리티
└── tests/
    ├── unit/         # 단위 테스트 (crypto, tree, singleInstance, i18n)
    └── integration/  # 통합 테스트 (VaultFileStore 파일 영속성, App UI 전체 흐름)
```

---

## 3. 상시 문서화 및 실시간 동기화 의무화 (Always-on Continuous Documentation)
*(인용: `old-calender/RULES.md` 제5장)*

- **완료 정의(Definition of Done) = 코드 + 테스트 100% + 문서 동기화**
- 디렉터리 구조, IPC 채널, 암호화 규격, 기능 명세 변경 시 `README.md`와 규칙 문서를 즉시 동기화합니다.

---

## 4. 하드코딩 금지 및 상수 중앙화 (No Hardcoding Policy)
*(인용: `old-calender/RULES.md` 제6장)*

- 암호화 파라미터(`SCRYPT_COST_N`, `AES-256-GCM` 키/IV/태그 길이), IPC 채널명, 최소 비밀번호 길이, 클립보드 자동 삭제 시간, 이미지 크기 제한 등은 `src/constants/`에 중앙 집중화합니다.
- 사용자에게 노출되는 모든 UI 문구는 JSX/TSX에 직접 작성하지 않고 `src/locales/` 및 `t(key)`를 통해 관리합니다.

---

## 5. 데스크톱 런타임 및 보안·안전 규칙 (Desktop Runtime & Security Policy)
*(인용: `old-calender/RULES.md` 제7장)*

1. **Context Isolation & Preload 격리**: `nodeIntegration: false`, `contextIsolation: true`를 유지하며 `preload.cts`의 `contextBridge`로 제한된 IPC API만 노출합니다.
2. **단일 인스턴스 보장 (Single Instance Lock)**: `app.requestSingleInstanceLock()`을 통해 중복 실행 시 새 창을 띄우지 않고 기존 프로세스의 창을 복원·포커스합니다.
3. **메모리 내 민감 키 관리 & Graceful Shutdown**: 복호화된 `DEK(Data Encryption Key)`는 잠금 해제 상태에서만 메인 프로세스 메모리에 보관하며, 잠금(`lock`) 또는 앱 종료(`before-quit`) 시 `zeroizeBuffer()`로 0으로 덮어쓰고 클립보드 타이머를 해제합니다.
4. **복구 불가 원칙**: 마스터 비밀번호와 12단어 복구 문구 모두 분실 시 어떠한 백도어나 평문 해시도 저장하지 않으므로 내부 데이터는 영구히 복호화할 수 없습니다.

---

## 6. 다국어(i18n) 지원 의무화 (Internationalization Policy)
*(인용: `old-calender/RULES.md` 제8장)*

- 한국어(`ko`)와 영어(`en`) 사전을 100% 키 일치(Key Parity) 상태로 유지하며, 설정 화면에서 새로고침 없이 0ms 즉시 언어 전환을 지원합니다.
