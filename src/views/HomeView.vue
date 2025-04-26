<template>
  <h1>Charts Index</h1>
  <nav>
    <ul>
      <li v-for="chartRoute in chartNavLinks" :key="chartRoute.name">
        <!-- :to에는 경로(path)를 바인딩하고, 링크 텍스트로는 이름(name)을 사용 -->
        <router-link :to="chartRoute.path">{{ chartRoute.name }}</router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
// useRouter와 RouteRecordNormalized 타입을 가져옵니다.
import { useRouter, type RouteRecordNormalized } from 'vue-router';

const router = useRouter();

// 네비게이션에 표시할 차트 라우트 목록을 계산하는 computed 속성
const chartNavLinks = computed(() => {
  return router.getRoutes() // 등록된 모든 라우트 정보를 가져옵니다 (RouteRecordNormalized[] 타입)
      .filter(route => route.path.startsWith('/charts/')) // 경로가 '/charts/'로 시작하는 라우트만 필터링
      .sort((a, b) => {
        // 이름(name) 기준으로 오름차순 정렬 (타입 안전성을 위해 name 존재 여부 및 toString() 사용)
        const nameA = a.name?.toString() ?? ''; // name이 없거나 symbol일 경우 대비
        const nameB = b.name?.toString() ?? '';
        return nameA.localeCompare(nameB);
      })
      .map(route => ({
        // 네비게이션에 필요한 정보만 추출 (name과 path)
        // route.name은 string | symbol | undefined 일 수 있으므로 안전하게 처리
        name: route.name?.toString() ?? 'unknown', // 이름이 없으면 'unknown' 표시
        path: route.path,
      }));
});
</script>

<style scoped>
/* 이 컴포넌트에만 적용될 스타일 */
h1 {
  color: blue;
}
</style>