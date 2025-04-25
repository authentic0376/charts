// vite.config.js
import { defineConfig } from 'vite';
import fg from 'fast-glob';
import { resolve, dirname } from 'path';

export default defineConfig(({ command }) => {
    // 1. 루트를 제외한 하위 폴더의 index.html만 찾도록 수정
    //    *** 'dist/**' 를 ignore 옵션에 추가 ***
    const htmlFiles = fg.sync('./*/index.html', {
        onlyFiles: true,
        // node_modules 와 dist 폴더는 검색 대상에서 제외
        ignore: ['node_modules/**', 'dist/**'],
    });

    // 2. 찾은 하위 폴더의 index.html들로 input 객체 구성 (변경 없음)
    const input = Object.fromEntries(
        htmlFiles.map((file) => {
            const dirName = dirname(file).replace(/^\.\//, ''); // './some-chart' -> 'some-chart'
            return [
                dirName,
                resolve(__dirname, file)
            ];
        })
    );

    // 3. 루트 index.html을 'main' 키로 명시적으로 추가 (변경 없음)
    input.main = resolve(__dirname, 'index.html');

    // 4. main.js에서 사용할 차트 페이지 링크 목록 생성 (변경 없음)
    const chartPaths = htmlFiles
        .map(file => {
            const dir = dirname(file).replace(/^\.\//, ''); // 'some-chart'
            return `/${dir}/`;
        })
        .sort();

    // 5. 배포 환경에 맞는 base 경로 설정 (변경 없음)
    const base = command === 'build' ? '/' : '/'; // <-- GitHub Pages 등에 배포 시 저장소 이름으로 변경!

    // 나머지 설정 (return 이하)은 이전과 동일하게 유지합니다.
    return {
        base: base,
        define: {
            'import.meta.env.VITE_CHART_PAGES': JSON.stringify(chartPaths),
            'import.meta.env.BASE_URL': JSON.stringify(base),
        },
        build: {
            rollupOptions: {
                input,
                output: {
                    assetFileNames: 'assets/[name]-[hash][extname]',
                    entryFileNames: ({ name }) => {
                        if (name === 'main') {
                            return 'assets/[name]-[hash].js';
                        }
                        return `${name}/[name]-[hash].js`;
                    }
                }
            }
        }
    };
});