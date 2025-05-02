import tailwindcss from "@tailwindcss/vite"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  app: {
    head: {
      // 기본 제목 (titleTemplate이 설정되면 이것은 %s가 없을 때의 기본값)
      title: "",
      // 제목 템플릿 (%s는 useHead에서 설정한 title로 대체됨)
      titleTemplate: "%s | Charts",
      // 다른 전역 head 설정...
    },
    // GitHub Pages 저장소 이름으로 baseURL 설정
    baseURL: process.env.NODE_ENV === "production" ? "/charts/" : "/",
    // buildAssetsDir: '/assets/' // GitHub Pages에서 정적 에셋 경로 문제 방지
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // 서버 빌드 시 'p5'와 'gifenc'를 외부 모듈로 처리하도록 명시
      // 서버 번들에 포함시키지 않음 (클라이언트에서만 로드될 것으로 가정)
      external: ["p5", "gifenc"],
    },
  },
})
