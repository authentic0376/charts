<template>
  <!-- Canvas Container: 마우스 이벤트를 감지하여 샘플링 주파수 변경 -->
  <div
    ref="canvasContainerRef"
    class="shannon-canvas-container"
    :style="{
      width: `${canvasWidth}px`,
      height: `${canvasHeight}px`,
      cursor: 'ew-resize', // 마우스 커서를 좌우 이동 형태로 변경
      margin: 'auto', // 페이지 중앙 정렬 (선택적)
      position: 'relative', // 내부 절대 위치 요소(로딩 메시지) 기준점
    }"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 렌더러 초기화 중 표시될 내용 -->
    <div v-if="!isRendererInitialized" class="loading-overlay">
      Loading Shannon Sampling Visualization...
    </div>
    <!-- Canvas는 useP5Renderer 내부에서 동적으로 생성되어 여기에 추가됩니다 -->
  </div>
  <!-- Optional: 디버깅용 주파수 표시
  <div style="text-align: center; margin-top: 10px;">
      Current Fs: {{ samplingState.state.samplingFrequency.toFixed(2) }} Hz
      <br>
      Is Aliasing: {{ visualizationState.isAliasing }}
  </div>
   -->
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import type { ShannonVisualizationState } from "@/interfaces/rendering/ShannonVisualizationState"
import * as constants from "@/config/shannonConstants"

// --- Composables ---
import { useShannonSampling } from "@/composables/useShannonSampling"
import { useP5Renderer } from "@/composables/useP5Renderer" // P5 렌더러 관리 컴포저블

// --- Renderer Class (Type Import Only) ---
// 실제 클래스는 동적으로 임포트되므로 타입 정보만 가져옴
import type { P5ShannonRenderer } from "@/lib/p5/p5ShannonRenderer"

// --- Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null) // 캔버스 컨테이너 div
const isMouseInside = ref(false) // 마우스가 컨테이너 내부에 있는지 여부

// --- Constants ---
// 초기 캔버스 크기 (Ref로 관리하여 반응형 리사이즈 가능)
const canvasWidth = ref(constants.SHANNON_CANVAS_WIDTH)
const canvasHeight = ref(constants.SHANNON_CANVAS_HEIGHT)

// --- 상태 관리 Composable ---
// Shannon 샘플링 관련 상태 및 로직 관리 (Fs 계산, 신호 생성 등)
const samplingState = useShannonSampling()

// --- 렌더링 Composable에 전달할 상태 계산 ---
// useShannonSampling에서 받은 상태(state)와 현재 캔버스 크기를 합쳐
// P5ShannonRenderer가 필요한 전체 상태(ShannonVisualizationState)를 생성
const visualizationState = computed(
  (): ShannonVisualizationState => ({
    ...samplingState.state, // samplingState의 모든 읽기 전용 속성 복사
    canvasWidth: canvasWidth.value, // 현재 캔버스 너비 추가
    canvasHeight: canvasHeight.value, // 현재 캔버스 높이 추가
  }),
)

// --- 렌더러 관리 Composable 사용 ---
// useP5Renderer를 호출하여 렌더러 인스턴스 관리 및 상태 업데이트에 따른 렌더링 처리
const { isInitialized: isRendererInitialized, resizeRenderer } = useP5Renderer<
  ShannonVisualizationState, // 상태 타입
  P5ShannonRenderer // 렌더러 타입 (타입 검사용)
>(
  canvasContainerRef, // 캔버스 컨테이너 Ref
  canvasWidth, // 캔버스 너비 Ref
  canvasHeight, // 캔버스 높이 Ref
  visualizationState, // 감시할 상태 (computed ref)
  // *** P5ShannonRenderer 클래스를 동적으로 임포트하는 함수 전달 ***
  () =>
    import("@/lib/p5/p5ShannonRenderer").then(
      (module) => module.P5ShannonRenderer,
    ),
  "P5ShannonRenderer", // 로깅용 이름
)

// --- Event Handlers ---

/**
 * 캔버스 영역 내에서 마우스 이동 시 호출됩니다.
 * 마우스의 X 좌표를 기반으로 샘플링 주파수(Fs)를 업데이트합니다.
 * @param event 마우스 이벤트 객체
 */
