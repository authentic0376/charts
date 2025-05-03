<!-- pages/primal_and_dual_basis_linear_transformation/index.vue -->
<template>
  <!-- ... (template remains the same) ... -->
  <div class="mx-auto flex w-full max-w-2xl flex-col space-y-4 p-4">
    <!-- Canvas Container -->
    <div
      class="self-center border border-gray-300"
      ref="canvasContainerRef"
      id="canvas-container"
      :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
    >
      <div
        v-if="!isRendererInitialized"
        class="flex h-full items-center justify-center text-gray-500"
      >
        Initializing visualization...
      </div>
    </div>

    <!-- Controls Container -->
    <div id="controls-container">
      <!-- Basis Sliders Grid -->
      <h3 class="mb-2 text-lg font-semibold">Basis Vectors (e₁, e₂)</h3>
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

      <!-- Vector v Input Form -->
      <h3 class="mt-4 mb-2 border-t pt-4 text-lg font-semibold">
        Vector v (Standard Basis Components)
      </h3>
      <div
        class="grid grid-cols-2 items-center justify-items-stretch gap-x-8 gap-y-4"
      >
        <div class="flex flex-col">
          <label for="input_vx" class="text-sm font-medium"
            >v.x (std): {{ input_vx_val.toFixed(1) }}</label
          >
          <input
            id="input_vx"
            type="range"
            min="-3"
            max="3"
            step="0.1"
            v-model.number="input_vx_val"
            class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-green-200 dark:bg-green-700"
          />
        </div>
        <div class="flex flex-col">
          <label for="input_vy" class="text-sm font-medium"
            >v.y (std): {{ input_vy_val.toFixed(1) }}</label
          >
          <input
            id="input_vy"
            type="range"
            min="-3"
            max="3"
            step="0.1"
            v-model.number="input_vy_val"
            class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-green-200 dark:bg-green-700"
          />
        </div>
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
        <h3 class="mb-2 text-lg font-semibold">Transformation Matrix M</h3>
        <div class="flex items-center justify-around">
          <span ref="el_matrix_m"></span><span ref="el_determinant"></span>
        </div>
      </div>
      <!-- Inverse Matrix Section -->
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Inverse Matrix M⁻¹</h3>
        <div class="flex items-center justify-around">
          <span ref="el_matrix_m_inv"></span>
        </div>
      </div>
      <!-- Dual Basis Section -->
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Dual Basis</h3>
        <div class="flex flex-col items-center justify-around">
          <span ref="el_dual_epsilon1"></span
          ><span ref="el_dual_epsilon2"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue" // nextTick import
import "katex/dist/katex.min.css"

// --- Constants, Composables, KaTeX, Types, Interfaces ---
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/config/constants"
import { useBasisTransformation } from "@/composables/useBasisTransformation"
import { useP5Renderer } from "@/composables/useP5Renderer"
import { updateInfoDOM } from "@/lib/katex/renderer"
import type { P5BasisRenderer } from "@/lib/p5/p5BasisRenderer"
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"

// --- Template Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null)
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
  slider_e2y_val,
  input_vx_val,
  input_vy_val,
  calculated,
} = useBasisTransformation()

// --- 캔버스 크기 ---
const canvasWidth = ref(CANVAS_WIDTH)
const canvasHeight = ref(CANVAS_HEIGHT)

// --- 렌더링 Composable에 전달할 상태 계산 ---
const visualizationState = computed(
  (): BasisVisualizationState => ({
    e1: { x: calculated.e1.x, y: calculated.e1.y },
    e2: { x: calculated.e2.x, y: calculated.e2.y },
    epsilon1: { x: calculated.epsilon1.x, y: calculated.epsilon1.y },
    epsilon2: { x: calculated.epsilon2.x, y: calculated.epsilon2.y },
    detM: calculated.detM,
    v_std: { x: calculated.v_std.x, y: calculated.v_std.y },
    v_primal: { x: calculated.v_primal.x, y: calculated.v_primal.y },
    v_dual: { x: calculated.v_dual.x, y: calculated.v_dual.y },
  }),
)

// --- Helper Functions ---
const updateKaTeXInfo = () => {
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
const resetBasis = () => {
  slider_e1x_val.value = 1
  slider_e1y_val.value = 0
  slider_e2x_val.value = 0
  slider_e2y_val.value = 1
}

// --- 렌더러 관리 Composable 사용 ---
const {
  isInitialized: isRendererInitialized,
  renderer, // <-- Get the renderer instance ref
} = useP5Renderer<BasisVisualizationState, P5BasisRenderer>(
  canvasContainerRef,
  canvasWidth,
  canvasHeight,
  visualizationState, // For subsequent state changes
  () =>
    import("@/lib/p5/p5BasisRenderer").then((module) => module.P5BasisRenderer),
  "P5BasisRenderer",
)

// --- 상태 변경 감지 및 KaTeX 업데이트 ---
// Watch for changes in calculated state to update KaTeX
watch(
  calculated,
  (newState) => {
    updateKaTeXInfo()
    // Subsequent p5 draws are handled by the watch inside useP5Renderer
  },
  { deep: true },
)

// --- Lifecycle Hooks ---
onMounted(() => {
  // 1. Render initial KaTeX after DOM is ready
  updateKaTeXInfo()

  // 2. Watch for renderer initialization and trigger the *first* p5 draw
  const stopWatchInit = watch(
    isRendererInitialized,
    async (initialized) => {
      if (initialized && renderer.value) {
        console.log(
          "P5 Renderer initialized, triggering initial draw via onMounted watch.",
        )
        // Wait for Vue to process pending state updates (especially computed)
        await nextTick()
        // Explicitly call draw with the current state for the initial render
        renderer.value.draw(visualizationState.value)
        // Stop watching after the first successful draw
        stopWatchInit()
      }
    },
    { immediate: true },
  ) // Use immediate: true to potentially catch if already initialized
})
</script>
