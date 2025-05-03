// interfaces/rendering/BasisVisualizationState.ts

/**
 * Basis 시각화 렌더러에 필요한 상태를 정의하는 인터페이스.
 * p5.js 같은 특정 라이브러리 타입에 의존하지 않습니다.
 */
export interface BasisVisualizationState {
  e1: { x: number; y: number } // Primal basis vector 1
  e2: { x: number; y: number } // Primal basis vector 2
  epsilon1: { x: number; y: number } // Dual basis vector 1
  epsilon2: { x: number; y: number } // Dual basis vector 2
  detM: number // Determinant of the transformation matrix

  // --- 추가된 벡터 v 관련 상태 ---
  v_std: { x: number; y: number } // Vector v in standard basis
  v_primal: { x: number; y: number } // Vector v components in primal basis (e1, e2)
  v_dual: { x: number; y: number } // Vector v components in dual basis (epsilon1, epsilon2) - calculated as v dot e1, v dot e2
}