const handleMouseMove = (event: MouseEvent) => {
  if (canvasContainerRef.value) {
    isMouseInside.value = true
    // 캔버스 요소의 화면상 위치 및 크기 정보 가져오기
    const rect = canvasContainerRef.value.getBoundingClientRect()
    // 캔버스 기준 마우스 X 좌표 계산
    const mouseX = event.clientX - rect.left
    // 계산된 X 좌표를 samplingState Composable에 전달하여 Fs 업데이트 요청
    samplingState.setMouseX(mouseX)
    // samplingState 내부에서 Fs가 변경되면 visualizationState가 업데이트되고,
    // useP5Renderer 내부의 watch가 이를 감지하여 자동으로 draw를 호출합니다.
  }
}

/**
 * 마우스가 캔버스 영역을 벗어났을 때 호출됩니다.
 */
const handleMouseLeave = () => {
  isMouseInside.value = false
  // 현재 로직에서는 마우스가 나가도 마지막 주파수를 유지합니다.
  // 필요하다면 특정 주파수로 리셋하는 로직을 추가할 수 있습니다.
}

/**
 * 창 크기 변경 시 호출됩니다. (선택적 기능)
 * 캔버스 크기를 부모 요소 등에 맞춰 조절하고 렌더러 리사이즈를 호출합니다.
 */
const handleResize = () => {
  if (canvasContainerRef.value && typeof window !== "undefined") {
    // 예시: 컨테이너 div의 현재 너비에 맞춤
    const newWidth = canvasContainerRef.value.offsetWidth
    // 높이는 고정하거나 너비에 비례하여 계산할 수 있음
    // const newHeight = newWidth * (constants.SHANNON_CANVAS_HEIGHT / constants.SHANNON_CANVAS_WIDTH); // 비율 유지 예시
    const newHeight = constants.SHANNON_CANVAS_HEIGHT // 높이 고정 예시

    // 실제 크기가 변경되었을 때만 업데이트 및 리사이즈 호출
    if (
      newWidth > 0 &&
      newHeight > 0 &&
      (newWidth !== canvasWidth.value || newHeight !== canvasHeight.value)
    ) {
      console.log(`Window resized, updating canvas to ${newWidth}x${newHeight}`)
      // 캔버스 크기 Ref 업데이트
      canvasWidth.value = newWidth
      canvasHeight.value = newHeight
      // samplingState에 변경된 캔버스 너비 전달 (Fs 재계산 위함)
      samplingState.setCanvasWidth(newWidth)
      // useP5Renderer에서 노출된 리사이즈 함수 호출
      // 이 함수는 p5 인스턴스의 resizeCanvas를 호출하고 내부적으로 redraw를 트리거할 수 있음
      resizeRenderer(newWidth, newHeight)
      // visualizationState가 canvasWidth/Height 변경으로 인해 업데이트되므로,
      // useP5Renderer 내부의 watch가 변경된 상태로 draw를 호출하게 됩니다.
    }
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  // 클라이언트 환경에서만 resize 이벤트 리스너 등록
  if (typeof window !== "undefined") {
    window.addEventListener("resize", handleResize)
    // 초기 로드 시 한 번 호출하여 초기 크기 설정 (선택적)
    handleResize()
  }
  // p5 렌더러 초기화는 useP5Renderer 내부의 onMounted에서 비동기적으로 처리됨
})

onUnmounted(() => {
  // 컴포넌트 제거 시 resize 이벤트 리스너 해제
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", handleResize)
  }
  // p5 렌더러 정리(destroy)는 useP5Renderer 내부의 onUnmounted에서 처리됨
})
</script>

<style scoped>
/* 캔버스 컨테이너 스타일 */
.shannon-canvas-container {
  border: 1px solid #ccc; /* 테두리 */
  display: block; /* 블록 요소로 표시 */
  /* 리사이즈 시 너비가 줄어들 수 있도록 max-width 설정 가능 */
  max-width: 100%;
  overflow: hidden; /* 내부 요소가 넘치지 않도록 */
}

/* 로딩 중 메시지 스타일 */
.loading-overlay {
  position: absolute; /* 컨테이너 기준 절대 위치 */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7); /* 반투명 배경 */
  color: #eee;
  font-size: 1rem;
  z-index: 10; /* 다른 요소 위에 표시 */
}
</style>
