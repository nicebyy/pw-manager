# pw-manager

**다단계 트리 구조 + 직관적 이미지 식별 + 강력한 종단간 로컬 암호화**를 지원하는 데스크톱 비밀번호 및 Key-Value 금고 애플리케이션입니다.

## 주요 기능

- **다단계 트리 구조**: 폴더/서비스/계정을 원하는 깊이만큼 중첩하여 체계적으로 관리 (모두 펼치기/접기, 실시간 검색 및 검색어 초기화, 브레드크럼 경로 지원)
- **자유로운 Key-Value 쌍**: 아이디-비밀번호뿐만 아니라 GitHub PAT, Discord Token, API Key 등 원하는 Key-Value 쌍을 무제한 추가, 비밀값 마스킹(`isSecret`), 랜덤 비밀번호 생성, 복사 후 30초 클립보드 자동 삭제 지원
- **직관적 이미지(`img`) 식별**: 각 항목에 이미지 파일 업로드, **드래그 앤 드롭(Drag & Drop)**, **클립보드 붙여넣기(`Ctrl+V`)**(128x128 자동 리사이즈 후 금고 내부 암호화 저장) 또는 내장 서비스 프리셋(GitHub, Discord, Google, AWS 등) 지정 가능
- **강력한 암호화 (`scrypt` + `AES-256-GCM`)**:
  - 마스터 비밀번호를 시드로 `scrypt` (`N=16384, r=8, p=1`) 키 유도
  - 256-bit `DEK`로 전체 트리·Key-Value·이미지를 `AES-256-GCM` 인증 암호화
  - 원자적 파일 쓰기(`writeQueue` 직렬화 + `.bak` 자동 백업)로 동시 저장 시 손상 방지
- **12단어 복구 문구 (Dual-Key Envelope)**:
  - 최초 비밀번호 설정 시 중복 없는 12단어 복구 문구 발급 및 4행×3열(Row×Col) 그리드 복사·붙여넣기 지원
  - 마스터 비밀번호 분실 시 복구 문구로 새 마스터 비밀번호 재설정 가능
  - 마스터 비밀번호와 복구 문구를 모두 분실하면 데이터는 영구히 복호화 불가
- **런타임 & UX 보안**:
  - **단일 인스턴스 보장**: 이미 실행 중일 때 재실행 시 새 프로세스를 띄우지 않고 기존 창(트레이 숨김 상태 포함)을 복원·포커스
  - **Windows 시스템 트레이 백그라운드 상주**: 창 닫기(`X`) 시 우측 하단 시스템 트레이로 숨겨지며, 트레이 메뉴(`열기`, `금고 잠금`, `종료`) 지원
  - **Electron 샌드박스 격리**: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, 외부 URL 탐색 및 팝업 차단
  - **미사용 시 자동 잠금**: 설정에서 5/10/15/30분 또는 사용 안 함 선택 가능
  - **자동 저장 & 편집 보호**: 입력 후 600ms 자동 암호화 저장(항목 전환 시 즉시 플러시), `Ctrl+S` 즉시 저장, 삭제 확인, 비밀번호 보기/숨기기 및 Caps Lock 경고
- **다국어 지원 (한국어 / English)**: 설정에서 새로고침 없이 즉시 전환 가능

## 단축키

| 단축키 | 동작 |
| :--- | :--- |
| `Ctrl + S` (`Cmd + S`) | 현재 선택된 항목 변경사항 즉시 암호화 저장 |

## 실행 및 테스트

```bash
# 의존성 설치
npm install

# 단위 테스트 및 통합 테스트 실행
npm test

# 프로덕션 빌드 (렌더러 + Electron 메인/프리로드)
npm run build

# Electron 데스크톱 앱 개발 모드 실행
npm run dev:electron
```

## 자동 릴리스 파이프라인 (GitHub Actions)

`main` 브랜치에 푸시될 때마다 [`.github/workflows/release.yml`](.github/workflows/release.yml) 워크플로우가 자동 실행됩니다:
1. **Test & Build Gate**: `npm test` (단위·통합 테스트 100% 통과) 및 `npm run build` 검증
2. **Release Packaging**: Windows NSIS 설치 파일 및 Portable `.exe` 빌드 + `checksums.txt` (SHA256) 생성
3. **GitHub Release 게시**: SemVer 태그(`v1.0.0` 등, 기존 태그 존재 시 패치 버전 자동 증가)와 함께 GitHub Releases에 자동 업로드
