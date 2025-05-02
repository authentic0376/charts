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

/**
 * 특정 p5.js 기반 시각화 렌더러의 생성, 설정, 소멸 및 상태 기반 렌더링을
 * 관리하는 제네릭 Composable 함수.
 *
 * @template TState - 렌더링에 사용될 상태 객체의 타입.
 * @template TRenderer - IVisualizationRenderer<TState>를 구현하는 렌더러 클래스 타입.
 * @param containerRef - 캔버스가 마운트될 HTML 요소의 Ref.
 * @param initialWidth - 캔버스의 초기 너비 Ref.
 * @param initialHeight - 캔버스의 초기 높이 Ref.
 * @param stateToWatch - 렌더링에 사용될 TState 타입의 상태를 제공하는 Ref.
 * @param RendererClass - 사용할 렌더러 클래스의 생성자 함수.
 * @param rendererName - 로깅을 위한 렌더러 이름 (선택적).
 * @returns 렌더러 초기화 상태 Ref 및 리사이즈 함수.
 */
export function useP5Renderer<
  TState,
  TRenderer extends IVisualizationRenderer<TState>,
>(
  containerRef: Ref<HTMLElement | null>,
  initialWidth: Ref<number>,
  initialHeight: Ref<number>,
  stateToWatch: Ref<TState>,
  RendererClass: RendererConstructor<TState, TRenderer>, // 생성자 주입
  rendererName: string = "P5Renderer", // 기본 이름 설정
) {
  const renderer = shallowRef<TRenderer | null>(null) // TRenderer 타입 사용
  const isInitialized = ref(false)

  // 렌더러 초기화 함수
  const initialize = async () => {
    if (
      typeof window !== "undefined" &&
      containerRef.value &&
      !renderer.value
    ) {
      try {
        console.log(`Attempting to initialize ${rendererName}...`)
        // 주입된 생성자를 사용하여 인스턴스 생성
        const p5RendererInstance = new RendererClass()
        await p5RendererInstance.setup(
          containerRef.value,
          initialWidth.value,
          initialHeight.value,
        )
        renderer.value = p5RendererInstance
        isInitialized.value = true
        console.log(`${rendererName} Initialized successfully via Composable.`)
      } catch (error) {
        console.error(`Failed to setup ${rendererName} via Composable:`, error)
        isInitialized.value = false
      }
    } else if (renderer.value) {
      console.log(`${rendererName} already initialized.`)
    } else {
      console.warn(
        `${rendererName} initialization prerequisites not met (window, container, or already initialized).`,
      )
    }
  }

  // 렌더러 정리 함수
  const cleanup = () => {
    if (renderer.value) {
      console.log(`Cleaning up ${rendererName}...`)
      renderer.value.destroy()
      renderer.value = null
      isInitialized.value = false
      console.log(`${rendererName} Cleaned up via Composable.`)
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
        // console.log(`${rendererName} state changed, triggering draw.`);
        renderer.value.draw(newState) // TState 타입의 newState 전달
      }
    },
    { deep: true }, // 객체 내부 값 변경 감지를 위해 deep watch 사용
  )

  // 초기화 완료 후 첫 렌더링 트리거
  watch(
    isInitialized,
    (ready) => {
      if (ready && renderer.value) {
        console.log(`${rendererName} is ready, triggering initial draw.`)
        renderer.value.draw(stateToWatch.value) // 초기 상태 값으로 첫 draw 호출
      }
    },
    { immediate: false },
  )

  // 리사이즈 처리 함수 (렌더러가 resize 메소드를 지원하는 경우에만 동작)
  const resizeRenderer = (width: number, height: number) => {
    // renderer.value?.resize는 optional chaining과 같습니다.
    // resize 메소드가 존재하면 호출하고, 없으면 아무것도 하지 않습니다.
    if (renderer.value?.resize && isInitialized.value) {
      console.log(`Resizing ${rendererName} to ${width}x${height}`)
      renderer.value.resize(width, height)
      // resize 후 다시 그릴 필요가 있다면 여기서 draw 호출 (보통 resize 내부에서 처리)
      // renderer.value.draw(stateToWatch.value);
    } else if (isInitialized.value) {
      console.warn(
        `${rendererName} does not support resize method or is not initialized.`,
      )
    }
  }

  // 외부에서는 초기화 상태와 resize 함수 노출
  return {
    isInitialized,
    resizeRenderer, // 항상 반환하되, 내부적으로 resize 지원 여부 체크
  }
}
