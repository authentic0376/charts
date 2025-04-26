<template>
  <div id="app-layout">


    <main>
      <!-- 현재 활성화된 라우트에 해당하는 컴포넌트가 렌더링될 위치 -->
      <router-view/>
    </main>

  </div>
</template>

<script setup>
// Composition API 사용 시 특별한 로직 없으면 비워둠

import {useRoute} from 'vue-router'; // vue-router에서 useRoute를 임포트

const route = useRoute(); // useRoute()를 호출하여 현재 라우트 정보를 가져오고 'route' 변수에 할당

</script>

<style>

</style>