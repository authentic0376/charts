<!-- pages/primal_and_dual_basis_linear_transformation/index.vue -->
<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col space-y-4 p-4">
    <!-- Canvas Container -->
    <div
      class="self-center border border-gray-300"
      ref="canvasContainerRef"
      id="canvas-container"
      :style="{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        cursor: 'crosshair',
      }"
      title="Click to set the green vector 'v'"
    >
      <div
        v-if="!isRendererInitialized"
        class="flex h-full items-center justify-center text-gray-500"
      >
        Initializing visualization...
      </div>
      <!-- Canvas는 useP5Renderer/p5BasisRenderer 내부에서 생성됩니다 -->
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
          @click="resetBasisAndVector"
          class="rounded bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Reset Basis & Vector
        </button>
      </div>
    </div>

    <!-- KaTeX Info Display Area -->
    <div
      id="info-container"
      class="mt-4 flex flex-col gap-4 border-t pt-4 text-center text-sm text-nowrap"
    >
      <!-- Basis transformation -->
      <div class="info-section grid grid-cols-[1fr_3fr] gap-4">
        <h3 ref="basis_transformation" class="mb-2 text-lg font-semibold">
          Primal Basis
        </h3>
        <div class="flex items-center justify-around">
          <span ref="basis_transformation_value"></span>
        </div>
      </div>
      <!-- Dual Basis Transformation -->
      <div class="info-section grid grid-cols-[1fr_3fr] gap-4">
        <h3 ref="dual_basis_transformation" class="mb-2 text-lg font-semibold">
          Transformation Matrix M
        </h3>
        <div class="flex items-center justify-around">
          <span ref="dual_basis_transformation_value"></span>
        </div>
      </div>
      <!-- Inverse Matrix Section -->
      <div class="info-section grid grid-cols-[1fr_3fr] gap-4">
        <h3
          ref="contravariant_component_transformation"
          class="mb-2 text-lg font-semibold"
        >
          Inverse Matrix M⁻¹
        </h3>
        <div class="flex items-center justify-around">
          <span ref="contravariant_component_transformation_value"></span>
        </div>
      </div>
      <!-- Dual Basis Section -->
      <div class="info-section grid grid-cols-[1fr_3fr] gap-4">
        <h3
          ref="covariant_component_transformation"
          class="mb-2 text-lg font-semibold"
        >
          Dual Basis
        </h3>
        <div class="flex flex-col items-center justify-around">
          <span ref="covariant_component_transformation_value"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue"
import "katex/dist/katex.min.css"

// --- Constants, Composables, KaTeX, Types, Interfaces ---
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/config/constants"
import { useBasisTransformation } from "@/composables/useBasisTransformation"
import { useP5Renderer } from "@/composables/useP5Renderer"
import { initializeLabelDOM, updateInfoDOM } from "@/lib/katex/renderer"
import type { P5BasisRenderer } from "@/lib/p5/p5BasisRenderer"
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"

// --- Template Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const el_primal_e2 = ref<HTMLElement | null>(null)
const el_determinant = ref<HTMLElement | null>(null)
const el_dual_epsilon1 = ref<HTMLElement | null>(null)
const el_dual_epsilon2 = ref<HTMLElement | null>(null)
const el_matrix_m_inv = ref<HTMLElement | null>(null)

const basis_transformation_value = ref<HTMLElement | null>(null)
const dual_basis_transformation_value = ref<HTMLElement | null>(null)

const el_v_std = ref<HTMLElement | null>(null)
const contravariant_component_transformation_value = ref<HTMLElement | null>(
  null,
)
const covariant_component_transformation_value = ref<HTMLElement | null>(null)

// --- Label Refs ---
const basis_transformation = ref<HTMLElement | null>(null)
const dual_basis_transformation = ref<HTMLElement | null>(null)
const contravariant_component_transformation = ref<HTMLElement | null>(null)
const covariant_component_transformation = ref<HTMLElement | null>(null)

// --- 상태 관리 Composable 사용 ---
const {
  slider_e1x_val,
  slider_e1y_val,
  slider_e2x_val,
  slider_e2y_val,
  input_vx_val, // Vector v의 x 좌표 Ref (p5에서 업데이트)
  input_vy_val, // Vector v의 y 좌표 Ref (p5에서 업데이트)
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
const initializeKaTeXLabel = () => {
  initializeLabelDOM({
    basis_transformation,
    dual_basis_transformation,
    contravariant_component_transformation,
    covariant_component_transformation,
  })
}
const updateKaTeXInfo = () => {
  updateInfoDOM(calculated, {
    basis_transformation_value,
    el_primal_e2,
    dual_basis_transformation_value,
    el_determinant,
    el_dual_epsilon1,
    el_dual_epsilon2,
    el_matrix_m_inv,
    el_v_std,
    contravariant_component_transformation_value:
      contravariant_component_transformation_value,
    covariant_component_transformation_value:
      covariant_component_transformation_value,
  })
}

/**
 * 기저 벡터와 데이터 벡터(v)를 모두 초기 상태로 리셋합니다.
 */
const resetBasisAndVector = () => {
  // 기저 벡터 리셋
  slider_e1x_val.value = 1
  slider_e1y_val.value = 0
  slider_e2x_val.value = 0
  slider_e2y_val.value = 1
  // 데이터 벡터(v) 리셋
  input_vx_val.value = 1 // 초기 x 값
  input_vy_val.value = 1 // 초기 y 값
}

// --- 렌더러 관리 Composable 사용 ---
const {
  isInitialized: isRendererInitialized,
  renderer, // 렌더러 인스턴스 Ref
} = useP5Renderer<BasisVisualizationState, P5BasisRenderer>(
  canvasContainerRef,
  canvasWidth,
  canvasHeight,
  visualizationState, // 상태 변경 감지용
  () =>
    import("@/lib/p5/p5BasisRenderer").then((module) => module.P5BasisRenderer),
  "P5BasisRenderer",
)

// --- 상태 변경 감지 및 KaTeX 업데이트 ---
watch(
  calculated,
  () => {
    updateKaTeXInfo()
    // p5 렌더링은 useP5Renderer 내부의 watch가 처리
  },
  { deep: true },
)

// --- Lifecycle Hooks ---
onMounted(() => {
  // 1. 초기 KaTeX 렌더링
  initializeKaTeXLabel()
  updateKaTeXInfo()

  // 2. 렌더러 초기화 감지 및 설정
  const stopWatchInit = watch(
    isRendererInitialized,
    async (initialized) => {
      if (initialized && renderer.value) {
        console.log(
          "P5 Renderer initialized. Setting vector refs and triggering initial draw.",
        )
        // --- 중요: P5BasisRenderer에 Vector v Ref 전달 ---
        // renderer.value가 P5BasisRenderer 인스턴스라고 가정
        if (typeof renderer.value.setVectorRefs === "function") {
          renderer.value.setVectorRefs(input_vx_val, input_vy_val)
          console.log("Vector refs passed to P5BasisRenderer.")
        } else {
          console.error(
            "setVectorRefs method not found on the renderer instance.",
          )
        }

        // 초기 상태로 첫 그리기 실행
        await nextTick()
        renderer.value.draw(visualizationState.value)

        // 초기화 후 감시 중지
        stopWatchInit()
      }
    },
    { immediate: true }, // 이미 초기화되었을 수 있으므로 즉시 실행
  )
})
</script>
