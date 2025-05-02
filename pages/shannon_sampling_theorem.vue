<template>
  <!-- 마우스 이벤트는 여전히 컨테이너에서 감지 -->
  <div
    ref="canvasContainerRef"
    class="shannon-canvas-container"
    :style="{
      width: `${canvasWidth}px`,
      height: `${canvasHeight}px`,
      cursor: 'ew-resize',
      margin: 'auto',
    }"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 렌더러 초기화 상태 표시 (선택적) -->
    <div
      v-if="!isRendererInitialized"
      class="flex h-full items-center justify-center text-gray-500"
    >
      Loading Shannon Sampling Visualization...
    </div>
    <!-- Canvas will be created here by p5, managed by the composable -->
  </div>
  <!-- Optional: Display Fs value (from samplingState) -->
  <!-- <div style="text-align: center; margin-top: 10px;">
      Current Fs: {{ samplingState.state.samplingFrequency.toFixed(2) }} Hz
  </div> -->
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue" // shallowRef, onUnmounted, nextTick 제거
import type { ShannonVisualizationState } from "@/interfaces/rendering/ShannonVisualizationState"
import * as constants from "@/config/shannonConstants"
// --- Composables ---
import { useShannonSampling } from "@/composables/useShannonSampling"
import { useP5ShannonRenderer } from "@/composables/useP5ShannonRenderer" // *** 수정: 렌더러 Composable 임포트
// --- 제거: import type {IVisualizationRenderer} from "~/interfaces/rendering/IVisualizationRenderer";

// --- Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null)
// --- 제거: const renderer = shallowRef<IVisualizationRenderer<ShannonVisualizationState> | null>(null);
const isMouseInside = ref(false) // 마우스 위치 추적 (이전과 동일)

// --- Constants ---
const canvasWidth = ref(constants.SHANNON_CANVAS_WIDTH)
const canvasHeight = ref(constants.SHANNON_CANVAS_HEIGHT)

// --- 상태 관리 Composable ---
const samplingState = useShannonSampling()

// *** 추가: 렌더링 Composable에 전달할 상태 계산 ***
// samplingState.state가 readonly 이므로 computed 없이 직접 사용하거나,
// canvas 크기 정보를 포함해야 하므로 computed 사용하는 것이 좋음
const visualizationState = computed(
  (): ShannonVisualizationState => ({
    ...samplingState.state, // samplingState의 모든 속성 복사
    canvasWidth: canvasWidth.value, // 현재 캔버스 너비 추가
    canvasHeight: canvasHeight.value, // 현재 캔버스 높이 추가
  }),
)

// *** 추가: 렌더러 관리 Composable 사용 ***
const { isInitialized: isRendererInitialized, resizeRenderer } =
  useP5ShannonRenderer(
    canvasContainerRef,
    canvasWidth,
    canvasHeight,
    visualizationState, // 계산된 상태 Ref 전달
  )

// --- 제거: Lifecycle Hooks (onMounted, onUnmounted) 에서 렌더러 직접 관리 코드 ---
/*
onMounted(async () => {
  // ... 이전 렌더러 생성/설정 코드 ...
});

onUnmounted(() => {
  // ... 이전 렌더러 소멸 코드 ...
});
*/

// --- 제거: Watcher (samplingState.state 감지하여 triggerDraw 호출하던 부분) ---
/*
watch(
    () => samplingState.state,
    async () => {
      // ... 이전 triggerDraw 호출 코드 ...
    },
    { deep: true }
);
*/
// 이제 렌더링은 visualizationState 변경을 감지하는 Composable 내부 watch가 담당

// --- Event Handlers (이전과 동일) ---
const handleMouseMove = (event: MouseEvent) => {
  if (canvasContainerRef.value) {
    isMouseInside.value = true
    const rect = canvasContainerRef.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    samplingState.setMouseX(mouseX) // 마우스 위치 업데이트 -> samplingState 변경 -> visualizationState 변경 -> Composable 내부 watch가 draw 호출
  }
}

const handleMouseLeave = () => {
  isMouseInside.value = false
  // 마지막 주파수 유지 (현재 로직)
}

// --- 제거: Helper Function (triggerDraw) ---
/*
const triggerDraw = () => {
  // ... 이전 코드 ...
};
*/

// --- Optional: Window Resize Handling ---
// 필요하다면 resize 이벤트를 감지하여 canvas 크기 Ref를 업데이트하고,
// Composable에서 노출한 resizeRenderer 함수를 호출합니다.
const handleResize = () => {
  if (canvasContainerRef.value && typeof window !== "undefined") {
    // 예시: 부모 요소의 너비에 맞추고 높이는 고정 비율 유지 또는 상수 사용
    const newWidth = canvasContainerRef.value.offsetWidth
    // const newHeight = newWidth * (constants.SHANNON_CANVAS_HEIGHT / constants.SHANNON_CANVAS_WIDTH); // 비율 유지
    const newHeight = constants.SHANNON_CANVAS_HEIGHT // 높이 고정 예시

    if (newWidth !== canvasWidth.value || newHeight !== canvasHeight.value) {
      console.log(`Window resized, updating canvas to ${newWidth}x${newHeight}`)
      canvasWidth.value = newWidth
      canvasHeight.value = newHeight
      // 렌더러 리사이즈 함수 호출 (Composable에서 노출한 경우)
      resizeRenderer(newWidth, newHeight)
      // visualizationState가 canvasWidth/Height 변경으로 인해 업데이트되므로,
      // Composable 내부의 watch가 resize 후 draw를 호출하게 됩니다.
      // (resizeRenderer 내부에서 draw를 호출하지 않는 경우)
    }
  }
}

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("resize", handleResize)
    // 초기 로드 시 리사이즈 핸들러 한 번 호출하여 크기 맞추기 (선택적)
    // handleResize();
  }
})

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", handleResize)
  }
})
</script>

<style scoped>
/* 스타일 (이전과 동일) */
.shannon-canvas-container {
  border: 1px solid #ccc;
  display: block;
  /* 추가: 리사이즈 시 너비가 줄어들 수 있도록 max-width 설정 가능 */
  max-width: 100%;
  /* background-color: #f0f0f0; /* 로딩 상태 배경색 (선택적) */
}
</style>
