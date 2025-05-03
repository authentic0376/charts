<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col space-y-4 p-4">
    <!-- Canvas Container (렌더러 Composable에 ref 전달) -->
    <div
      class="self-center border border-gray-300"
      ref="canvasContainerRef"
      id="canvas-container"
      :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
    >
      <!-- p5 캔버스가 여기에 생성됩니다 -->
      <!-- 렌더러 초기화 중 표시될 내용 -->
      <div
        v-if="!isRendererInitialized"
        class="flex h-full items-center justify-center text-gray-500"
      >
        Initializing visualization...
      </div>
    </div>

    <!-- Controls Container -->
    <div id="controls-container">
      <!-- 슬라이더 그리드 -->
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

    <!-- KaTeX Info Display Area -->
    <div
      id="info-container"
      class="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-center text-sm"
    >
      <!-- Primal Basis Section -->
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Primal Basis</h3>
        <div class="flex items-center justify-around">
          <span ref="el_primal_e1"></span><span ref="el_primal_e2"></span>
        </div>
      </div>
      <!-- Transformation Matrix Section -->
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Transformation Matrix</h3>
        <div class="flex items-center justify-around">
          <span ref="el_matrix_m"></span><span ref="el_determinant"></span>
        </div>
      </div>
      <!-- Dual Basis Section -->
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Dual Basis</h3>
        <div class="flex items-center justify-around">
          <span ref="el_dual_epsilon1"></span
          ><span ref="el_dual_epsilon2"></span>
        </div>
      </div>
      <!-- Inverse Matrix Section -->
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Inverse Matrix M⁻¹</h3>
        <div class="flex items-center justify-around">
          <span ref="el_matrix_m_inv"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import "katex/dist/katex.min.css" // KaTeX CSS import

// --- Constants ---
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/config/constants"

// --- Composables ---
import { useBasisTransformation } from "@/composables/useBasisTransformation"
import { useP5Renderer } from "@/composables/useP5Renderer" // P5 렌더러 관리 컴포저블

// --- KaTeX 렌더링 ---
import { updateInfoDOM } from "@/lib/katex/renderer"

// --- Renderer Class (Type Import Only) ---
// 실제 클래스는 동적으로 임포트하므로 여기서는 타입만 가져옴
import type { P5BasisRenderer } from "@/lib/p5/p5BasisRenderer"

// --- 인터페이스 ---
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"

// --- Template Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null) // 캔버스 부모 div
// KaTeX 렌더링 대상 요소 Refs
const el_primal_e1 = ref<HTMLElement | null>(null)
const el_primal_e2 = ref<HTMLElement | null>(null)
const el_matrix_m = ref<HTMLElement | null>(null)
const el_determinant = ref<HTMLElement | null>(null)
const el_dual_epsilon1 = ref<HTMLElement | null>(null)
const el_dual_epsilon2 = ref<HTMLElement | null>(null)
const el_matrix_m_inv = ref<HTMLElement | null>(null)

// --- 상태 관리 Composable 사용 ---
// 기저 변환 관련 상태 및 계산 로직
const {
  slider_e1x_val,
  slider_e1y_val,
  slider_e2x_val,
  slider_e2y_val, // 슬라이더 값 Refs
  calculated, // 계산 결과 (반응형 객체)
  performCalculations, // 계산 수행 함수
} = useBasisTransformation()

// --- 캔버스 크기 (Ref로 관리) ---
const canvasWidth = ref(CANVAS_WIDTH)
const canvasHeight = ref(CANVAS_HEIGHT)

// --- 렌더링 Composable에 전달할 상태 계산 ---
// useBasisTransformation의 calculated 결과를 BasisVisualizationState 형태로 매핑
const visualizationState = computed(
  (): BasisVisualizationState => ({
    e1: { x: calculated.e1.x, y: calculated.e1.y },
    e2: { x: calculated.e2.x, y: calculated.e2.y },
    epsilon1: { x: calculated.epsilon1.x, y: calculated.epsilon1.y },
    epsilon2: { x: calculated.epsilon2.x, y: calculated.epsilon2.y },
    detM: calculated.detM,
  }),
)

// --- 렌더러 관리 Composable 사용 ---
// useP5Renderer를 호출하여 렌더러 인스턴스 관리 및 상태 업데이트 처리
const { isInitialized: isRendererInitialized } = useP5Renderer<
  BasisVisualizationState, // 상태 타입
  P5BasisRenderer // 렌더러 타입 (타입 검사용)
>(
  canvasContainerRef, // 캔버스 컨테이너 Ref
  canvasWidth, // 캔버스 너비 Ref
  canvasHeight, // 캔버스 높이 Ref
  visualizationState, // 감시할 상태 (computed ref)
  // *** P5BasisRenderer 클래스를 동적으로 임포트하는 함수 전달 ***
  () =>
    import("@/lib/p5/p5BasisRenderer").then((module) => module.P5BasisRenderer),
  "P5BasisRenderer", // 로깅용 이름
)

// --- 상태 변경 감지 및 계산/KaTeX 업데이트 ---
// 슬라이더 값 변경 시 기저 변환 계산 수행
watch([slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val], () => {
  performCalculations()
  // 계산 결과(calculated)가 변경되면 visualizationState도 변경됨.
  // useP5Renderer 내부의 watch가 visualizationState 변경을 감지하여 자동으로 draw 호출
})

// 계산 결과(calculated) 변경 시 KaTeX 정보 업데이트
watch(
  calculated,
  () => {
    updateKaTeXInfo() // DOM 요소 업데이트는 여기서 직접 수행
  },
  { deep: true }, // 객체 내부 값 변경 감지
)

// --- Helper Functions ---

// KaTeX 정보 업데이트 함수
const updateKaTeXInfo = () => {
  // console.log('Updating KaTeX Info'); // 디버깅 로그
  // calculated 상태와 DOM 요소 Ref를 전달하여 KaTeX 렌더링
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

// Basis 리셋 함수
const resetBasis = () => {
  // 슬라이더 값을 초기 상태로 설정
  slider_e1x_val.value = 1
  slider_e1y_val.value = 0
  slider_e2x_val.value = 0
  slider_e2y_val.value = 1
  // 슬라이더 값 변경 시 watch 리스너가 자동으로 performCalculations를 호출함
}

// --- Lifecycle Hooks ---

// 컴포넌트 마운트 시 초기 KaTeX 렌더링
onMounted(() => {
  // 초기 calculated 값으로 KaTeX 정보 표시
  updateKaTeXInfo()
  // p5 렌더러 초기화는 useP5Renderer 내부의 onMounted에서 처리됨
})
</script>
