<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col space-y-4 p-4">
    <!-- Canvas Container (렌더러 Composable에 ref 전달) -->
    <ClientOnly>
      <div
        class="self-center border border-gray-300"
        ref="canvasContainerRef"
        id="canvas-container"
        :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
      >
        <!-- p5 캔버스가 여기에 생성됩니다 -->
        <div
          v-if="!isRendererInitialized"
          class="flex h-full items-center justify-center text-gray-500"
        >
          Initializing visualization...
        </div>
      </div>

      <!-- Controls Container (이전과 동일) -->
      <div id="controls-container">
        <div
          class="grid grid-cols-2 items-center justify-items-stretch gap-x-8 gap-y-4"
        >
          <!-- e1.x Slider -->
          <div class="flex flex-col">
            <label for="slider_e1x" class="text-sm font-medium"
              >e₁.x: {{ slider_e1x_val.toFixed(1) }}</label
            >
            <input
              id="slider_e1x"
              type="range"
              min="-2"
              max="2"
              step="0.1"
              v-model.number="slider_e1x_val"
              class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
            />
          </div>
          <!-- e2.x Slider -->
          <div class="flex flex-col">
            <label for="slider_e2x" class="text-sm font-medium"
              >e₂.x: {{ slider_e2x_val.toFixed(1) }}</label
            >
            <input
              id="slider_e2x"
              type="range"
              min="-2"
              max="2"
              step="0.1"
              v-model.number="slider_e2x_val"
              class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
            />
          </div>
          <!-- e1.y Slider -->
          <div class="flex flex-col">
            <label for="slider_e1y" class="text-sm font-medium"
              >e₁.y: {{ slider_e1y_val.toFixed(1) }}</label
            >
            <input
              id="slider_e1y"
              type="range"
              min="-2"
              max="2"
              step="0.1"
              v-model.number="slider_e1y_val"
              class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
            />
          </div>
          <!-- e2.y Slider -->
          <div class="flex flex-col">
            <label for="slider_e2y" class="text-sm font-medium"
              >e₂.y: {{ slider_e2y_val.toFixed(1) }}</label
            >
            <input
              id="slider_e2y"
              type="range"
              min="-2"
              max="2"
              step="0.1"
              v-model.number="slider_e2y_val"
              class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
            />
          </div>
        </div>
        <!-- Reset Button -->
        <div class="mt-4 flex justify-end">
          <button
            @click="resetBasis"
            class="rounded bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Reset Basis
          </button>
        </div>
      </div>

      <!-- KaTeX Info Display Area (이전과 동일) -->
      <div
        id="info-container"
        class="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-center text-sm"
      >
        <div class="info-section">
          <h3 class="mb-2 text-lg font-semibold">Primal Basis</h3>
          <div class="flex items-center justify-around">
            <span ref="el_primal_e1"></span><span ref="el_primal_e2"></span>
          </div>
        </div>
        <div class="info-section">
          <h3 class="mb-2 text-lg font-semibold">Transformation Matrix</h3>
          <div class="flex items-center justify-around">
            <span ref="el_matrix_m"></span><span ref="el_determinant"></span>
          </div>
        </div>
        <div class="info-section">
          <h3 class="mb-2 text-lg font-semibold">Dual Basis</h3>
          <div class="flex items-center justify-around">
            <span ref="el_dual_epsilon1"></span
            ><span ref="el_dual_epsilon2"></span>
          </div>
        </div>
        <div class="info-section">
          <h3 class="mb-2 text-lg font-semibold">Inverse Matrix M⁻¹</h3>
          <div class="flex items-center justify-around">
            <span ref="el_matrix_m_inv"></span>
          </div>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue" // shallowRef, onUnmounted, nextTick 제거
import "katex/dist/katex.min.css" // KaTeX CSS import

// --- Constants ---
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/config/constants"

// --- KaTeX 렌더링 ---
import { updateInfoDOM } from "@/lib/katex/renderer"
import { P5BasisRenderer } from "@/lib/p5/p5BasisRenderer"

// --- 인터페이스 ---
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"
// --- 제거: import type { IVisualizationRenderer } from '@/interfaces/rendering/IVisualizationRenderer';

