<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col  p-4 space-y-4">

    <!-- Canvas Container -->
    <div class="self-center border border-gray-300" ref="canvasContainerRef" id="canvas-container"
         :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }">
    </div>

    <!-- Controls Container -->
    <div id="controls-container">
      <div class="grid grid-cols-2 items-center justify-items-stretch gap-x-8 gap-y-4">
        <!-- e1.x Slider -->
        <div class="flex flex-col">
          <label for="slider_e1x" class="text-sm font-medium">e₁.x: {{ slider_e1x_val.toFixed(1) }}</label>
          <!-- Tailwind class 'h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700' 가 트랙 스타일 담당 -->
          <input id="slider_e1x" type="range" min="-2" max="2" step="0.1" v-model.number="slider_e1x_val"
                 class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"/>
        </div>
        <!-- e2.x Slider -->
        <div class="flex flex-col">
          <label for="slider_e2x" class="text-sm font-medium">e₂.x: {{ slider_e2x_val.toFixed(1) }}</label>
          <input id="slider_e2x" type="range" min="-2" max="2" step="0.1" v-model.number="slider_e2x_val"
                 class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"/>
        </div>
        <!-- e1.y Slider -->
        <div class="flex flex-col">
          <label for="slider_e1y" class="text-sm font-medium">e₁.y: {{ slider_e1y_val.toFixed(1) }}</label>
          <input id="slider_e1y" type="range" min="-2" max="2" step="0.1" v-model.number="slider_e1y_val"
                 class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"/>
        </div>
        <!-- e2.y Slider -->
        <div class="flex flex-col">
          <label for="slider_e2y" class="text-sm font-medium">e₂.y: {{ slider_e2y_val.toFixed(1) }}</label>
          <input id="slider_e2y" type="range" min="-2" max="2" step="0.1" v-model.number="slider_e2y_val"
                 class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"/>
        </div>
      </div>
      <!-- Reset Button -->
      <div class="mt-4 flex justify-end">
        <button @click="resetBasis"
                class="rounded bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Reset Basis
        </button>
      </div>
    </div>

    <!-- KaTeX Info Display Area -->
    <div id="info-container" class="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-center text-sm">
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Primal Basis</h3>
        <div class="flex items-center justify-around"><span ref="el_primal_e1"></span><span ref="el_primal_e2"></span>
        </div>
      </div>
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Transformation Matrix</h3>
        <div class="flex items-center justify-around"><span ref="el_matrix_m"></span><span ref="el_determinant"></span>
        </div>
      </div>
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Dual Basis</h3>
        <div class="flex items-center justify-around"><span ref="el_dual_epsilon1"></span><span
            ref="el_dual_epsilon2"></span></div>
      </div>
      <div class="info-section">
        <h3 class="mb-2 text-lg font-semibold">Inverse Matrix M⁻¹</h3>
        <div class="flex items-center justify-around"><span ref="el_matrix_m_inv"></span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, shallowRef, onMounted, onUnmounted, watch, nextTick} from 'vue';
import 'katex/dist/katex.min.css'; // KaTeX CSS import

// --- Constants ---
import {CANVAS_WIDTH, CANVAS_HEIGHT} from '@/config/constants';

// --- KaTeX 렌더링 ---
import {updateInfoDOM} from '@/lib/katex/renderer';

// --- 렌더링 인터페이스 및 구현체 ---
import type {IVisualizationRenderer} from '@/interfaces/rendering/IVisualizationRenderer';
import type {BasisVisualizationState} from '@/interfaces/rendering/BasisVisualizationState';

// --- Template Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null); // 캔버스 부모 div
// KaTeX 요소 Refs
const el_primal_e1 = ref<HTMLElement | null>(null);
const el_primal_e2 = ref<HTMLElement | null>(null);
const el_matrix_m = ref<HTMLElement | null>(null);
const el_determinant = ref<HTMLElement | null>(null);
const el_dual_epsilon1 = ref<HTMLElement | null>(null);
const el_dual_epsilon2 = ref<HTMLElement | null>(null);
const el_matrix_m_inv = ref<HTMLElement | null>(null);


// --- Composable 사용 (상태 관리) ---
const {
  slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val, // 슬라이더 값 Refs (v-model용)
  calculated,         // 계산 결과 (반응형)
  performCalculations // 계산 함수
} = useBasisTransformation();

// --- 렌더러 인스턴스 ---
const renderer = shallowRef<IVisualizationRenderer<BasisVisualizationState> | null>(null);

// --- 캔버스 크기 (상수로 관리) ---
const canvasWidth = ref(CANVAS_WIDTH);
const canvasHeight = ref(CANVAS_HEIGHT);

// --- Lifecycle Hooks ---
onMounted(async () => {
  if (typeof window !== 'undefined' && canvasContainerRef.value) {
    try {
      const {P5BasisRenderer} = await import('@/lib/p5/p5BasisRenderer');
      const p5Renderer = new P5BasisRenderer();
      await p5Renderer.setup(canvasContainerRef.value, canvasWidth.value, canvasHeight.value);
      renderer.value = p5Renderer;
      updateVisualization();
      updateKaTeXInfo();
    } catch (error) {
      console.error("Failed to load or setup P5BasisRenderer:", error);
    }
  } else {
    console.error("Cannot setup renderer: Not in browser environment or canvas container not found.");
  }
});

onUnmounted(() => {
  if (renderer.value) {
    renderer.value.destroy();
    renderer.value = null;
  }
});

// --- 상태 변경 감지 및 업데이트 ---
watch(
    calculated,
    async () => {
      await nextTick();
      updateVisualization();
      updateKaTeXInfo();
    },
    {deep: true}
);

watch(
    [slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val],
    () => {
      performCalculations();
    }
);


// --- Helper Functions ---

const updateVisualization = () => {
  if (renderer.value) {
    const currentState: BasisVisualizationState = {
      e1: {x: calculated.e1.x, y: calculated.e1.y},
      e2: {x: calculated.e2.x, y: calculated.e2.y},
      epsilon1: {x: calculated.epsilon1.x, y: calculated.epsilon1.y},
      epsilon2: {x: calculated.epsilon2.x, y: calculated.epsilon2.y},
      detM: calculated.detM
    };
    renderer.value.draw(currentState);
  }
};

const updateKaTeXInfo = () => {
  updateInfoDOM(calculated, {
    el_primal_e1,
    el_primal_e2,
    el_matrix_m,
    el_determinant,
    el_dual_epsilon1,
    el_dual_epsilon2,
    el_matrix_m_inv
  });
};

const resetBasis = () => {
  slider_e1x_val.value = 1;
  slider_e1y_val.value = 0;
  slider_e2x_val.value = 0;
  slider_e2y_val.value = 1;
};

</script>