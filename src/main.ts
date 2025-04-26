import { createApp } from 'vue';
import './style.css'; // 전역 CSS 임포트
import App from './App.vue'; // 루트 컴포넌트 임포트
import router from './router'; // TypeScript로 변환된 라우터 설정 임포트 (확장자 .ts 생략 가능)

// Vue 앱 인스턴스 생성
const app = createApp(App);

// 라우터 플러그인 등록
app.use(router);

// 앱을 HTML 요소에 마운트 (#app은 public/index.html에 있는 요소 ID)
app.mount('#app');