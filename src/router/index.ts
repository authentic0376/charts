import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

// 뷰 컴포넌트 임포트 - TypeScript 환경에서도 .vue 파일 임포트는 동일하게 잘 작동합니다.
import HomeView from '../views/HomeView.vue';
// 정의한 라우팅 전략 함수들을 임포트
import { singleFileViewStrategy, directoryIndexStrategy /*, specialChartStrategy */ } from './strategies'; // 경로 확인

// 404 페이지 컴포넌트 (선택 사항) - 간단한 타입 추론을 위해 인라인으로 유지하거나,
// 별도의 컴포넌트로 만들고 임포트할 수 있습니다.
// import NotFoundView from '../views/NotFoundView.vue';
const NotFoundComponent = { template: '<div><h2>404: 페이지를 찾을 수 없습니다.</h2><p>주소가 올바른지 확인해주세요.</p></div>' };

// --- 동적 차트 라우트 생성 ---
// 1. 적용할 모든 라우팅 전략 함수들을 배열로 관리
//    새로운 규칙 추가 시 이 배열에 새 전략 함수만 추가하면 됩니다.
const chartRouteStrategies = [
    singleFileViewStrategy,
    directoryIndexStrategy,
    // specialChartStrategy, // 새로운 전략이 있다면 여기에 추가
];


// 2. Vite의 import.meta.glob으로 잠재적인 모든 차트 뷰 파일을 찾습니다.
//    각 전략이 처리할 파일 패턴을 모두 포함하도록 glob 패턴을 설정해야 합니다.
const chartModules = import.meta.glob<() => Promise<any>>([
    '../views/charts/*View.vue',         // singleFileViewStrategy 대상
    '../views/charts/**/index.vue',      // directoryIndexStrategy 대상
    // '../views/charts/special_rules/*.Chart.vue' // specialChartStrategy 대상
]);

// 3. 찾은 모듈과 정의된 전략들을 사용하여 라우트 배열 생성
const chartRoutes: RouteRecordRaw[] = Object.entries(chartModules)
    .map(([path, componentLoader]) => {
        // 등록된 모든 전략을 순회하며 현재 파일 경로(path)를 처리할 수 있는지 확인
        for (const strategy of chartRouteStrategies) {
            const routeConfig = strategy(path, componentLoader);
            // 해당 전략이 라우트 설정을 반환하면, 그 결과를 사용하고 다음 파일로 넘어감
            if (routeConfig) {
                // RouteRecordRaw 형태로 맞춰주기 (필요시 타입 단언 사용)
                // 현재 전략 함수는 Pick<...>을 반환하므로, 추가 속성이 필요하다면 여기서 병합하거나 전략 함수 수정
                return routeConfig as RouteRecordRaw;
            }
        }
        // 어떤 전략에도 해당하지 않는 파일이 있다면 경고를 출력하고 무시
        console.warn(`[Router Generator] No matching strategy found for path: ${path}`);
        return null;
    })
    .filter((route): route is RouteRecordRaw => route !== null); // null 값 제거 및 타입 가드


// 라우트 정의 배열에 타입 명시: RouteRecordRaw[]
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
    },
    // 여기에 동적으로 생성된 차트 라우트들을 펼쳐서 추가합니다.
    ...chartRoutes,
    // {
    //     path: '/charts/test_dir',
    //     name: 'test_dir',
    //     component: () => import('@/views/charts/test_dir/index.vue'),
    // },
    // {
    //     path: '/contact',
    //     name: 'contact',
    //     component: ContactView,
    // },
    {
        // 일치하는 라우트가 없을 때: ':pathMatch(.*)*' 사용
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFoundComponent, // 위에서 정의한 컴포넌트 사용
        // component: NotFoundView, // 별도 파일로 만들었다면 이렇게 사용
    },
];

// 라우터 인스턴스 생성
const router = createRouter({
    // history: GitHub Pages를 위한 해시 모드 사용 (createWebHashHistory)
    // 만약 History API 모드를 사용하고 싶다면 createWebHistory(import.meta.env.BASE_URL) 사용
    // 하지만 GitHub Pages에서는 해시 모드가 더 간단합니다.
    history: createWebHashHistory(import.meta.env.BASE_URL), // vite.config.js의 base 옵션과 연동
    routes, // routes: routes 축약형
});

// 라우터 인스턴스 내보내기
export default router;