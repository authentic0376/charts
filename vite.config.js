// vite.config.js
import { defineConfig } from 'vite';
import fg from 'fast-glob';
import { resolve, dirname } from 'path'; // Import dirname

export default defineConfig(({ command }) => {
    // charts/**/index.html 패턴에 맞는 모든 파일 수집
    const htmlFiles = fg.sync('charts/**/index.html', { onlyFiles: true }); // Ensure only files are matched

    // rollupOptions.input 객체 구성
    const input = Object.fromEntries(
        htmlFiles.map((file) => [
            // Key: 'charts/some-chart' (used internally by Vite)
            dirname(file), // Use directory path as key
            // Value: Absolute path to the index.html file
            resolve(__dirname, file)
        ])
    );


    // *** 루트 index.html을 input 객체에 추가 ***
    // 'main' 또는 원하는 다른 키 이름을 사용할 수 있습니다.
    // 이 키 이름은 빌드 출력 폴더 구조에 영향을 줄 수 있습니다. (예: dist/index.html)
    input.main = resolve('index.html'); // 프로젝트 루트의 index.html 경로 추가

    // Generate the list of accessible URLs for the index page
    const chartPaths = htmlFiles
        .map(file => {
            // Convert 'charts/some-chart/index.html' to '/charts/some-chart/'
            const dir = dirname(file); // Get 'charts/some-chart'
            return `/${dir}/`; // Prepend and append slashes for URL path
        })
        .sort(); // Sort alphabetically

    return {
        // 공통 옵션 (필요시 추가: base, root 등)
        // base: '/', // Default, adjust if needed

        // Inject the chart paths list into the client code
        define: {
            // Pass the sorted list as a JSON string
            'import.meta.env.VITE_CHART_PAGES': JSON.stringify(chartPaths)
        },

        build: {
            rollupOptions: {
                input
                // Optional: Configure output structure if needed
                // output: { ... }
            }
        }
    };
});