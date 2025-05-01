// interfaces/rendering/BasisVisualizationState.ts

/**
 * Basis 시각화 렌더러에 필요한 상태를 정의하는 인터페이스.
 * p5.js 같은 특정 라이브러리 타입에 의존하지 않습니다.
 */
export interface BasisVisualizationState {
    e1: { x: number; y: number };        // Primal basis vector 1
    e2: { x: number; y: number };        // Primal basis vector 2
    epsilon1: { x: number; y: number }; // Dual basis vector 1
    epsilon2: { x: number; y: number }; // Dual basis vector 2
    detM: number;                      // Determinant of the transformation matrix
    // 필요에 따라 다른 렌더링 관련 상태 추가 가능
}