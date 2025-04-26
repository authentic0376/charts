// vite.config.ts
import {defineConfig, type ConfigEnv} from 'vite'; // defineConfig와 ConfigEnv 타입 임포트
import vue from '@vitejs/plugin-vue';


const GITHUB_PAGES_REPO_NAME = 'charts';

// defineConfig로 함수를 감싸고, 인수에 ConfigEnv 타입 적용
export default defineConfig(({command, mode}: ConfigEnv) => {

    // base 경로 계산 (타입은 string 으로 추론됨)
    const base: string = mode === 'production' || command === 'build' // build 명령어일 때도 production base 사용
        ? `/${GITHUB_PAGES_REPO_NAME}/` // '/charts/'
        : '/';

    // 설정 객체 반환 (defineConfig가 타입을 검사해줌)
    return {
        plugins: [vue()],
        base: base, // 계산된 base 경로 적용

    };
});