// lib/p5/p5BasisRenderer.ts
// 'import type' 대신 일반 import를 사용하여 P5를 값으로도 사용할 수 있게 함
import P5 from 'p5';
import type { IVisualizationRenderer } from '@/interfaces/rendering/IVisualizationRenderer';
import type { BasisVisualizationState } from '@/interfaces/rendering/BasisVisualizationState';
import { SCALE_FACTOR, GRID_RANGE } from '@/config/constants';

// --- 헬퍼 함수들 ---

// 벡터 데이터 유효성 검사 (간단한 {x, y} 객체용)
const isVectorDataValid = (v: { x: number, y: number } | null | undefined): v is { x: number, y: number } => {
    return !!v &&
        typeof v.x === 'number' && !isNaN(v.x) && isFinite(v.x) &&
        typeof v.y === 'number' && !isNaN(v.y) && isFinite(v.y);
}

// p5.Vector 객체 유효성 검사
const isP5VectorValidForDrawing = (v: P5.Vector | null | undefined): v is P5.Vector => {
    return !!v &&
        typeof v.x === 'number' && !isNaN(v.x) && isFinite(v.x) &&
        typeof v.y === 'number' && !isNaN(v.y) && isFinite(v.y);
}

// --- GridRenderer 클래스 ---
// P5BasisRenderer 클래스 외부에 정의하거나, 내부에 private 클래스로 정의할 수 있음
// 여기서는 외부에 정의하고, 생성자에서 p5 인스턴스를 주입받도록 함
class GridRenderer {
    private range: number;
    private scale: number;
    private p: P5; // p5 인스턴스 참조

    constructor(pInstance: P5, range: number, scaleFactor: number) {
        if (!pInstance) {
            throw new Error("GridRenderer requires a valid p5 instance.");
        }
        this.p = pInstance;
        this.range = range;
        this.scale = scaleFactor;
    }

    // GridRenderer 내부에서 사용할 벡터 유효성 검사
    private isValidVector(v: P5.Vector | null | undefined): v is P5.Vector {
        return isP5VectorValidForDrawing(v); // 위에서 정의한 헬퍼 사용
    }

    // 그리드를 그리는 메소드
    public display(basis1: P5.Vector, basis2: P5.Vector, c: P5.Color, weight: number): void {
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

            // P5.Vector.add 사용 (이제 P5가 값으로 임포트되어 사용 가능)
            const p1 = P5.Vector.add(term1, term2_neg);
            if (!this.isValidVector(p1)) continue;

            const term2_pos = basis2.copy().mult(this.range);
            if (!this.isValidVector(term2_pos)) continue;

            const p2 = P5.Vector.add(term1, term2_pos);
            if (!this.isValidVector(p2)) continue;

            // 유효한 경우에만 line 그리기 (생성자에서 받은 this.p 사용)
            this.p.line(p1.x * this.scale, p1.y * this.scale, p2.x * this.scale, p2.y * this.scale);

            // 두 번째 라인 계산 및 유효성 검사
            const term3 = basis1.copy().mult(-this.range);
            if (!this.isValidVector(term3)) continue;

            const term4 = basis1.copy().mult(this.range);
            if (!this.isValidVector(term4)) continue;

            const term5 = basis2.copy().mult(i);
            if (!this.isValidVector(term5)) continue;

            const p3 = P5.Vector.add(term3, term5);
            if (!this.isValidVector(p3)) continue;

            const p4 = P5.Vector.add(term4, term5);
            if (!this.isValidVector(p4)) continue;

            // 유효한 경우에만 line 그리기
            this.p.line(p3.x * this.scale, p3.y * this.scale, p4.x * this.scale, p4.y * this.scale);
        }
    }
} // End of GridRenderer class


/**
 * IVisualizationRenderer 인터페이스의 p5.js 구현체.
 * Basis 벡터와 그리드를 p5.js를 사용하여 캔버스에 렌더링합니다.
 */
export class P5BasisRenderer implements IVisualizationRenderer<BasisVisualizationState> {
    private p5Instance: P5 | null = null;
    private container: HTMLElement | null = null;
    private width: number = 0;
    private height: number = 0;

