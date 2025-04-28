// lib/p5/sketchManager.ts
import type P5 from 'p5';
import type { Ref } from 'vue';
import { SCALE_FACTOR, GRID_RANGE, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/config/constants'; // 경로 주의

// 필요한 상태 타입 정의 (useBasisTransformation의 calculated와 유사)
interface BasisState {
    e1: { x: number, y: number };
    e2: { x: number, y: number };
    epsilon1: { x: number, y: number };
    epsilon2: { x: number, y: number };
    detM: number;
}

// UI 요소 컨테이너 Ref 타입 정의
interface UIContainerRefs {
    slider_e1x_container: Ref<HTMLDivElement | null>;
    slider_e1y_container: Ref<HTMLDivElement | null>;
    slider_e2x_container: Ref<HTMLDivElement | null>;
    slider_e2y_container: Ref<HTMLDivElement | null>;
    resetButtonContainer: Ref<HTMLDivElement | null>;
}

// 슬라이더 값 Ref 타입 정의
interface SliderValueRefs {
    slider_e1x_val: Ref<number>;
    slider_e1y_val: Ref<number>;
    slider_e2x_val: Ref<number>;
    slider_e2y_val: Ref<number>;
}


// p5 스케치 함수를 생성하는 팩토리 함수
export function createP5Sketch(
    state: BasisState, // 외부 반응형 상태 (calculated 객체)
    sliderValues: SliderValueRefs, // 슬라이더 값 Ref
    uiContainers: UIContainerRefs, // UI 요소가 들어갈 컨테이너 Ref
    canvasContainer: Ref<HTMLDivElement | null> // 캔버스 컨테이너 Ref
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
        let createdSliders: { sl_e1x: P5.Element, sl_e1y: P5.Element, sl_e2x: P5.Element, sl_e2y: P5.Element } | null = null;


        // --- GridRenderer 클래스 (sketch 함수 내부에 유지하거나 별도 파일로 분리 가능) ---
        class GridRenderer {
            private range: number;
            private scale: number;
            private p: P5;

            constructor(pInstance: P5, range: number, scaleFactor: number) { this.p = pInstance; this.range = range; this.scale = scaleFactor; }
            public display(basis1: P5.Vector, basis2: P5.Vector, c: P5.Color, weight: number): void { /* ... 이전과 동일 ... */
                if (!basis1 || !basis2 || isNaN(basis1.x) || isNaN(basis1.y) || isNaN(basis2.x) || isNaN(basis2.y)) return;
                this.p.stroke(c); this.p.strokeWeight(weight); this.p.noFill();
                const P5Vector = this.p.constructor as typeof P5.Vector;
                for (let i = -this.range; i <= this.range; i++) {
                    const term1 = basis1.copy().mult(i); const term2_neg = basis2.copy().mult(-this.range);
                    const p1 = P5Vector.add(term1, term2_neg); const term2_pos = basis2.copy().mult(this.range);
                    const p2 = P5Vector.add(term1, term2_pos);
                    this.p.line(p1.x * this.scale, p1.y * this.scale, p2.x * this.scale, p2.y * this.scale);
                    const term3 = basis1.copy().mult(-this.range); const term4 = basis1.copy().mult(this.range);
                    const term5 = basis2.copy().mult(i);
                    const p3 = P5Vector.add(term3, term5); const p4 = P5Vector.add(term4, term5);
                    this.p.line(p3.x * this.scale, p3.y * this.scale, p4.x * this.scale, p4.y * this.scale);
                }
            }
        }

        let standardGrid: GridRenderer;
        let primalGrid: GridRenderer;
        let dualGrid: GridRenderer;

        // --- Helper Functions ---
        const applyCoordinateTransform = (): void => { p.translate(p.width / 2, p.height / 2); p.scale(1, -1); };

        const createUIElements = (): typeof createdSliders => {
            if (!uiContainers.slider_e1x_container.value || !uiContainers.slider_e1y_container.value ||
                !uiContainers.slider_e2x_container.value || !uiContainers.slider_e2y_container.value ||
                !uiContainers.resetButtonContainer.value) {
                console.error("Slider/Button container refs not found in p5 sketch!"); return null;
            }

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

            // Reset 버튼은 setup에서 추가
            return { sl_e1x, sl_e1y, sl_e2x, sl_e2y };
        };

        const drawVector = (vec: P5.Vector, c: P5.Color, label: string): void => { /* ... 이전과 동일 ... */
            if (!vec || isNaN(vec.x) || isNaN(vec.y)) return;
            p.push();
            const vecScaled = vec.copy().mult(SCALE_FACTOR);
            p.stroke(c); p.strokeWeight(2.5); p.fill(c);
            p.line(0, 0, vecScaled.x, vecScaled.y);
            const angle = p.atan2(vecScaled.y, vecScaled.x);
            p.translate(vecScaled.x, vecScaled.y); p.rotate(angle);
            const arrowSize = 7;
            p.translate(-arrowSize * 1.2, 0);
            p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
            p.rotate(-angle);
            const labelOffsetBase = p.createVector(arrowSize * 1.8, 0);
            const rotatedOffset = labelOffsetBase.rotate(angle);
            p.translate(rotatedOffset.x, rotatedOffset.y);
            p.scale(1, -1);
            p.noStroke(); p.fill(c); p.textSize(16);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(label, 0, 0);
            p.pop();
        };

        // --- p.setup ---
        p.setup = () => {
            if (!canvasContainer.value) { console.error("Canvas container ref not found in p5 setup!"); return; }
            const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.parent(canvasContainer.value);

            i_hat = p.createVector(1, 0); j_hat = p.createVector(0, 1);
            // 초기 벡터 값은 외부 상태(state)에서 가져옴
            e1 = p.createVector(state.e1.x, state.e1.y);
            e2 = p.createVector(state.e2.x, state.e2.y);
            epsilon1 = p.createVector(state.epsilon1.x, state.epsilon1.y);
            epsilon2 = p.createVector(state.epsilon2.x, state.epsilon2.y);

            standardGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
            primalGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
            dualGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);

            createdSliders = createUIElements(); // 슬라이더 생성

            // Reset 버튼 생성 및 이벤트 핸들러 연결
            if (createdSliders && uiContainers.resetButtonContainer.value) {
                const btnReset = p.createButton('Reset Basis');
                btnReset.parent(uiContainers.resetButtonContainer.value);
                btnReset.mousePressed(() => {
                    // Vue의 반응형 상태 업데이트 (Composable 내부에서 처리됨)
                    sliderValues.slider_e1x_val.value = 1;
                    sliderValues.slider_e1y_val.value = 0;
                    sliderValues.slider_e2x_val.value = 0;
                    sliderValues.slider_e2y_val.value = 1;
                    // p5 슬라이더 UI 동기화
                    createdSliders?.sl_e1x.value(1);
                    createdSliders?.sl_e1y.value(0);
                    createdSliders?.sl_e2x.value(0);
                    createdSliders?.sl_e2y.value(1);
                });
            } else { console.error("Failed to create UI or reset button container not found.") }

            p.describe('Interactive 2D basis transformation visualization...');
        };

        // --- p.draw ---
        p.draw = () => {
            // 외부 상태(state) 변경 감지 및 p5 내부 상태 업데이트
            e1.set(state.e1.x, state.e1.y);
            e2.set(state.e2.x, state.e2.y);
            epsilon1.set(state.epsilon1.x, state.epsilon1.y);
            epsilon2.set(state.epsilon2.x, state.epsilon2.y);

            p.background(255);
            applyCoordinateTransform();

            standardGrid.display(i_hat, j_hat, p.color(200), 1);
            primalGrid.display(e1, e2, p.color(0, 0, 255, 150), 1.5);
            if (!isNaN(state.detM) && p.abs(state.detM) > 0.001) {
                dualGrid.display(epsilon1, epsilon2, p.color(255, 0, 0, 150), 1.5);
            }
            drawVector(e1, p.color(0, 0, 255), 'e₁');
            drawVector(e2, p.color(0, 0, 255), 'e₂');
            if (!isNaN(state.detM) && p.abs(state.detM) > 0.001) {
                drawVector(epsilon1, p.color(255, 0, 0), 'ε¹');
                drawVector(epsilon2, p.color(255, 0, 0), 'ε²');
            }
            p.resetMatrix();
        };
    }; // end of returned sketch function
} // end of createP5Sketch