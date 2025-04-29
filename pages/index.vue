<!-- pages/index.vue -->
<template>
  <div class="background p-10 h-screen">
    <h1 class="text-5xl mb-3">Charts Index</h1>
    <nav>
      <ul>
        <!-- chartLinks 배열을 기반으로 링크 목록 생성 -->
        <li v-if="chartLinks.length === 0">
          No static charts found in /pages/charts/
        </li>
        <li v-for="link in chartLinks" :key="link.path">
          <AnimatedLink :to="link.path" :text="link.text" />
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
// vue-router 에서 useRouter 를 가져옵니다. Nuxt가 자동으로 제공합니다.
import {useRouter} from 'vue-router'; // 또는 '#vue-router', '#imports'
// useHead 컴포저블을 임포트합니다.
import {useHead} from '#imports';
import AnimatedLink from "~/components/AnimatedLink.vue"; // 또는 '@unhead/vue' (Nuxt 3.8+ 권장) or 'nuxt/app'
import { replaceUnderscoresAndTrimEdges } from '@/utils/stringUtils';

// useHead를 호출하고 title 속성을 설정합니다.
useHead({
  title: 'Index', // 이 페이지의 제목
  meta: [
    {name: 'description', content: 'Learn more about our company.'}
  ],
  // 다른 head 태그들도 설정 가능 (link, script 등)
})

const router = useRouter();

// 계산된 속성(computed)을 사용하여 라우트 목록이 변경될 때 자동으로 업데이트되도록 함
const chartLinks = computed(() => {
  const allRoutes = router.getRoutes(); // 모든 등록된 라우트 가져오기

  return allRoutes
      .filter(route =>
          // 1. 루트 페이지 제외
          route.path.length > 1 &&
          // 2. 동적 경로가 아닌 것만 필터링 ([id], :id 등)
          !route.path.includes(':') &&   // 일반적인 동적 세그먼트 확인
          !route.path.includes('[')      // Nuxt 3 동적 세그먼트 확인
      )
      .map(route => {

        return {
          text: replaceUnderscoresAndTrimEdges(route.path.substring(1)), // 슬래시 제거한 이름
          path: route.path                       // 실제 라우트 경로
        };
      })
      .sort((a, b) => a.text.localeCompare(b.text)); // 가나다 순 정렬 (선택 사항)
});

</script>