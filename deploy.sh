#!/bin/bash

# 스크립트 실행 중 오류 발생 시 즉시 중단
set -e

# --- 설정 변수 ---
DEPLOY_BRANCH="gh-pages"  # 배포할 브랜치 이름 (예: gh-pages, main, deploy 등)
BUILD_DIR=".output/public" # Nuxt generate 결과물이 있는 디렉토리
COMMIT_MESSAGE="Deploy static site build $(date +'%Y-%m-%d %H:%M:%S')" # 커밋 메시지
REMOTE_NAME="origin" # Git 리모트 이름 (보통 origin)
# --- 설정 변수 끝 ---

echo "🚀 배포 스크립트 시작..."

# 1. 현재 브랜치 이름 저장
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "현재 브랜치: $CURRENT_BRANCH"

# 2. 빌드 결과물 디렉토리 확인
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ 오류: 빌드 디렉토리 '$BUILD_DIR'를 찾을 수 없습니다."
  echo "먼저 'npm run generate'를 실행했는지 확인하세요."
  exit 1
fi

# 3. 작업 디렉토리에 커밋되지 않은 변경 사항이 있는지 확인
if ! git diff --quiet HEAD --; then
  echo "⚠️ 경고: 현재 브랜치($CURRENT_BRANCH)에 커밋되지 않은 변경 사항이 있습니다."
  echo "스크립트를 계속 진행하려면 변경 사항을 커밋하거나 스태시하세요."
  read -p "계속 진행하시겠습니까? (y/N) " confirm && [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]] || exit 1
fi

echo "✅ 사전 검사 완료."

# 4. 배포 브랜치로 전환 (없으면 생성 시도)
if git show-ref --quiet refs/heads/$DEPLOY_BRANCH; then
  # 로컬에 브랜치가 있는 경우
  git checkout $DEPLOY_BRANCH
  echo "배포 브랜치 '$DEPLOY_BRANCH'(으)로 전환했습니다."
else
  # 로컬에 브랜치가 없는 경우, 리모트에 있는지 확인 후 체크아웃 시도
  if git show-ref --quiet refs/remotes/$REMOTE_NAME/$DEPLOY_BRANCH; then
    git checkout -t $REMOTE_NAME/$DEPLOY_BRANCH
    echo "리모트로부터 배포 브랜치 '$DEPLOY_BRANCH'(을)를 가져와 전환했습니다."
  else
    # 리모트에도 없으면 새로 생성
    git checkout -b $DEPLOY_BRANCH
    echo "새 배포 브랜치 '$DEPLOY_BRANCH'(을)를 생성하고 전환했습니다."
    # 새 브랜치인 경우, 초기 커밋이 필요할 수 있으므로 .gitkeep 추가 (선택 사항)
    # touch .gitkeep
    # git add .gitkeep
    # git commit -m "Initial commit for $DEPLOY_BRANCH"
    # git push $REMOTE_NAME $DEPLOY_BRANCH
  fi
fi

# 5. 배포 브랜치의 내용을 최신 상태로 업데이트 (선택 사항, 충돌 방지)
git pull $REMOTE_NAME $DEPLOY_BRANCH || echo "⚠️ 원격 저장소에서 pull 실패. 로컬 브랜치 기준으로 진행합니다."


echo "⏳ 이전 빌드 내용 삭제 중..."
# .git 디렉토리를 제외한 모든 파일 및 디렉토리 삭제 (숨김 파일 포함)
# 주의: 이 명령은 현재 디렉토리의 내용을 삭제하므로 정확한 브랜치에서 실행해야 합니다.
find . -maxdepth 1 -not -name '.git' -not -name '.' -not -name '..' -exec rm -rf {} \;

echo "⏳ 새 빌드 내용 복사 중..."
# 빌드 디렉토리의 *내용*을 현재 디렉토리로 복사 (숨김 파일 포함)
# source 뒤에 /.(슬래시와 점)을 붙이는 것이 중요!
cp -a "$BUILD_DIR/." .

echo "✅ 파일 복사 완료."

# 7. 변경 사항 스테이징 및 커밋
echo "⏳ 변경 사항 스테이징 및 커밋 중..."
git add .

# 변경 사항이 있을 경우에만 커밋
if git diff --staged --quiet; then
  echo "ℹ️ 배포할 변경 사항이 없습니다."
else
  git commit -m "$COMMIT_MESSAGE"
  echo "✅ 커밋 완료: $COMMIT_MESSAGE"

  # 8. 원격 저장소에 푸시
  echo "⏳ 원격 저장소($REMOTE_NAME/$DEPLOY_BRANCH)에 푸시 중..."
  git push $REMOTE_NAME $DEPLOY_BRANCH
  echo "✅ 푸시 완료!"

  # 참고: 배포 브랜치의 히스토리를 덮어쓰려면 force push (-f) 옵션을 사용할 수 있습니다.
  # git push -f $REMOTE_NAME $DEPLOY_BRANCH
  # 하지만 force push는 주의해서 사용해야 합니다.
fi

# 9. 원래 브랜치로 복귀
echo "⏳ 원래 브랜치($CURRENT_BRANCH)로 복귀 중..."
git checkout $CURRENT_BRANCH

echo "🎉 배포 스크립트 완료!"