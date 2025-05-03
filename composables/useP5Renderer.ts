// composables/useP5Renderer.ts
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

// 제네릭 타입 정의:
// TState: 렌더러가 사용할 상태 객체의 타입
// TRenderer: IVisualizationRenderer<TState>를 구현하는 구체적인 렌더러 클래스 타입
interface RendererConstructor<
  TState,
  TRenderer extends IVisualizationRenderer<TState>,
> {
  new (): TRenderer // 인자 없는 생성자 시그니처
}

// 동적으로 렌더러 생성자를 로드하는 함수 타입
type RendererImportFn<
  TState,
  TRenderer extends IVisualizationRenderer<TState>,
> = () => Promise<RendererConstructor<TState, TRenderer>>

/**
 * 특정 p5.js 기반 시각화 렌더러의 생성, 설정, 소멸 및 상태 기반 렌더링을
 * 관리하는 제네릭 Composable 함수. 렌더러 클래스를 동적으로 임포트합니다.
 *
 * @template TState - 렌더링에 사용될 상태 객체의 타입.
 * @template TRenderer - IVisualizationRenderer<TState>를 구현하는 렌더러 클래스 타입.
 * @param containerRef - 캔버스가 마운트될 HTML 요소의 Ref.
 * @param initialWidth - 캔버스의 초기 너비 Ref.
 * @param initialHeight - 캔버스의 초기 높이 Ref.
 * @param stateToWatch - 렌더링에 사용될 TState 타입의 상태를 제공하는 Ref.
 * @param RendererImportFn - 사용할 렌더러 클래스의 생성자를 비동기적으로 반환하는 함수.
 * @param rendererName - 로깅을 위한 렌더러 이름 (선택적).
 * @returns 렌더러 초기화 상태 Ref, 리사이즈 함수, 그리고 렌더러 인스턴스 Ref.
 */
export function useP5Renderer<
  TState,
  TRenderer extends IVisualizationRenderer<TState>,
>(
  containerRef: Ref<HTMLElement | null>,
  initialWidth: Ref<number>,
  initialHeight: Ref<number>,
  stateToWatch: Ref<TState>, // 상태 변경 감지용 watch는 유지
  RendererImportFn: RendererImportFn<TState, TRenderer>,
  rendererName: string = "P5Renderer",
) {
  const renderer = shallowRef<TRenderer | null>(null) // renderer 자체를 노출
  const isInitialized = ref(false)

  const initialize = async () => {
    if (
      typeof window !== "undefined" &&
      containerRef.value &&
      !renderer.value
    ) {
      try {
        console.log(`Attempting to initialize ${rendererName}...`)
        const RendererConstructor = await RendererImportFn()
        if (!RendererConstructor) {
          throw new Error(`Failed to dynamically import ${rendererName} class.`)
        }
        const p5RendererInstance = new RendererConstructor()

        // Setup the renderer instance
        await p5RendererInstance.setup(
          containerRef.value,
          initialWidth.value,
          initialHeight.value,
        )

        // Store the instance and set initialized flag ONLY
        renderer.value = p5RendererInstance
        isInitialized.value = true // <-- Set flag to true
        console.log(`${rendererName} Initialized successfully via Composable.`)

        // --- REMOVED initial draw call from here ---
        // Initial draw will be triggered by the component watching isInitialized
      } catch (error) {
        console.error(`Failed to setup ${rendererName} via Composable:`, error)
        renderer.value = null
        isInitialized.value = false
      }
    } else if (renderer.value) {
      console.log(`${rendererName} already initialized.`)
    } else if (typeof window === "undefined") {
      console.log(
        `${rendererName} initialization skipped on server-side rendering.`,
      )
    } else {
      console.warn(
        `${rendererName} initialization prerequisites not met (container missing?).`,
      )
    }
  }

  const cleanup = () => {
    if (renderer.value) {
      console.log(`Cleaning up ${rendererName}...`)
      renderer.value.destroy()
      renderer.value = null
      isInitialized.value = false
      console.log(`${rendererName} Cleaned up via Composable.`)
    }
  }

  onMounted(() => {
    // Ensure DOM is ready before initializing
    nextTick(initialize)
  })
  onUnmounted(cleanup)

  // Watch for state changes *after* initialization for subsequent draws
  watch(
    stateToWatch,
    (newState) => {
      if (renderer.value && isInitialized.value) {
        // Subsequent draws based on state changes
        // console.log(`${rendererName} state changed, triggering draw.`);
        renderer.value.draw(newState)
      }
    },
    { deep: true, flush: "post" }, // Use 'post' flush to wait for DOM updates if needed
  )

  // --- REMOVED watch(isInitialized) for initial draw ---
  // The component (`index.vue`) is now responsible for the initial draw
  // by watching `isInitialized` and calling `renderer.value.draw`.

  const resizeRenderer = (width: number, height: number) => {
    if (renderer.value?.resize && isInitialized.value) {
      console.log(`Resizing ${rendererName} to ${width}x${height}`)
      renderer.value.resize(width, height)
      // Optional: Trigger a draw after resize if state hasn't changed
      // renderer.value.draw(stateToWatch.value);
    } else if (isInitialized.value) {
      console.warn(
        `${rendererName} does not support resize method or is not initialized.`,
      )
    }
  }

  // Expose initialization status, resize function, and the renderer instance itself
  return {
    isInitialized,
    resizeRenderer,
    renderer, // <-- Expose the renderer instance ref
  }
}
