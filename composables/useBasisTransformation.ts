// composables/useBasisTransformation.ts
import { ref, reactive, watch } from "vue"

// 슬라이더 값과 계산 결과를 관리하는 Composable
export function useBasisTransformation() {
  // --- Slider Refs ---
  const slider_e1x_val = ref(1)
  const slider_e1y_val = ref(0)
  const slider_e2x_val = ref(0)
  const slider_e2y_val = ref(1)

  // --- 추가: Input Vector v (Standard Basis) Refs ---
  const input_vx_val = ref(1)
  const input_vy_val = ref(1)

  // --- Calculated Results ---
  const calculated = reactive({
    detM: 1.0,
    M_inv: [
      [1.0, 0.0],
      [0.0, 1.0],
    ] as number[][], // 타입 명시
    e1: { x: 1, y: 0 },
    e2: { x: 0, y: 1 },
    epsilon1: { x: 1.0, y: 0.0 },
    epsilon2: { x: 0.0, y: 1.0 },
    // --- 추가: Vector v Components ---
    v_std: { x: 1, y: 1 }, // 표준 기저 성분 (입력값)
    v_primal: { x: 1.0, y: 1.0 }, // Primal 기저 성분 (v')
    v_dual: { x: 1.0, y: 0.0 }, // Dual 기저 성분 (ω')
  })

  // --- Calculation Logic ---
  const performCalculations = (): void => {
    // 기저 벡터 업데이트
    const a = slider_e1x_val.value
    const b = slider_e1y_val.value
    const c = slider_e2x_val.value
    const d = slider_e2y_val.value

    calculated.e1 = { x: a, y: b }
    calculated.e2 = { x: c, y: d }

    // 행렬 M의 행렬식 계산
    const det = a * d - b * c
    calculated.detM = det

    // 역행렬 및 쌍대 기저 계산
    const isDegenerate = Math.abs(det) < 0.001
    if (isDegenerate) {
      calculated.M_inv = [
        [NaN, NaN],
        [NaN, NaN],
      ]
      calculated.epsilon1 = { x: NaN, y: NaN }
      calculated.epsilon2 = { x: NaN, y: NaN }
    } else {
      const invDet = 1.0 / det
      calculated.M_inv = [
        [invDet * d, invDet * -c], // M_inv[0][0], M_inv[0][1]
        [invDet * -b, invDet * a], // M_inv[1][0], M_inv[1][1]
      ]
      // 쌍대 기저 벡터는 M^-T 의 행벡터 또는 M^-1의 열벡터와 관련있지만,
      // 계산된 M_inv의 행벡터가 ε¹, ε²의 성분이 됨.
      // epsilon1 = (M_inv[0][0], M_inv[0][1])
      // epsilon2 = (M_inv[1][0], M_inv[1][1])
      calculated.epsilon1 = {
        x: calculated.M_inv[0][0],
        y: calculated.M_inv[0][1],
      }
      calculated.epsilon2 = {
        x: calculated.M_inv[1][0],
        y: calculated.M_inv[1][1],
      }
    }

    // --- 추가: 벡터 v 성분 계산 ---
    const vx_std = input_vx_val.value
    const vy_std = input_vy_val.value
    calculated.v_std = { x: vx_std, y: vy_std }

    // Primal basis components (v'): v' = M⁻¹ * v_std
    if (isDegenerate) {
      calculated.v_primal = { x: NaN, y: NaN }
    } else {
      calculated.v_primal = {
        x: calculated.M_inv[0][0] * vx_std + calculated.M_inv[0][1] * vy_std,
        y: calculated.M_inv[1][0] * vx_std + calculated.M_inv[1][1] * vy_std,
      }
    }

    // Dual basis components (ω'): ω₁ = v ⋅ e₁, ω₂ = v ⋅ e₂
    // 이 계산은 detM 값과 무관하게 가능
    calculated.v_dual = {
      x: vx_std * calculated.e1.x + vy_std * calculated.e1.y, // v_std ⋅ e1
      y: vx_std * calculated.e2.x + vy_std * calculated.e2.y, // v_std ⋅ e2
    }
  }

  // --- Watchers ---
  // 슬라이더 값 변경 감지
  watch(
    [slider_e1x_val, slider_e1y_val, slider_e2x_val, slider_e2y_val],
    performCalculations,
  )
  // 벡터 입력값 변경 감지
  watch([input_vx_val, input_vy_val], performCalculations)

  // --- 초기 계산 실행 ---
  performCalculations()

  return {
    // Slider values
    slider_e1x_val,
    slider_e1y_val,
    slider_e2x_val,
    slider_e2y_val,
    // Input vector values
    input_vx_val, // <-- 추가
    input_vy_val, // <-- 추가
    // Calculated results
    calculated,
    // Calculation function
    performCalculations,
  }
}
