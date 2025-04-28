#!/bin/bash

# 스크립트 실행 중 오류 발생 시 즉시 중단
set -e
# 파이프라인에서 오류 발생 시 즉시 중단
set -o pipefail

# --- 색상 및 스타일 정의 (선택적) ---
BOLD="\e[1m"
GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

echo -e "\n${BOLD}🚀 ===== Nuxt Static Site Deployment to gh-pages 시작 =====${RESET}"

# --- 사전 체크 ---
echo -e "\n${BOLD}--- 🔍 사전 체크 ---${RESET}"

# 0.1. 현재 브랜치가 main인지 확인 (또는 주 개발 브랜치)
#      main 브랜치가 아니면 .gitignore 등 파일 상태가 다를 수 있으므로 확인합니다.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "❌ ${BOLD}${RED}오류:${RESET} 이 스크립트는 'main' 브랜치에서 실행해야 합니다."
  echo -e "   현재 브랜치: ${YELLOW}$CURRENT_BRANCH${RESET}"
  read -p "❓ 'main' 브랜치가 아니지만 계속 진행하시겠습니까? (y/N): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "🛑 배포를 중단합니다."
    exit 1
  fi
  echo -e "⚠️ ${BOLD}${YELLOW}경고:${RESET} 'main' 브랜치가 아닌 '$CURRENT_BRANCH' 브랜치에서 진행합니다."
fi
echo -e "✅ 현재 브랜치: ${GREEN}$CURRENT_BRANCH${RESET} (확인)"

# 0.2. 커밋되지 않은 변경사항 확인
if ! git diff --quiet HEAD --; then
  echo -e "❌ ${BOLD}${RED}오류:${RESET} 커밋되지 않은 변경 사항이 있습니다. 배포 전에 변경사항을 커밋하거나 스태시해주세요."
  echo -e "   ${YELLOW}변경된 파일 목록:${RESET}"
  git status -s # 변경 파일 목록은 색상 없이 그대로 표시
  exit 1
fi
echo -e "✅ 커밋되지 않은 변경 사항 없음 (확인)"

# 0.3. gh-pages 브랜치 존재 확인 (원격)
#      gh-pages 브랜치가 원격에 없으면 푸시할 수 없으므로 미리 확인합니다.
if ! git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
    echo -e "❌ ${BOLD}${RED}오류:${RESET} 원격 저장소(origin)에 gh-pages 브랜치가 존재하지 않습니다."
    echo -e "   ℹ️ 배포 전에 원격 저장소에 gh-pages 브랜치를 생성해야 합니다."
    echo -e "   ➡️  예: ${YELLOW}git checkout --orphan gh-pages && git commit --allow-empty -m 'Initial commit' && git push origin gh-pages && git checkout main${RESET}"
    exit 1
fi
echo -e "✅ 원격 gh-pages 브랜치 존재 확인 (확인)"


# --- 배포 프로세스 ---
echo -e "\n${BOLD}--- 🚀 배포 프로세스 ---${RESET}"

# 1. generate 실행
echo -e "\n${BOLD}⚙️  >>> 1. Nuxt 프로젝트 정적 빌드를 시작합니다 (npm run generate)${RESET}"
npm run generate
if [ $? -ne 0 ]; then
    echo -e "❌ ${BOLD}${RED}오류:${RESET} 'npm run generate' 실행 중 오류가 발생했습니다."
    exit 1
fi
echo -e "✅ Nuxt 프로젝트 빌드 완료."

# 빌드 결과물(.output/public) 존재 확인
if [ ! -d ".output/public" ]; then
  echo -e "❌ ${BOLD}${RED}오류:${RESET} 빌드 결과 폴더 '.output/public'이 생성되지 않았습니다."
  echo -e "   🤔 'npm run generate' 명령이 성공적으로 완료되었는지, Nuxt 설정이 올바른지 확인해주세요."
  exit 1
fi
echo -e "✅ 빌드 결과 폴더 확인 완료 (.output/public)"

# main 브랜치의 .gitignore 파일 존재 확인 (복사 대상)
if [ ! -f ".gitignore" ]; then
    echo -e "⚠️ ${YELLOW}경고:${RESET} 현재 브랜치('$CURRENT_BRANCH') 루트에 .gitignore 파일이 없습니다."
    echo -e "   gh-pages 브랜치에서 원치 않는 파일이 포함될 수 있습니다. 계속 진행합니다."
    # .gitignore가 없어도 스크립트 자체는 진행 가능하지만, 의도와 다를 수 있음을 알림
