#!/bin/bash

# 스크립트 실행 중 오류 발생 시 즉시 중단
set -e

# --- 설정 변수 ---
DEPLOY_BRANCH="gh-pages"  # 배포할 브랜치 이름
BUILD_COMMAND="npm run generate" # 빌드 명령어
BUILD_DIR=".output/public" # Nuxt generate 결과물이 있는 디렉토리
COMMIT_MESSAGE="Deploy static site build $(date +'%Y-%m-%d %H:%M:%S')" # 커밋 메시지
REMOTE_NAME="origin" # Git 리모트 이름 (보통 origin)
# --- 설정 변수 끝 ---

echo "🚀 배포 스크립트 시작..."

# 0. 의존성 확인 (node_modules) - 스크립트 실행 시점 기준
if [ ! -d "node_modules" ]; then
  echo "⚠️ 경고: node_modules 디렉토리가 없습니다. 'npm install'을 먼저 실행해야 할 수 있습니다."
fi

# 1. 프로젝트 빌드
echo "⏳ 프로젝트 빌드 중 ($BUILD_COMMAND)..."
$BUILD_COMMAND
if [ $? -ne 0 ]; then
  echo "❌ 오류: 빌드 명령어 실행 실패 ($BUILD_COMMAND)"
  exit 1
fi
echo "✅ 빌드 완료."

# 2. 빌드 결과물 디렉토리 확인
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ 오류: 빌드 디렉토리 '$BUILD_DIR'를 찾을 수 없습니다."
  echo "'$BUILD_COMMAND'가 정상적으로 실행되었는지, 결과물 경로가 올바른지 확인하세요."
  exit 1
fi

BUILD_DIR_ABSOLUTE=$(pwd)/$BUILD_DIR
echo "빌드 결과물 위치: $BUILD_DIR_ABSOLUTE"

# --- 중요: .gitignore를 빌드 디렉토리로 복사 ---
if [ -f ".gitignore" ]; then
  echo "⏳ .gitignore 파일을 빌드 디렉토리로 복사 중..."
  cp .gitignore "$BUILD_DIR_ABSOLUTE/"
  echo "✅ .gitignore 복사 완료."
else
  echo "⚠️ 경고: 루트에 .gitignore 파일이 없습니다. Untracked 파일 관리에 문제가 생길 수 있습니다."
fi
# --- .gitignore 복사 끝 ---

# 3. 현재 브랜치 이름 저장
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "현재 브랜치: $CURRENT_BRANCH"

# 4. 작업 디렉토리에 커밋되지 않은 변경 사항 확인 로직 (Stash 전)
# (Stash 로직이 충분히 처리하므로, 단순 경고 또는 확인 로직은 선택사항)
# if ! git diff --quiet HEAD --; then ... fi

echo "✅ 사전 검사 완료."

STASH_NEEDED=false
if ! git diff --quiet HEAD -- || ! git diff --quiet --staged || [[ -n $(git status --porcelain --untracked-files=no) ]]; then
    echo "⏳ 현재 변경 사항 임시 저장 (stash)..."
    git stash push -u -m "deploy-script-stash-$(date +'%s')"
    STASH_NEEDED=true
fi

