import { RouteRecordRaw } from 'vue-router';

// 각 전략 함수가 받아야 할 파라미터와 반환 타입을 정의
export type RouteStrategyFn = (
    path: string, // import.meta.glob에서 얻은 파일 경로
    componentLoader: () => Promise<any> // 비동기 컴포넌트 로더 함수
) => Pick<RouteRecordRaw, 'path' | 'name' | 'component'> | null; // 필수 라우트 정보 또는 null 반환

// src/router/strategies.ts (이어짐)

import { pascalToSnake } from '@/utils/caseConverter'; // 유틸리티 함수 경로 확인

/**
 * 전략 1: `src/views/charts/` 폴더 바로 아래의 `*View.vue` 파일 처리
 * 예: ../views/charts/MyExampleView.vue -> /charts/my_example, name: my_example
 */
export const singleFileViewStrategy: RouteStrategyFn = (path, componentLoader) => {
    // 정규식을 사용하여 패턴 매칭 및 이름 추출
    const match = path.match(/..\/views\/charts\/([^\/]+?)View\.vue$/);
    if (match && match[1]) {
        const componentName = match[1]; // 예: MyExample
        const routeName = pascalToSnake(componentName); // 예: my_example
        return {
            path: `/charts/${routeName}`,
            name: routeName,
            component: componentLoader,
        };
    }
    return null; // 이 전략에 해당하지 않음
};

/**
 * 전략 2: `src/views/charts/` 하위 폴더의 `index.vue` 파일 처리
 * 예: ../views/charts/some_dir/index.vue -> /charts/some_dir, name: some_dir
 * 예: ../views/charts/nested/feature/index.vue -> /charts/nested/feature, name: nested-feature
 */
export const directoryIndexStrategy: RouteStrategyFn = (path, componentLoader) => {
    // 정규식을 사용하여 패턴 매칭 및 경로 추출
    const match = path.match(/..\/views\/charts\/(.+)\/index\.vue$/);
    if (match && match[1]) {
        const basePath = match[1]; // 예: "some_dir", "nested/feature"
        // 라우트 이름은 경로의 '/'를 '-'로 변경하여 고유성 확보 및 가독성 향상
        const routeName = basePath.replace(/\//g, '-');
        return {
            path: `/charts/${basePath}`, // 경로는 디렉토리 구조 그대로 사용
            name: routeName,
            component: componentLoader,
        };
    }
    return null; // 이 전략에 해당하지 않음
};

// --- 여기에 새로운 라우팅 규칙이 생기면 새 전략 함수를 추가 ---
// 예시: src/views/charts/special_rules/*.Chart.vue 파일을 위한 전략
// export const specialChartStrategy: RouteStrategyFn = (path, componentLoader) => {
//     const match = path.match(/..\/views\/charts\/special_rules\/([^\/]+?)\.Chart\.vue$/);
//     if (match && match[1]) {
//         const chartName = match[1];
//         const routeName = `special-${pascalToSnake(chartName)}`;
//         return {
//             path: `/charts/specials/${pascalToSnake(chartName)}`,
//             name: routeName,
//             component: componentLoader,
//         };
//     }
//     return null;
// };