fi

# 2. main 브랜치의 .gitignore를 빌드 폴더(.output/public) 안으로 복사
#    (원본 .gitignore 파일은 삭제하지 않음)
echo -e "\n${BOLD}📄 >>> 2. 현재 브랜치('$CURRENT_BRANCH')의 .gitignore 파일을 빌드 폴더(.output/public) 안으로 복사합니다.${RESET}"
# .gitignore 파일이 존재하는 경우에만 복사
if [ -f ".gitignore" ]; then
  cp .gitignore .output/public/
  echo -e "   ➡️ .gitignore 복사 완료 (.output/public/.gitignore)."
else
  # .gitignore가 없을 경우, 빈 파일을 생성하여 이후 단계에서 오류가 발생하지 않도록 함
  # 또는 경고만 하고 넘어가도 됨. 여기서는 빈 파일 생성 선택.
  echo -e "   ⚠️ ${YELLOW}경고:${RESET} .gitignore 파일이 없어 복사하지 못했습니다. 빌드 폴더 내부에 임시 빈 .gitignore를 생성합니다."
  touch .output/public/.gitignore
fi


# 3. gh-pages 브랜치로 전환
echo -e "\n${BOLD}🌿 >>> 3. gh-pages 브랜치로 전환합니다.${RESET}"
# 전환하기 전에 원격 gh-pages 브랜치의 최신 상태를 가져옴 (로컬 gh-pages와 병합하지 않음)
# 로컬 gh-pages가 원격보다 뒤쳐져 있을 경우 push가 거부될 수 있으므로 fetch 필요
git fetch origin gh-pages
# checkout 실행
git checkout gh-pages
if [ $? -ne 0 ]; then
    echo -e "❌ ${BOLD}${RED}오류:${RESET} 'gh-pages' 브랜치로 전환하는 중 오류가 발생했습니다."
    exit 1
fi
# 현재 브랜치가 gh-pages인지 다시 확인 (선택적이지만 안전함)
CHECKOUT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CHECKOUT_BRANCH" != "gh-pages" ]; then
  echo -e "❌ ${BOLD}${RED}오류:${RESET} gh-pages 브랜치로 성공적으로 전환되지 않았습니다. 현재 브랜치: $CHECKOUT_BRANCH"
  exit 1
fi
echo -e "✅ gh-pages 브랜치로 성공적으로 전환되었습니다."


# 4. gh-pages 브랜치의 기존 *추적 중인* 파일들 삭제
#    (unversioned 파일 - 예: node_modules, .output 등 - 은 삭제하지 않음)
echo -e "\n${BOLD}🧹 >>> 4. gh-pages 브랜치의 기존 *추적 중인* 파일들을 삭제합니다.${RESET}"
echo -e "      (ℹ️ node_modules 등 unversioned 파일은 삭제되지 않습니다.)"
# git ls-files -z : 추적 중인 파일 목록을 null 문자로 구분하여 출력 (파일명에 공백 등 포함 가능)
# xargs -0 --no-run-if-empty : null 문자로 구분된 입력을 받아 명령 실행 (입력 없으면 실행 안 함)
# rm -rf -- : 파일 및 디렉토리 강제 삭제 (-- 뒤는 옵션이 아닌 파일명임을 명시)
git ls-files -z | xargs -0 --no-run-if-empty rm -rf --
echo -e "✅ 기존 추적 파일 삭제 완료."


# 5. 빌드 결과물(.output/public 안의 내용)을 gh-pages 브랜치 루트로 복사
#    (여기에는 아까 복사해둔 .gitignore 파일도 포함됨)
echo -e "\n${BOLD}📥 >>> 5. 빌드 결과물(.output/public 안의 모든 내용)을 현재 위치(gh-pages 루트)로 복사합니다.${RESET}"
# cp -a 옵션: archive 모드 (하위 디렉토리 포함, 권한/소유권/타임스탬프 유지 시도)
# 원본 경로 끝의 /.: 해당 디렉토리 *안의 내용물*만 복사 (숨김 파일 포함)
cp -a .output/public/. .
echo -e "✅ 빌드 결과물 복사 완료."


