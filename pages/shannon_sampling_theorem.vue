<template>
  <!-- p5 캔버스가 마운트될 DOM 요소 -->
  <!-- 마우스 이벤트를 감지하기 위해 @mousemove 추가 -->
  <div
      ref="canvasContainerRef"
      class="shannon-canvas-container"
      :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, cursor: 'ew-resize', margin: 'auto' }"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
  >
    <!-- Canvas will be created here by p5 -->
  </div>
  <!-- Optional: Display Fs value outside canvas for debugging/info -->
  <!-- <div v-if="samplingState" style="text-align: center; margin-top: 10px;">
      Current Fs: {{ samplingState.state.samplingFrequency.toFixed(2) }} Hz
  </div> -->
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { ShannonVisualizationState } from '@/interfaces/rendering/ShannonVisualizationState';
import * as constants from '@/config/shannonConstants';
import type {IVisualizationRenderer} from "~/interfaces/rendering/IVisualizationRenderer";

// --- Refs ---
const canvasContainerRef = ref<HTMLDivElement | null>(null);
const renderer = shallowRef<IVisualizationRenderer<ShannonVisualizationState> | null>(null);
const isMouseInside = ref(false); // Track if mouse is over the canvas area

// --- Constants ---
// Use constants for initial dimensions, allowing potential future resize logic
const canvasWidth = ref(constants.SHANNON_CANVAS_WIDTH);
const canvasHeight = ref(constants.SHANNON_CANVAS_HEIGHT);

// --- Composables ---
const samplingState = useShannonSampling();

// --- Lifecycle Hooks ---
onMounted(async () => {
  if (typeof window !== 'undefined' && canvasContainerRef.value) {
    try {
      // Dynamically import the renderer only on the client-side
      const { P5ShannonRenderer } = await import('@/lib/p5/p5ShannonRenderer');
      const p5Renderer = new P5ShannonRenderer();
      await p5Renderer.setup(canvasContainerRef.value, canvasWidth.value, canvasHeight.value);
      renderer.value = p5Renderer;

      // Initial draw call after setup
      triggerDraw();

    } catch (error) {
      console.error("Failed to load or setup P5ShannonRenderer:", error);
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
  // Cleanup if any global listeners were added (though mousemove is on the element here)
});

// --- Watchers ---
// Watch the reactive state from the composable and trigger redraw
watch(
    () => samplingState.state, // Watch the entire readonly state object
    async () => {
      await nextTick(); // Ensure DOM updates (if any) are processed first
      triggerDraw();
    },
    { deep: true } // Necessary because we are watching an object
);

// --- Event Handlers ---
const handleMouseMove = (event: MouseEvent) => {
  if (canvasContainerRef.value) {
    isMouseInside.value = true;
    const rect = canvasContainerRef.value.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // Get mouse X relative to the container
    samplingState.setMouseX(mouseX); // Update mouse position in the composable
  }
};

const handleMouseLeave = () => {
  isMouseInside.value = false;
  // Optional: Decide what happens when mouse leaves
  // e.g., keep the last frequency, or reset to a default.
  // Current composable keeps the last value.
};

// --- Helper Functions ---
const triggerDraw = () => {
  if (renderer.value) {
    // Create the state object expected by the renderer
    const currentState: ShannonVisualizationState = {
      ...samplingState.state, // Spread the reactive state properties
      canvasWidth: canvasWidth.value,
      canvasHeight: canvasHeight.value,
    };
    renderer.value.draw(currentState);
  }
};

// Optional: Handle window resize if the canvas should adapt
// onMounted(() => { window.addEventListener('resize', handleResize); });
// onUnmounted(() => { window.removeEventListener('resize', handleResize); });
// const handleResize = () => {
//   if (canvasContainerRef.value && renderer.value?.resize) {
//     canvasWidth.value = canvasContainerRef.value.offsetWidth;
//     // Maybe adjust height proportionally or keep fixed
//     canvasHeight.value = constants.SHANNON_CANVAS_HEIGHT; // Example: fixed height
//     samplingState.setCanvasWidth(canvasWidth.value); // Inform composable
//     renderer.value.resize(canvasWidth.value, canvasHeight.value);
//     triggerDraw(); // Redraw after resize
//   }
// };

</script>

<style scoped>
/* Add any specific styles for the container if needed */
.shannon-canvas-container {
  border: 1px solid #ccc; /* Optional: visual border */
  display: block; /* Ensure it behaves like a block element */
}
</style>