    // p5 내부에서 사용할 벡터 (매 프레임 상태로부터 업데이트됨)
    private i_hat: P5.Vector | undefined;
    private j_hat: P5.Vector | undefined;
    private e1: P5.Vector | undefined;
    private e2: P5.Vector | undefined;
    private epsilon1: P5.Vector | undefined;
    private epsilon2: P5.Vector | undefined;

    // GridRenderer 인스턴스 (이제 GridRenderer 타입 사용 가능)
    private standardGrid: GridRenderer | undefined;
    private primalGrid: GridRenderer | undefined;
    private dualGrid: GridRenderer | undefined;


    /**
     * p5 인스턴스를 생성하고 캔버스를 설정합니다.
     */
    async setup(container: HTMLElement, initialWidth: number, initialHeight: number): Promise<void> {
        this.container = container;
        this.width = initialWidth;
        this.height = initialHeight;

        // p5 인스턴스 생성을 위한 스케치 함수 정의
        const sketch = (p: P5) => {

            // --- p5 내부 헬퍼 함수 ---

            // 좌표계 변환 (캔버스 중앙 원점, y축 반전)
            const applyCoordinateTransform = (): void => {
                p.translate(p.width / 2, p.height / 2);
                p.scale(1, -1);
            };

            // 벡터 그리기 함수
            const drawVector = (vec: P5.Vector, c: P5.Color, label: string): void => {
                if (!isP5VectorValidForDrawing(vec)) {
                    return;
                }

                p.push();
                const vecScaled = vec.copy().mult(SCALE_FACTOR);
                if (!isP5VectorValidForDrawing(vecScaled)) { p.pop(); return; }

                p.stroke(c); p.strokeWeight(2.5); p.fill(c);
                p.line(0, 0, vecScaled.x, vecScaled.y);

                const angle = p.atan2(vecScaled.y, vecScaled.x);
                if (isNaN(angle) || !isFinite(angle)) { p.pop(); return; }

                p.translate(vecScaled.x, vecScaled.y);
                p.rotate(angle);
                const arrowSize = 7;
                p.translate(-arrowSize * 1.2, 0); // 화살표 위치 조정
                p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0); // 화살표 그리기
                p.rotate(-angle); // 회전 복원

                // 라벨 위치 계산 및 그리기
                const labelOffsetBase = p.createVector().set(arrowSize * 1.8, 0); // .set() 사용
                const rotatedOffset = labelOffsetBase.rotate(angle);
                if (!isP5VectorValidForDrawing(rotatedOffset)) { p.pop(); return; }

                p.translate(rotatedOffset.x, rotatedOffset.y);
                p.scale(1, -1); // 라벨 텍스트는 뒤집히지 않도록 다시 y축 반전
                p.noStroke(); p.fill(c); p.textSize(16);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(label, 0, 0);
                p.pop();
            };


            // --- p.setup ---
            p.setup = () => {
                if (!this.container) {
                    console.error("P5BasisRenderer: Container not set before setup!");
                    return;
                }
                const canvas = p.createCanvas(this.width, this.height);
                canvas.parent(this.container); // 부모 컨테이너에 캔버스 추가

                // 내부 p5 벡터 초기화
                this.i_hat = p.createVector().set(1, 0); // .set() 사용
                this.j_hat = p.createVector().set(0, 1); // .set() 사용
                this.e1 = p.createVector().set(1, 0);    // .set() 사용
                this.e2 = p.createVector().set(0, 1);    // .set() 사용
                this.epsilon1 = p.createVector().set(1, 0); // .set() 사용
                this.epsilon2 = p.createVector().set(0, 1); // .set() 사용

                // GridRenderer 인스턴스 생성 (생성된 p5 인스턴스 'p' 전달)
                this.standardGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
                this.primalGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
                this.dualGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);

                p.describe('Interactive 2D basis transformation visualization showing primal and dual bases and their grids. Handles degenerate cases.');
                p.noLoop(); // draw는 외부에서 상태 변경 시 명시적으로 호출
            };

