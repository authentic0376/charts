# js 차트 저장소
- p5 js 라이브러리 이용
- Nuxt 프로젝트
- 정적 사이트 생성(Static Site Generation, SSG)
  - `npm run generate`
  - `.output/public` 폴더의 내용물을 배포하면 된다

## Github Page 관리
- `main` 브랜치에 소스코드 저장
- `gh-pages` 브랜치는 Github Pages 로 활성화하고 빌드한 `.output/public` 폴더 내용물을 push한다
- Github Actions 를 쓰면 클라우드에서 환경구축하고 빌드하는데 너무 오래 걸리므로 직접 빌드하고 push한다
- `.output` 폴더는 빌드폴더라 `main`에서 git이 tracking하지 않는다. 따라서 `gh-pages` 브랜치에 체크아웃하면 working directory에 `.output`폴더가 그대로 있다. 그 안의 내용을 그대로 복사해서 프로젝트 루트에 붙여 넣으면 된다
- 그런식으로 tracking 되지 않은 파일들이 `gh-pages`에 뜨는데, 이것들이 staging 되지 않도록 주의해야 한다
- 보통, `.output/public`안의 내용물을 프로젝트 루트에 붙여 넣을 때 그 파일들을 add할 건지 묻는 대화상자가 나온다. 이런식으로 이 파일들만 add시킨다. 그리고 커밋 푸쉬하면 된다
- 위의 과정을 `./deploy.sh` 로 대신한다

## 페이지 만들기
- pages/ 폴더에 차트별로 폴더/index.vue 를 만들거나, 폴더없이 vue를 만든다

## 접속 방법
- 차트에 접속은 https://authentic0376.github.io/charts/ + 차트명
- 이 주소를 iframe으로 임베딩 해서 쓰면 된다
    ```javascript
  <iframe width="802" height="302" src="https://authentic0376.github.io/charts/shannon_sampling_theorem" frameborder="0"></iframe>
  ```

## tailwindcss
- https://tailwindcss.nuxtjs.org/getting-started/installation
  ```
  npx nuxi@latest module add tailwindcss
  ```
  `npm install` 로 설치하면 module이 nuxt.config.ts 에 추가가 안되니까 `npx nuxi` 이용
- `asset/main.css` 등은 생성도 안되고 만들 필요도 없다.
- `tailwind.config.ts` 은 필요하면 `npx tailwindcss init`