# 5. 배포 브랜치로 전환 (없으면 생성 시도)
(
  set -e # 서브쉘 내에서 오류 발생 시 중단

  if git show-ref --quiet refs/heads/$DEPLOY_BRANCH; then
    git checkout $DEPLOY_BRANCH
    echo "배포 브랜치 '$DEPLOY_BRANCH'(으)로 전환했습니다."
  else
    if git show-ref --quiet refs/remotes/$REMOTE_NAME/$DEPLOY_BRANCH; then
      git checkout -t $REMOTE_NAME/$DEPLOY_BRANCH
      echo "리모트로부터 배포 브랜치 '$DEPLOY_BRANCH'(을)를 가져와 전환했습니다."
    else
      git checkout --orphan $DEPLOY_BRANCH
      echo "새 배포 브랜치 '$DEPLOY_BRANCH'(을)를 생성하고 전환했습니다."
    fi
  fi

  echo "⏳ 원격 저장소($REMOTE_NAME/$DEPLOY_BRANCH) 내용 가져오기 시도..."
  git pull $REMOTE_NAME $DEPLOY_BRANCH || echo "ℹ️ 원격 저장소 pull 실패 또는 필요 없음. 로컬 기준으로 진행합니다."

  echo "⏳ 이전 빌드 내용 삭제 중 (Git 추적 파일만)..."
  if [[ "$(git rev-parse --abbrev-ref HEAD)" != "$DEPLOY_BRANCH" ]]; then
    echo "❌ 치명적 오류: 현재 브랜치가 '$DEPLOY_BRANCH'가 아닙니다! 삭제 작업을 중단합니다."
    exit 1
  fi
  git ls-files -z | xargs -0 rm -rf -- || true
  echo "✅ 이전 추적 파일 삭제 완료."

  echo "⏳ 새 빌드 내용 (및 .gitignore) 복사 중..."
  cp -a "$BUILD_DIR_ABSOLUTE/." .
  echo "✅ 파일 복사 완료."

  # CNAME 등 필요한 파일 추가는 여기서

  echo "⏳ 변경 사항 스테이징 중 (임시 .gitignore 적용)..."
  git add .

  echo "⏳ .gitignore 파일 언스테이징 중..."
  if git diff --name-only --cached | grep -q '^\.gitignore$'; then
      git restore --staged .gitignore
      echo "✅ .gitignore 언스테이징 완료."
  else
      echo "ℹ️ .gitignore 파일은 스테이징되지 않았습니다."
  fi

  echo "⏳ 커밋 중..."
  if git diff --staged --quiet; then
    echo "ℹ️ 배포할 변경 사항이 없습니다."
  else
    git commit -m "$COMMIT_MESSAGE"
    echo "✅ 커밋 완료: $COMMIT_MESSAGE"

    echo "⏳ 원격 저장소($REMOTE_NAME/$DEPLOY_BRANCH)에 푸시 중..."
    git push -u $REMOTE_NAME $DEPLOY_BRANCH
    echo "✅ 푸시 완료!"
  fi

  # --- 중요: main 브랜치로 돌아가기 전 임시 .gitignore 파일 삭제 ---
  echo "⏳ 작업 디렉토리의 임시 .gitignore 파일 정리 중..."
  rm -f .gitignore
  echo "✅ 임시 .gitignore 파일 삭제 완료."
  # --- .gitignore 정리 끝 ---

) || ( # 오류 발생 시
  echo "❌ 오류: 배포 브랜치 작업 중 오류 발생."
  echo "⏳ 원래 브랜치($CURRENT_BRANCH)로 복귀 시도..."
  # 오류 발생 시에도 임시 .gitignore가 남아있을 수 있으므로 정리 시도
  rm -f .gitignore || true
  git checkout $CURRENT_BRANCH || echo "⚠️ 원래 브랜치 복귀 실패."
  if $STASH_NEEDED; then
      echo "⏳ 임시 저장(stash) 복원 시도..."
      git stash pop || echo "⚠️ Stash 복원 실패. 'git stash list' 확인 필요."
  fi
  exit 1 # 스크립트 실패 종료
)

# 10. 원래 브랜치로 복귀
echo "⏳ 원래 브랜치($CURRENT_BRANCH)로 복귀 중..."
git checkout $CURRENT_BRANCH

# 11. Stash 복원
if $STASH_NEEDED; then
    echo "⏳ 임시 저장(stash) 복원 중..."
    # 이제 main 브랜치 checkout 시점에 임시 .gitignore가 없었으므로,
    # stash pop이 정상적으로 원래의 tracked .gitignore 상태를 복원해야 함.
    git stash pop || (echo "⚠️ Stash 복원 실패. 'git stash list'를 확인하고 수동으로 'git stash pop' 하세요."; exit 1)
    echo "✅ 임시 저장 복원 완료."
fi

# 12. (선택사항) 빌드 디렉토리에 복사했던 .gitignore 정리 (Stash pop이 처리해주므로 보통 불필요)
# echo "⏳ 빌드 디렉토리 내 임시 .gitignore 정리 시도..."
# rm -f "$BUILD_DIR_ABSOLUTE/.gitignore" || true

echo "🎉 배포 스크립트 완료!"