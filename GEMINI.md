# Antigravity Workspace Guidelines (pw-manager)

*(참고 및 인용: `C:\Users\곽현기\Documents\old-calender\GEMINI.md`)*

## 1. 터미널 명령 실행 및 무한 대기(Lock) 방지
- Windows PowerShell/cmd 환경에서 `node -e "..."`, `npx tsx -e "..."` 등 인라인 다중행 실행(`-e`)을 금지합니다.
- 임시 스크립트가 필요한 경우 파일(`scripts/temp-*.ts`)로 작성하고 타임아웃 워치독을 포함한 뒤 실행 후 삭제합니다.

## 2. 프로젝트 빌드 및 테스트 게이트
- **상대 경로 유지 (`vite.config.ts`)**: Electron `loadFile` 호환을 위해 `base: './'` 설정을 유지합니다.
- **테스트 및 빌드 게이트**: 모든 변경 후 `npm test` (단위·통합 테스트 100% 통과) 및 `npm run build`를 반드시 검증합니다.
