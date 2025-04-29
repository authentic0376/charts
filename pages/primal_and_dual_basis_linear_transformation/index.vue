<template>
  <div class="w-md flex flex-col space-y-2">

    <!-- Canvas Container -->
    <div class="self-center" ref="canvasContainerRef" id="canvas-container"></div>

    <!-- Controls Container (ClientOnly) -->
    <ClientOnly>
      <div ref="controlsContainerRef" id="controls-container">
        <div class="grid grid-cols-2 justify-items-center">
          <div><span>e₁.x</span>
            <div ref="slider_e1x_container"></div>
          </div>
          <div><span>e₂.x</span>
            <div ref="slider_e2x_container"></div>
          </div>
          <div><span>e₁.y</span>
            <div ref="slider_e1y_container"></div>
          </div>
          <div><span>e₂.y</span>
            <div ref="slider_e2y_container"></div>
          </div>
        </div>
        <div class="btn-container flex justify-end text-sm" ref="resetButtonContainer"></div>
      </div>
      <template #fallback>
        <div id="controls-container" style="/* Loading styles */">Loading controls...</div>
      </template>
    </ClientOnly>

    <!-- KaTeX Info Display Area -->
    <div id="info-container" class="grid grid-cols-2 gap-3 text-center text-xs">
      <div class="info-section">
        <h3 class="text-xl mb-2">Primal Basis</h3>
        <div class="flex justify-around items-center"><span ref="el_primal_e1"></span><span ref="el_primal_e2"></span></div>
      </div>
      <div class="info-section">
        <h3 class="text-xl mb-2">Transformation Matrix</h3>
        <div class="flex justify-around items-center"><span ref="el_matrix_m"></span><span ref="el_determinant"></span></div>
      </div>
      <div class="info-section">
        <h3 class="text-xl mb-2">Dual Basis</h3>
        <div class="flex justify-around items-center"><span ref="el_dual_epsilon1"></span><span ref="el_dual_epsilon2"></span></div>
      </div>
      <div class="info-section">
        <h3 class="text-xl mb-2">Inverse Matrix M⁻¹</h3>
        <div class="flex justify-around items-center"><span ref="el_matrix_m_inv"></span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted, watch, nextTick} from 'vue';
import type P5 from 'p5';
import 'katex/dist/katex.min.css'; // KaTeX CSS 는 여기서 import

// --- 분리된 모듈 Import ---
import {useBasisTransformation} from '@/composables/useBasisTransformation'; // 경로 주의
import {createP5Sketch} from '@/lib/p5/sketchManager'; // 경로 주의
import {updateInfoDOM} from '@/lib/katex/renderer'; // 경로 주의

// --- Template Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null);
const controlsContainerRef = ref<HTMLDivElement | null>(null); // p5 UI parent 용도 (ClientOnly 내부)
// Slider/Button 컨테이너 Refs (p5 스케치에 전달)
const slider_e1x_container = ref<HTMLDivElement | null>(null);
const slider_e1y_container = ref<HTMLDivElement | null>(null);
const slider_e2x_container = ref<HTMLDivElement | null>(null);
const slider_e2y_container = ref<HTMLDivElement | null>(null);
const resetButtonContainer = ref<HTMLDivElement | null>(null);
// KaTeX 요소 Refs (KaTeX 렌더러에 전달)
const el_primal_e1 = ref<HTMLElement | null>(null);
const el_primal_e2 = ref<HTMLElement | null>(null);
const el_matrix_m = ref<HTMLElement | null>(null);
const el_determinant = ref<HTMLElement | null>(null);
const el_dual_epsilon1 = ref<HTMLElement | null>(null);
const el_dual_epsilon2 = ref<HTMLElement | null>(null);
const el_matrix_m_inv = ref<HTMLElement | null>(null);


// --- Composable 사용 ---
const {
  slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val, // 슬라이더 값 Refs
  calculated,         // 계산 결과 (반응형)
  performCalculations // 계산 함수
} = useBasisTransformation();

// --- p5 Instance Variable ---
let p5Instance: P5 | null = null;

// --- Lifecycle Hooks ---
onMounted(async () => {
  try {
    // p5 동적 로드
    const p5Module = await import('p5');
    const p5 = p5Module.default;

    // 필요한 Ref들을 객체로 묶어 전달
    const uiContainers = {
      slider_e1x_container, slider_e1y_container,
      slider_e2x_container, slider_e2y_container,
      resetButtonContainer
    };
    const sliderValues = {slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val};

    // p5 스케치 함수 생성
    const sketch = createP5Sketch(
        calculated,     // 반응형 계산 결과 전달
        sliderValues,   // 반응형 슬라이더 값 전달
        uiContainers,   // UI 컨테이너 Ref 전달
        canvasContainerRef // 캔버스 컨테이너 Ref 전달
    );

    // DOM 준비 후 p5 인스턴스 생성
    await nextTick();
    if (canvasContainerRef.value && controlsContainerRef.value) { // controlsContainerRef 확인 추가
      p5Instance = new p5(sketch);
      // 초기 KaTeX 렌더링
      updateInfoDOM(calculated, {
        el_primal_e1,
        el_primal_e2,
        el_matrix_m,
        el_determinant,
        el_dual_epsilon1,
        el_dual_epsilon2,
        el_matrix_m_inv
      });
    } else {
      console.error("DOM containers for p5 not ready after dynamic import and nextTick.");
    }

  } catch (error) {
    console.error("Failed to load p5.js or initialize sketch:", error);
  }
});

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }
});

// --- Watcher ---
// 슬라이더 값 변경 시 계산 및 KaTeX 업데이트 수행
watch(
    [slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val],
    async () => {
      performCalculations(); // Composable 내부 함수 호출
      await nextTick(); // DOM 업데이트 보장 (특히 KaTeX 렌더링 전)
      // KaTeX 렌더링 함수 호출, 필요한 상태와 요소 Ref 전달
      updateInfoDOM(calculated, {
        el_primal_e1,
        el_primal_e2,
        el_matrix_m,
        el_determinant,
        el_dual_epsilon1,
        el_dual_epsilon2,
        el_matrix_m_inv
      });
    },
    {immediate: false} // 마운트 시 초기 렌더링은 onMounted에서 처리
);

</script>