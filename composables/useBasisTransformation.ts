// composables/useBasisTransformation.ts
import { ref, reactive, computed } from 'vue';

// 슬라이더 값과 계산 결과를 관리하는 Composable
export function useBasisTransformation() {
    // Slider Refs
    const slider_e1x_val = ref(1);
    const slider_e1y_val = ref(0);
    const slider_e2x_val = ref(0);
    const slider_e2y_val = ref(1);

    // Calculated Results (Readonly computed properties might be safer for external use)
    const calculated = reactive({
        detM: 1.0,
        M_inv: [[1.0, 0.0], [0.0, 1.0]] as number[][], // 타입 명시
        e1: { x: 1, y: 0 },
        e2: { x: 0, y: 1 },
        epsilon1: { x: 1.0, y: 0.0 },
        epsilon2: { x: 0.0, y: 1.0 }
    });

    // Calculation Logic
    const performCalculations = (): void => {
        const a = slider_e1x_val.value;
        const b = slider_e1y_val.value;
        const c = slider_e2x_val.value;
        const d = slider_e2y_val.value;

        calculated.e1 = { x: a, y: b };
        calculated.e2 = { x: c, y: d };

        const det = a * d - b * c;
        calculated.detM = det;

        if (Math.abs(det) < 0.001) {
            calculated.M_inv = [[NaN, NaN], [NaN, NaN]];
            calculated.epsilon1 = { x: NaN, y: NaN };
            calculated.epsilon2 = { x: NaN, y: NaN };
        } else {
            const invDet = 1.0 / det;
            calculated.M_inv = [
                [invDet * d, invDet * (-c)],
                [invDet * (-b), invDet * a]
            ];
            calculated.epsilon1 = { x: calculated.M_inv[0][0], y: calculated.M_inv[0][1] };
            calculated.epsilon2 = { x: calculated.M_inv[1][0], y: calculated.M_inv[1][1] };
        }
    };

    // 초기 계산 실행
    performCalculations();

    return {
        // Slider values (writable refs)
        slider_e1x_val,
        slider_e1y_val,
        slider_e2x_val,
        slider_e2y_val,
        // Calculated results (reactive object)
        calculated,
        // Calculation function
        performCalculations
    };
}