# 6. 변경된 모든 파일 스테이징 (git add .)
#    (5번 단계에서 복사된 .gitignore 파일 덕분에 node_modules 등은 자동으로 제외됨)
echo -e "\n${BOLD}➕ >>> 6. 변경된 모든 파일을 스테이징합니다 (git add .).${RESET}"
git add .
echo -e "✅ 파일 스테이징 완료."


# 7. .gitignore 파일만 스테이징에서 제외 (unstaging)
#    (gh-pages 브랜치 자체는 .gitignore 파일을 추적/관리할 필요 없음)
echo -e "\n${BOLD}➖ >>> 7. 루트 디렉토리의 .gitignore 파일을 스테이징에서 제외합니다.${RESET}"
# git status --porcelain .gitignore : .gitignore 파일 상태 확인 (A=추가, M=수정)
# grep -q "^A\|^ M" : 스테이징 영역에 추가(A) 또는 수정(M)되었는지 조용히 확인
if git status --porcelain .gitignore | grep -q "^A\|^ M"; then
  git reset HEAD .gitignore
  echo -e "   ➡️ .gitignore 파일 스테이징 제외 완료."
else
  echo -e "   ℹ️ .gitignore 파일은 스테이징 영역에 없거나 변경되지 않았습니다 (별도 조치 없음)."
fi


# 8. 변경사항 커밋 및 푸시
echo -e "\n${BOLD}⬆️  >>> 8. 변경사항을 커밋하고 원격 저장소(origin)의 gh-pages 브랜치로 푸시합니다.${RESET}"
# 커밋 메시지에 날짜/시간 포함
COMMIT_MESSAGE="Deploy static site update: $(date +'%Y-%m-%d %H:%M:%S %Z')"
git commit -m "$COMMIT_MESSAGE"
git push origin gh-pages
if [ $? -ne 0 ]; then
    echo -e "❌ ${BOLD}${RED}오류:${RESET} 'git push origin gh-pages' 실행 중 오류가 발생했습니다."
    # 푸시 실패 시 추가 정보 제공 (예: git pull --rebase 권장 등)
    echo -e "   🤔 원격 저장소의 변경사항과 충돌했을 수 있습니다. ${YELLOW}'git pull origin gh-pages --rebase'${RESET} 시도 후 다시 배포해보세요."
    # 복구를 위해 main 브랜치로 돌아가는 것이 안전할 수 있음
    echo -e "   ↪️ ${YELLOW}오류 발생으로 인해 main 브랜치로 강제 복귀를 시도합니다...${RESET}"
    # .gitignore 삭제 후 main으로 이동 시도 (오류 무시)
    rm -f .gitignore
    git checkout main || echo -e "      ⚠️ ${BOLD}${RED}경고:${RESET} main 브랜치 복귀 실패. 수동 확인 필요."
    exit 1
fi
echo -e "✅ 커밋 및 푸시 완료."


# 9. main 브랜치 복귀 전에 루트의 .gitignore 파일 삭제
#    (이 파일을 남겨두고 main으로 복귀하면, main에서 추적 중인 .gitignore와 충돌/덮어쓰기 문제 발생)
echo -e "\n${BOLD}🗑️  >>> 9. main 브랜치 복귀 전, 현재 작업 디렉토리의 .gitignore 파일을 삭제합니다.${RESET}"
rm -f .gitignore
echo -e "✅ .gitignore 파일 삭제 완료."


# 10. 원래 브랜치(main 또는 시작 브랜치)로 복귀
echo -e "\n${BOLD}⏎ >>> 10. 원래 브랜치('$CURRENT_BRANCH')로 복귀합니다.${RESET}"
git checkout $CURRENT_BRANCH
if [ $? -ne 0 ]; then
    echo -e "❌ ${BOLD}${RED}오류:${RESET} '$CURRENT_BRANCH' 브랜치로 복귀하는 중 오류가 발생했습니다."
    echo -e "   🆘 수동으로 ${YELLOW}'git checkout $CURRENT_BRANCH'${RESET} 명령을 실행해주세요."
    exit 1
fi
echo -e "✅ '${GREEN}$CURRENT_BRANCH${RESET}' 브랜치로 성공적으로 복귀했습니다."





echo -e "\n========================================================"
echo -e "${BOLD}${GREEN}🎉🎉🎉 축하합니다! Nuxt 프로젝트 배포가 성공적으로 완료되었습니다. 🎉🎉🎉${RESET}"
echo -e "   🌐 배포된 사이트는 잠시 후 GitHub Pages 주소에서 확인 가능합니다."
echo -e "========================================================"

exit 0