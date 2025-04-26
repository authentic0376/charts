import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

// 뷰 컴포넌트 임포트 - TypeScript 환경에서도 .vue 파일 임포트는 동일하게 잘 작동합니다.
import HomeView from '../views/HomeView.vue';
import { pascalToSnake } from '../utils/caseConverter'; // 만약 별도 파일로 분리했다면 경로 수정
// import AboutView from '../views/AboutView.vue';
// import ContactView from '../views/ContactView.vue';

// 404 페이지 컴포넌트 (선택 사항) - 간단한 타입 추론을 위해 인라인으로 유지하거나,
// 별도의 컴포넌트로 만들고 임포트할 수 있습니다.
// import NotFoundView from '../views/NotFoundView.vue';
const NotFoundComponent = { template: '<div><h2>404: 페이지를 찾을 수 없습니다.</h2><p>주소가 올바른지 확인해주세요.</p></div>' };

// --- 동적 차트 라우트 생성 ---

// 1. Vite의 import.meta.glob으로 `src/views/charts` 폴더 아래의 *View.vue 파일을 찾습니다.
//    TypeScript 제네릭 <() => Promise<any>> 는 값의 타입(모듈을 비동기 로드하는 함수)을 명시합니다.
const chartModules = import.meta.glob<() => Promise<any>>('../views/charts/*View.vue');

// 2. 찾은 모듈 정보를 기반으로 RouteRecordRaw 배열을 생성합니다.
const chartRoutes: RouteRecordRaw[] = Object.keys(chartModules).map((path) => {
    // 파일 경로에서 파일 이름 추출 (예: ../views/charts/ShannonSamplingTheoremView.vue -> ShannonSamplingTheoremView.vue)
    const fileName = path.split('/').pop() || '';
    // 파일 이름에서 확장자(.vue) 제거 (예: ShannonSamplingTheoremView.vue -> ShannonSamplingTheoremView)
    const componentName = fileName.replace(/\.vue$/, '');
    // 컴포넌트 이름을 snake_case로 변환 (예: ShannonSamplingTheoremView -> shannon_sampling_theorem)
    const routeName = pascalToSnake(componentName);

    return {
        // 경로 설정 (예: /charts/shannon_sampling_theorem)
        path: `/charts/${routeName}`,
        // 라우트 이름 설정 (예: shannon_sampling_theorem)
        name: routeName,
        // 컴포넌트 설정 (glob 결과에서 제공하는 비동기 import 함수 사용 - Lazy Loading)
        component: chartModules[path],
    };
});

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
    //     component: () => import('@/views/charts/test_dir'),
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