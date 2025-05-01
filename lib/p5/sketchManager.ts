// lib/p5/sketchManager.ts
import type P5 from 'p5';
import type { Ref } from 'vue';
import { SCALE_FACTOR, GRID_RANGE, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/constants';

// --- 인터페이스 정의 ---
interface BasisState {
    e1: { x: number, y: number };
    e2: { x: number, y: number };
    epsilon1: { x: number, y: number };
    epsilon2: { x: number, y: number };
    detM: number;
}

interface UIContainerRefs {
    slider_e1x_container: Ref<HTMLDivElement | null>;
    slider_e1y_container: Ref<HTMLDivElement | null>;
    slider_e2x_container: Ref<HTMLDivElement | null>;
    slider_e2y_container: Ref<HTMLDivElement | null>;
    resetButtonContainer: Ref<HTMLDivElement | null>;
}

interface SliderValueRefs {
    slider_e1x_val: Ref<number>;
    slider_e1y_val: Ref<number>;
    slider_e2x_val: Ref<number>;
    slider_e2y_val: Ref<number>;
}

interface CreatedSliderElements {
    sl_e1x: P5.Element;
    sl_e1y: P5.Element;
    sl_e2x: P5.Element;
    sl_e2y: P5.Element;
}

// 벡터 유효성 검사 헬퍼 (NaN 및 Infinity 확인)
// 이 함수는 createP5Sketch 함수 스코프 내에 정의됩니다.
const isVectorValidForDrawing = (v: P5.Vector | null | undefined): v is P5.Vector => {
    return !!v &&
        typeof v.x === 'number' && !isNaN(v.x) && isFinite(v.x) &&
        typeof v.y === 'number' && !isNaN(v.y) && isFinite(v.y);
}

// p5 스케치 함수를 생성하는 팩토리 함수
export function createP5Sketch(
    state: BasisState,
    sliderValues: SliderValueRefs,
    uiContainers: UIContainerRefs,
    canvasContainer: Ref<HTMLDivElement | null>
): (p: P5) => void {

    // 스케치 함수 반환
    return (p: P5) => {

        // --- p5 내부 상태 ---
        let i_hat: P5.Vector;
        let j_hat: P5.Vector;
        let e1: P5.Vector;
        let e2: P5.Vector;
        let epsilon1: P5.Vector;
        let epsilon2: P5.Vector;
        let createdSliders: CreatedSliderElements | null = null;

        // --- GridRenderer 클래스 ---
        class GridRenderer {
            private range: number;
            private scale: number;
            private p: P5; // p5 인스턴스 참조

            constructor(pInstance: P5, range: number, scaleFactor: number) {
                this.p = pInstance; // 생성자에서 p5 인스턴스 저장
                if (!this.p || typeof this.p.line !== 'function') {
                    console.error("GridRenderer: Invalid p5 instance received!");
                    // 필요시 오류 처리 또는 기본값 설정
                }
                this.range = range;
                this.scale = scaleFactor;
            }

            // GridRenderer 내부 벡터 유효성 검사 헬퍼
            private isValidVector(v: P5.Vector | null | undefined): v is P5.Vector {
                return !!v &&
                    typeof v.x === 'number' && !isNaN(v.x) && isFinite(v.x) &&
                    typeof v.y === 'number' && !isNaN(v.y) && isFinite(v.y);
            }

            public display(basis1: P5.Vector, basis2: P5.Vector, c: P5.Color, weight: number): void {
                if (!this.p) return; // p 인스턴스 확인

                if (!this.isValidVector(basis1) || !this.isValidVector(basis2)) {
                    return; // 유효하지 않으면 그리지 않음
                }

                this.p.stroke(c);
                this.p.strokeWeight(weight);
                this.p.noFill();

                for (let i = -this.range; i <= this.range; i++) {
                    // 벡터 연산 및 유효성 검사
                    const term1 = basis1.copy().mult(i);
                    if (!this.isValidVector(term1)) continue;

                    const term2_neg = basis2.copy().mult(-this.range);
                    if (!this.isValidVector(term2_neg)) continue;

                    const p1 = term1.copy().add(term2_neg);
                    if (!this.isValidVector(p1)) continue;

                    const term2_pos = basis2.copy().mult(this.range);
                    if (!this.isValidVector(term2_pos)) continue;

                    const p2 = term1.copy().add(term2_pos);
                    if (!this.isValidVector(p2)) continue;

                    // 유효한 경우에만 line 그리기
                    this.p.line(p1.x * this.scale, p1.y * this.scale, p2.x * this.scale, p2.y * this.scale);

                    // 두 번째 라인 계산 및 유효성 검사
                    const term3 = basis1.copy().mult(-this.range);
                    if (!this.isValidVector(term3)) continue;

                    const term4 = basis1.copy().mult(this.range);
                    if (!this.isValidVector(term4)) continue;

                    const term5 = basis2.copy().mult(i);
                    if (!this.isValidVector(term5)) continue;

                    const p3 = term3.copy().add(term5);
                    if (!this.isValidVector(p3)) continue;

                    const p4 = term4.copy().add(term5);
                    if (!this.isValidVector(p4)) continue;

                    // 유효한 경우에만 line 그리기
                    this.p.line(p3.x * this.scale, p3.y * this.scale, p4.x * this.scale, p4.y * this.scale);
                }
            }
        }

        let standardGrid: GridRenderer;
        let primalGrid: GridRenderer;
        let dualGrid: GridRenderer;

        // --- Helper Functions ---
        const applyCoordinateTransform = (): void => {
            if (!p) return; // p 인스턴스 확인
            p.translate(p.width / 2, p.height / 2);
            p.scale(1, -1);
        };

        // UI 요소 생성 함수
        const createUIElements = (): CreatedSliderElements | null => {
            if (!p) return null; // p 인스턴스 확인

            if (!uiContainers.slider_e1x_container.value || !uiContainers.slider_e1y_container.value ||
                !uiContainers.slider_e2x_container.value || !uiContainers.slider_e2y_container.value ||
                !uiContainers.resetButtonContainer.value) {
                console.error("Slider/Button container refs not found in p5 sketch!");
                return null;
            }

            // 슬라이더 생성 시 p 인스턴스 사용
            const sl_e1x = p.createSlider(-2, 2, sliderValues.slider_e1x_val.value, 0.1);
            sl_e1x.parent(uiContainers.slider_e1x_container.value);
            (sl_e1x as any).input(() => { sliderValues.slider_e1x_val.value = sl_e1x.value() as number; });

            const sl_e1y = p.createSlider(-2, 2, sliderValues.slider_e1y_val.value, 0.1);
            sl_e1y.parent(uiContainers.slider_e1y_container.value);
            (sl_e1y as any).input(() => { sliderValues.slider_e1y_val.value = sl_e1y.value() as number; });

            const sl_e2x = p.createSlider(-2, 2, sliderValues.slider_e2x_val.value, 0.1);
            sl_e2x.parent(uiContainers.slider_e2x_container.value);
            (sl_e2x as any).input(() => { sliderValues.slider_e2x_val.value = sl_e2x.value() as number; });

            const sl_e2y = p.createSlider(-2, 2, sliderValues.slider_e2y_val.value, 0.1);
            sl_e2y.parent(uiContainers.slider_e2y_container.value);
            (sl_e2y as any).input(() => { sliderValues.slider_e2y_val.value = sl_e2y.value() as number; });

            return { sl_e1x, sl_e1y, sl_e2x, sl_e2y };
        };

        // 벡터 그리기 함수
        const drawVector = (vec: P5.Vector, c: P5.Color, label: string): void => {
            if (!p) return; // p 인스턴스 확인

            // isVectorValidForDrawing은 외부 스코프에 정의되어 사용 가능
            if (!isVectorValidForDrawing(vec)) {
                return;
            }

            p.push();
            const vecScaled = vec.copy().mult(SCALE_FACTOR);
            if (!isVectorValidForDrawing(vecScaled)) { p.pop(); return; }

            p.stroke(c); p.strokeWeight(2.5); p.fill(c);
            p.line(0, 0, vecScaled.x, vecScaled.y); // vecScaled 유효

            const angle = p.atan2(vecScaled.y, vecScaled.x);
            if (isNaN(angle) || !isFinite(angle)) { p.pop(); return; }

            p.translate(vecScaled.x, vecScaled.y); // vecScaled 유효
            p.rotate(angle); // angle 유효
            const arrowSize = 7;
            p.translate(-arrowSize * 1.2, 0);
            p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
            p.rotate(-angle); // angle 유효

            const labelOffsetBase = p.createVector(arrowSize * 1.8, 0); // p 인스턴스 사용
            const rotatedOffset = labelOffsetBase.rotate(angle); // angle 유효
            if (!isVectorValidForDrawing(rotatedOffset)) { p.pop(); return; }

            p.translate(rotatedOffset.x, rotatedOffset.y); // rotatedOffset 유효
            p.scale(1, -1);
            p.noStroke(); p.fill(c); p.textSize(16);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(label, 0, 0);
            p.pop();
        };

        // --- p.setup ---
        p.setup = () => {
            if (!canvasContainer.value) {
                console.error("Canvas container ref not found in p5 setup!");
                return;
            }
            // p 인스턴스는 이 함수 스코프의 'p' 파라미터임
            const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.parent(canvasContainer.value);

            // 벡터 생성 시 p 인스턴스 사용
            i_hat = p.createVector(1, 0);
            j_hat = p.createVector(0, 1);
            e1 = p.createVector(state.e1?.x ?? 0, state.e1?.y ?? 0);
            e2 = p.createVector(state.e2?.x ?? 0, state.e2?.y ?? 0);
            epsilon1 = p.createVector(state.epsilon1?.x ?? NaN, state.epsilon1?.y ?? NaN);
            epsilon2 = p.createVector(state.epsilon2?.x ?? NaN, state.epsilon2?.y ?? NaN);

            // GridRenderer 생성 시 p 인스턴스 전달
            standardGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
            primalGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
            dualGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);

            // UI 생성 시 내부적으로 p 인스턴스 사용
            createdSliders = createUIElements();

            // Reset 버튼 생성 시 p 인스턴스 사용
            if (createdSliders && uiContainers.resetButtonContainer.value) {
                const btnReset = p.createButton('Reset Basis');
                btnReset.parent(uiContainers.resetButtonContainer.value);
                btnReset.mousePressed(() => {
                    if (createdSliders) {
                        sliderValues.slider_e1x_val.value = 1;
                        sliderValues.slider_e1y_val.value = 0;
                        sliderValues.slider_e2x_val.value = 0;
                        sliderValues.slider_e2y_val.value = 1;
                        // createdSliders의 value 업데이트는 p5.Element 내장 메서드
                        createdSliders.sl_e1x.value(1);
                        createdSliders.sl_e1y.value(0);
                        createdSliders.sl_e2x.value(0);
                        createdSliders.sl_e2y.value(1);
                    } else {
                        console.error("Reset button clicked, but sliders reference is missing!");
                    }
                });
            } else if (!createdSliders) {
                console.error("Failed to create slider elements.");
            } else {
                console.error("Reset button container not found.");
            }

            // describe 함수는 p 인스턴스 사용
            p.describe('Interactive 2D basis transformation visualization showing primal and dual bases, their grids, and related matrix information. Handles degenerate cases where the determinant is zero.');
        };

        // --- p.draw ---
        p.draw = () => {
            if (!p) return; // p 인스턴스 확인

            // --- 상태 업데이트 ---
            // state 객체에서 값 읽기 (state는 외부 스코프에서 전달됨)
            const temp_e1_x = state.e1?.x;
            const temp_e1_y = state.e1?.y;
            // e1 벡터 업데이트 (e1은 내부 스코프 변수)
            if (typeof temp_e1_x === 'number' && !isNaN(temp_e1_x) && isFinite(temp_e1_x) && typeof temp_e1_y === 'number' && !isNaN(temp_e1_y) && isFinite(temp_e1_y)) {
                e1.set(temp_e1_x, temp_e1_y);
            } else { e1.set(NaN, NaN); }

            const temp_e2_x = state.e2?.x;
            const temp_e2_y = state.e2?.y;
            if (typeof temp_e2_x === 'number' && !isNaN(temp_e2_x) && isFinite(temp_e2_x) && typeof temp_e2_y === 'number' && !isNaN(temp_e2_y) && isFinite(temp_e2_y)) {
                e2.set(temp_e2_x, temp_e2_y);
            } else { e2.set(NaN, NaN); }

            const temp_eps1_x = state.epsilon1?.x;
            const temp_eps1_y = state.epsilon1?.y;
            if (typeof temp_eps1_x === 'number' && !isNaN(temp_eps1_x) && isFinite(temp_eps1_x) && typeof temp_eps1_y === 'number' && !isNaN(temp_eps1_y) && isFinite(temp_eps1_y)) {
                epsilon1.set(temp_eps1_x, temp_eps1_y);
            } else { epsilon1.set(NaN, NaN); }

            const temp_eps2_x = state.epsilon2?.x;
            const temp_eps2_y = state.epsilon2?.y;
            if (typeof temp_eps2_x === 'number' && !isNaN(temp_eps2_x) && isFinite(temp_eps2_x) && typeof temp_eps2_y === 'number' && !isNaN(temp_eps2_y) && isFinite(temp_eps2_y)) {
                epsilon2.set(temp_eps2_x, temp_eps2_y);
            } else { epsilon2.set(NaN, NaN); }

            // --- 렌더링 ---
            // p 인스턴스 사용하여 배경 및 변환 적용
            p.background(255);
            applyCoordinateTransform(); // 내부적으로 p 사용

            // GridRenderer 객체들의 display 메서드 호출 (내부적으로 p 사용)
            standardGrid.display(i_hat, j_hat, p.color(200), 1);

            // isVectorValidForDrawing은 p 인스턴스 불필요
            if (isVectorValidForDrawing(e1) && isVectorValidForDrawing(e2)) {
                primalGrid.display(e1, e2, p.color(0, 0, 255, 150), 1.5);
                drawVector(e1, p.color(0, 0, 255), 'e₁'); // 내부적으로 p 사용
                drawVector(e2, p.color(0, 0, 255), 'e₂'); // 내부적으로 p 사용
            } else {
                if (isVectorValidForDrawing(e1)) drawVector(e1, p.color(0, 0, 255), 'e₁');
                if (isVectorValidForDrawing(e2)) drawVector(e2, p.color(0, 0, 255), 'e₂');
            }

            // state.detM 값 확인 (state는 외부 스코프)
            const is_detM_valid = typeof state.detM === 'number' && !isNaN(state.detM) && isFinite(state.detM) && p.abs(state.detM) > 0.001; // p.abs 사용
            if (is_detM_valid && isVectorValidForDrawing(epsilon1) && isVectorValidForDrawing(epsilon2)) {
                dualGrid.display(epsilon1, epsilon2, p.color(255, 0, 0, 150), 1.5);
                drawVector(epsilon1, p.color(255, 0, 0), 'ε¹');
                drawVector(epsilon2, p.color(255, 0, 0), 'ε²');
            }

            // p 인스턴스 사용
            p.resetMatrix();
        }; // end of p.draw
    }; // end of returned sketch function
} // end of createP5Sketch