            // --- p.draw ---
            // 외부 draw 메소드에서 호출될 때 실제 그리기를 수행
            p.draw = () => {
                if (!this.i_hat || !this.j_hat || !this.e1 || !this.e2 || !this.epsilon1 || !this.epsilon2 || !this.standardGrid || !this.primalGrid || !this.dualGrid) {
                    return; // 아직 준비 안됨
                }

                // --- 렌더링 ---
                p.background(255);
                applyCoordinateTransform();

                // 표준 그리드 그리기
                this.standardGrid.display(this.i_hat, this.j_hat, p.color(200), 1);

                // Primal Basis 및 Grid 그리기 (유효할 때만)
                if (isP5VectorValidForDrawing(this.e1) && isP5VectorValidForDrawing(this.e2)) {
                    this.primalGrid.display(this.e1, this.e2, p.color(0, 0, 255, 150), 1.5);
                    drawVector(this.e1, p.color(0, 0, 255), 'e₁');
                    drawVector(this.e2, p.color(0, 0, 255), 'e₂');
                } else {
                    if (isP5VectorValidForDrawing(this.e1)) drawVector(this.e1, p.color(0, 0, 255), 'e₁');
                    if (isP5VectorValidForDrawing(this.e2)) drawVector(this.e2, p.color(0, 0, 255), 'e₂');
                }

                // Dual Basis 및 Grid 그리기 (유효할 때만)
                if (isP5VectorValidForDrawing(this.epsilon1) && isP5VectorValidForDrawing(this.epsilon2)) {
                    this.dualGrid.display(this.epsilon1, this.epsilon2, p.color(255, 0, 0, 150), 1.5);
                    drawVector(this.epsilon1, p.color(255, 0, 0), 'ε¹');
                    drawVector(this.epsilon2, p.color(255, 0, 0), 'ε²');
                }

                p.resetMatrix(); // 변환 리셋
            };

            // --- p.windowResized (선택적) ---
            // 필요시 구현
        }; // End of sketch function definition

        // p5 인스턴스 생성 및 저장 (이제 P5는 값으로 사용 가능)
        this.p5Instance = new P5(sketch);
    }

    /**
     * 외부 상태 객체를 받아 p5 내부 벡터를 업데이트하고 p5.draw()를 호출합니다.
     */
    draw(state: BasisVisualizationState): void {
        if (!this.p5Instance || !this.e1 || !this.e2 || !this.epsilon1 || !this.epsilon2) {
            return;
        }

        // 상태 객체에서 값 읽기 및 유효성 검사
        const validE1 = isVectorDataValid(state.e1);
        const validE2 = isVectorDataValid(state.e2);
        const validEpsilon1 = isVectorDataValid(state.epsilon1);
        const validEpsilon2 = isVectorDataValid(state.epsilon2);

        // p5 벡터 업데이트 (유효하지 않으면 NaN 할당)
        this.e1.set(validE1 ? state.e1.x : NaN, validE1 ? state.e1.y : NaN);
        this.e2.set(validE2 ? state.e2.x : NaN, validE2 ? state.e2.y : NaN);
        this.epsilon1.set(validEpsilon1 ? state.epsilon1.x : NaN, validEpsilon1 ? state.epsilon1.y : NaN);
        this.epsilon2.set(validEpsilon2 ? state.epsilon2.x : NaN, validEpsilon2 ? state.epsilon2.y : NaN);

        // p5의 draw 함수를 명시적으로 호출하여 다시 그리도록 함
        if (this.p5Instance) {
            // noLoop()를 사용했으므로 redraw() 호출
            this.p5Instance.redraw();
        }
    }

    /**
     * p5 인스턴스를 제거하고 리소스를 정리합니다.
     */
    destroy(): void {
        if (this.p5Instance) {
            this.p5Instance.remove();
            this.p5Instance = null;
            console.log("P5BasisRenderer destroyed.");
        }
        this.container = null; // 컨테이너 참조 제거
    }

    /**
     * 캔버스 크기를 조절합니다 (필요시 구현).
     */
    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        if (this.p5Instance) {
            this.p5Instance.resizeCanvas(this.width, this.height);
            this.p5Instance.redraw(); // 크기 변경 후 다시 그리기
        }
    }
}