// interfaces/rendering/IVisualizationRenderer.ts
import type { BasisVisualizationState } from './BasisVisualizationState';

/**
 * Basis 시각화를 위한 렌더러 인터페이스.
 * 특정 그래픽 라이브러리에 대한 의존성 없이 렌더링 작업을 정의합니다.
 */
export interface IVisualizationRenderer {
    /**
     * 렌더러를 초기화하고 지정된 HTML 컨테이너에 설정합니다.
     * @param container 렌더링 결과(예: canvas)가 추가될 부모 HTML 요소.
     * @param initialWidth 초기 렌더링 영역 너비.
     * @param initialHeight 초기 렌더링 영역 높이.
     */
    setup(container: HTMLElement, initialWidth: number, initialHeight: number): Promise<void>;

    /**
     * 현재 상태를 기반으로 시각화를 그립니다.
     * @param state 렌더링에 필요한 데이터 (BasisVisualizationState 타입).
     */
    draw(state: BasisVisualizationState): void;

    /**
     * 렌더러 리소스를 정리하고 렌더링 루프를 중지합니다.
     * (예: p5 인스턴스 제거, 이벤트 리스너 해제 등)
     */
    destroy(): void;

    /**
     * 렌더링 영역의 크기를 조절합니다.
     * @param width 새로운 너비.
     * @param height 새로운 높이.
     */
    resize?(width: number, height: number): void; // 선택적 메소드
}