// --- Template Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null) // 캔버스 부모 div
// KaTeX 요소 Refs (이전과 동일)
const el_primal_e1 = ref<HTMLElement | null>(null)
const el_primal_e2 = ref<HTMLElement | null>(null)
const el_matrix_m = ref<HTMLElement | null>(null)
const el_determinant = ref<HTMLElement | null>(null)
const el_dual_epsilon1 = ref<HTMLElement | null>(null)
const el_dual_epsilon2 = ref<HTMLElement | null>(null)
const el_matrix_m_inv = ref<HTMLElement | null>(null)

// --- 상태 관리 Composable 사용 ---
const {
  slider_e1x_val,
  slider_e1y_val,
  slider_e2x_val,
  slider_e2y_val, // 슬라이더 값 Refs
  calculated, // 계산 결과 (반응형)
  performCalculations, // 계산 함수
} = useBasisTransformation()

// --- 렌더러 인스턴스 ---
// --- 제거: const renderer = shallowRef<IVisualizationRenderer<BasisVisualizationState> | null>(null);

// --- 캔버스 크기 (상수로 관리) ---
const canvasWidth = ref(CANVAS_WIDTH)
const canvasHeight = ref(CANVAS_HEIGHT)

// *** 추가: 렌더링 Composable에 전달할 상태 계산 ***
const visualizationState = computed(
  (): BasisVisualizationState => ({
    e1: { x: calculated.e1.x, y: calculated.e1.y },
    e2: { x: calculated.e2.x, y: calculated.e2.y },
    epsilon1: { x: calculated.epsilon1.x, y: calculated.epsilon1.y },
    epsilon2: { x: calculated.epsilon2.x, y: calculated.epsilon2.y },
    detM: calculated.detM,
  }),
)

// *** 추가: 렌더러 관리 Composable 사용 ***
// onMounted, onUnmounted, renderer 생성/소멸 로직은 Composable 내부로 이동됨
const { isInitialized: isRendererInitialized } = useP5Renderer<
  BasisVisualizationState,
  P5BasisRenderer
>(
  canvasContainerRef,
  canvasWidth,
  canvasHeight,
  visualizationState, // computed ref 전달
  P5BasisRenderer,
  "P5BasisRenderer",
)

// --- 제거: Lifecycle Hooks (onMounted, onUnmounted) 에서 렌더러 직접 관리하는 코드 ---
/*
onMounted(async () => {
  // ... 이전 렌더러 생성/설정 코드 ...
});

onUnmounted(() => {
  // ... 이전 렌더러 소멸 코드 ...
});
*/

// --- 상태 변경 감지 및 계산/KaTeX 업데이트 ---
// 슬라이더 값 변경 시 계산 수행 (이전과 동일)
watch([slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val], () => {
  performCalculations() // 계산만 수행, 렌더링은 visualizationState 변경을 감지하는 Composable 내부 watch가 처리
})

// 계산 결과 변경 시 KaTeX 업데이트 (이전과 동일)
watch(
  calculated,
  () => {
    // --- 제거: updateVisualization(); // Composable 내부에서 처리
    updateKaTeXInfo()
  },
  { deep: true },
)

// --- 제거: Helper Function (updateVisualization) ---
/*
const updateVisualization = () => {
  // ... 이전 코드 ...
};
*/

// KaTeX 정보 업데이트 함수 (이전과 동일)
const updateKaTeXInfo = () => {
  // console.log('Updating KaTeX Info'); // 디버깅 로그
  updateInfoDOM(calculated, {
    el_primal_e1,
    el_primal_e2,
    el_matrix_m,
    el_determinant,
    el_dual_epsilon1,
    el_dual_epsilon2,
    el_matrix_m_inv,
  })
}

// Basis 리셋 함수 (이전과 동일)
const resetBasis = () => {
  slider_e1x_val.value = 1
  slider_e1y_val.value = 0
  slider_e2x_val.value = 0
  slider_e2y_val.value = 1
  // 슬라이더 값 변경 시 watch가 performCalculations를 호출하므로 여기서 직접 호출할 필요 없음
}

// 컴포넌트 마운트 시 초기 KaTeX 렌더링
// 렌더러 초기화와 별개로, calculated 객체가 준비되면 바로 KaTeX 렌더링 가능
onMounted(() => {
  // 초기 calculated 값으로 KaTeX 렌더링
  updateKaTeXInfo()
})
</script>
