// composables/useP5ShannonRenderer.ts
import {
  ref,
  shallowRef,
  onMounted,
  onUnmounted,
  watch,
  type Ref,
  nextTick,
} from "vue"
import type { IVisualizationRenderer } from "@/interfaces/rendering/IVisualizationRenderer"
import type { ShannonVisualizationState } from "@/interfaces/rendering/ShannonVisualizationState"
// P5ShannonRenderer는 이 Composable 내부에서만 import 합니다.
import { P5ShannonRenderer } from "@/lib/p5/p5ShannonRenderer"

/**
 * P5ShannonRenderer의 생성, 설정, 소멸 및 상태 기반 렌더링을 관리하는 Composable 함수.
 *
 * @param containerRef - 캔버스가 마운트될 HTML 요소의 Ref.
 * @param initialWidth - 캔버스의 초기 너비 Ref.
 * @param initialHeight - 캔버스의 초기 높이 Ref.
 * @param stateToWatch - 렌더링에 사용될 ShannonVisualizationState를 제공하는 Ref (computed 권장).
 * @returns 렌더러 초기화 상태 Ref.
 */
export function useP5ShannonRenderer(
  containerRef: Ref<HTMLElement | null>,
  initialWidth: Ref<number>,
  initialHeight: Ref<number>,
  stateToWatch: Ref<ShannonVisualizationState>,
) {
  const renderer =
    shallowRef<IVisualizationRenderer<ShannonVisualizationState> | null>(null)
  const isInitialized = ref(false)

  // 렌더러 초기화 함수
  const initialize = async () => {
    if (
      typeof window !== "undefined" &&
      containerRef.value &&
      !renderer.value
    ) {
      try {
        console.log("Attempting to initialize P5ShannonRenderer...")
        const p5Renderer = new P5ShannonRenderer() // 여기서 직접 생성
        await p5Renderer.setup(
          containerRef.value,
          initialWidth.value,
          initialHeight.value,
        )
        renderer.value = p5Renderer
        isInitialized.value = true
        console.log(
          "P5ShannonRenderer Initialized successfully via Composable.",
        )
      } catch (error) {
        console.error(
          "Failed to setup P5ShannonRenderer via Composable:",
          error,
        )
        isInitialized.value = false
      }
    } else if (renderer.value) {
      console.log("P5ShannonRenderer already initialized.")
    } else {
      console.warn(
        "P5ShannonRenderer initialization prerequisites not met (window, container, or already initialized).",
      )
    }
  }

  // 렌더러 정리 함수
  const cleanup = () => {
    if (renderer.value) {
      console.log("Cleaning up P5ShannonRenderer...")
      renderer.value.destroy()
      renderer.value = null
      isInitialized.value = false
      console.log("P5ShannonRenderer Cleaned up via Composable.")
    }
  }

  // 컴포넌트 라이프사이클과 연동
  onMounted(() => {
    nextTick(initialize)
  })
  onUnmounted(cleanup)

  // 주입된 상태(stateToWatch) 변경 감지 및 렌더링 호출
  watch(
    stateToWatch,
    (newState) => {
      // 렌더러가 초기화되었을 때만 draw 호출
      if (renderer.value && isInitialized.value) {
        // Shannon state는 데이터 양이 많으므로, 실제 변경 감지 로직을 추가하면 성능 개선 가능
        // console.log('Shannon state changed, triggering draw.');
        // 상태 객체에 canvas 크기 정보가 포함되어 있으므로 그대로 전달
        renderer.value.draw(newState)
      }
    },
    { deep: true },
  )

  // 초기화 완료 후 첫 렌더링 트리거
  watch(
    isInitialized,
    (ready) => {
      if (ready && renderer.value) {
        console.log("Shannon Renderer is ready, triggering initial draw.")
        renderer.value.draw(stateToWatch.value)
      }
    },
    { immediate: false },
  )

  // 리사이즈 처리 함수 (필요시)
  const resizeRenderer = (width: number, height: number) => {
    if (renderer.value?.resize && isInitialized.value) {
      console.log(`Resizing Shannon Renderer to ${width}x${height}`)
      renderer.value.resize(width, height)
      // 리사이즈 후 현재 상태로 다시 그리기 (resize 내부에서 redraw 안 할 경우)
      // renderer.value.draw(stateToWatch.value);
    }
  }

  // 외부에서는 초기화 상태와 resize 함수 노출 (예시)
  return {
    isInitialized,
    resizeRenderer, // 예시로 노출
  }
}
