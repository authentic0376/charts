// composables/useP5BasisRenderer.ts
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
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"
// P5BasisRenderer는 이 Composable 내부에서만 import 합니다.
import { P5BasisRenderer } from "@/lib/p5/p5BasisRenderer"

/**
 * P5BasisRenderer의 생성, 설정, 소멸 및 상태 기반 렌더링을 관리하는 Composable 함수.
 *
 * @param containerRef - 캔버스가 마운트될 HTML 요소의 Ref.
 * @param initialWidth - 캔버스의 초기 너비 Ref.
 * @param initialHeight - 캔버스의 초기 높이 Ref.
 * @param stateToWatch - 렌더링에 사용될 BasisVisualizationState를 제공하는 Ref (computed 권장).
 * @returns 렌더러 초기화 상태 Ref.
 */
export function useP5BasisRenderer(
  containerRef: Ref<HTMLElement | null>,
  initialWidth: Ref<number>,
  initialHeight: Ref<number>,
  stateToWatch: Ref<BasisVisualizationState>,
) {
  const renderer =
    shallowRef<IVisualizationRenderer<BasisVisualizationState> | null>(null)
  const isInitialized = ref(false)

  // 렌더러 초기화 함수
  const initialize = async () => {
    // 브라우저 환경이고, 컨테이너가 존재하며, 렌더러가 아직 생성되지 않았을 때만 실행
    if (
      typeof window !== "undefined" &&
      containerRef.value &&
      !renderer.value
    ) {
      try {
        console.log("Attempting to initialize P5BasisRenderer...")
        const p5Renderer = new P5BasisRenderer() // 여기서 직접 생성
        await p5Renderer.setup(
          containerRef.value,
          initialWidth.value,
          initialHeight.value,
        )
        renderer.value = p5Renderer
        isInitialized.value = true // 초기화 완료 상태로 변경
        console.log("P5BasisRenderer Initialized successfully via Composable.")
      } catch (error) {
        console.error("Failed to setup P5BasisRenderer via Composable:", error)
        isInitialized.value = false // 실패 시 상태 업데이트
      }
    } else if (renderer.value) {
      console.log("P5BasisRenderer already initialized.")
    } else {
      console.warn(
        "P5BasisRenderer initialization prerequisites not met (window, container, or already initialized).",
      )
    }
  }

  // 렌더러 정리 함수
  const cleanup = () => {
    if (renderer.value) {
      console.log("Cleaning up P5BasisRenderer...")
      renderer.value.destroy()
      renderer.value = null
      isInitialized.value = false // 정리 후 상태 업데이트
      console.log("P5BasisRenderer Cleaned up via Composable.")
    }
  }

  // 컴포넌트 라이프사이클과 연동: 마운트 시 초기화, 언마운트 시 정리
  onMounted(() => {
    // nextTick을 사용하여 DOM 요소가 확실히 준비된 후 초기화 시도
    nextTick(initialize)
  })
  onUnmounted(cleanup)

  // 주입된 상태(stateToWatch) 변경 감지 및 렌더링 호출
  watch(
    stateToWatch,
    (newState, oldState) => {
      // 렌더러가 초기화되었고, 실제 상태가 변경되었을 때만 draw 호출
      if (renderer.value && isInitialized.value) {
        // 성능을 위해 실제 변경이 있을 때만 그리는 것이 좋지만,
        // BasisVisualizationState 구조가 단순하므로 매번 호출해도 무방할 수 있음.
        // 필요시 deep comparison 로직 추가 가능.
        // console.log('State changed, triggering draw:', newState);
        renderer.value.draw(newState)
      }
    },
    { deep: true },
  ) // 객체 내부 값 변경 감지를 위해 deep watch 사용

  // 초기화 완료 후 첫 렌더링 트리거
  watch(
    isInitialized,
    (ready) => {
      if (ready && renderer.value) {
        console.log("Renderer is ready, triggering initial draw.")
        // 초기 상태 값으로 첫 draw 호출
        renderer.value.draw(stateToWatch.value)
      }
    },
    { immediate: false },
  ) // immediate: true 시 초기화 전에 호출될 수 있으므로 false로 설정

  // 필요에 따라 resize 같은 함수도 노출 가능
  // const resizeRenderer = (width: number, height: number) => { ... }

  // 외부에서는 초기화 상태만 알면 됨 (필요시 renderer 인스턴스 등 추가 노출 가능)
  return {
    isInitialized,
    // resizeRenderer // 필요시 노출
  }
}
