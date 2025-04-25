// vite.config.js
import { defineConfig } from 'vite';
import fg from 'fast-glob';
import { resolve, dirname } from 'path';

const GITHUB_PAGES_REPO_NAME = 'charts';

export default defineConfig(({ command, mode }) => { // command 파라미터 사용

    console.log('--- Vite Config Executing ---'); // 실행 확인용
    console.log('Current command:', command, mode); // ★★★ command 값 확인 ★★★
    console.log('Current mode:', mode);     // ★★★ mode 값 확인 ★★★

    // ... (htmlFiles, input, chartPaths 설정은 동일하게 유지) ...
    const htmlFiles = fg.sync('./*/index.html', { onlyFiles: true, ignore: ['node_modules/**', 'dist/**'] });
    const input = Object.fromEntries(htmlFiles.map(file => [dirname(file).replace(/^\.\//, ''), resolve(__dirname, file)]));
    input.main = resolve(__dirname, 'index.html');
    const chartPaths = htmlFiles.map(file => `/${dirname(file).replace(/^\.\//, '')}/`).sort();

    // base 계산 로직 수정 (mode 기준 테스트)
    // preview는 production 모드를 기반으로 하므로, build와 preview 모두 production 모드일 가능성이 높음
    const base = mode === 'production'
        ? `/${GITHUB_PAGES_REPO_NAME}/` // '/charts/'
        : '/';

    console.log('Calculated base:', base); // ★★★ 계산된 base 값 확인 ★★★

    return {
        base: base, // 계산된 base 경로 적용
        define: {
            'import.meta.env.VITE_CHART_PAGES': JSON.stringify(chartPaths),
            // 'import.meta.env.BASE_URL': JSON.stringify(base), // 필요 시 주석 해제
        },
        build: {
            rollupOptions: {
                input,
                output: {
                    assetFileNames: 'assets/[name]-[hash][extname]',
                    entryFileNames: ({ name }) => name === 'main' ? 'assets/[name]-[hash].js' : `assets/${name}-[hash].js`,
                    chunkFileNames: 'assets/[name]-[hash].js',
                }
            }
        },
        // server.base 는 명시적으로 설정하지 않아도 위에서 계산된 base 값을 따르므로 제거해도 괜찮습니다.
        // server: {
        //     base: '/', // 제거하거나, base 변수를 사용하도록 수정: base: command === 'serve' ? '/' : undefined
        // }
        // 명시적으로 dev 서버만 루트에서 실행하고 싶다면 이렇게 할 수도 있습니다.
        server: command === 'serve' ? { base: '/' } : undefined
        // 하지만 보통은 그냥 위의 top-level base 설정에 맡기는 것이 간단합니다.
    };
});