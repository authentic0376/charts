// lib/p5/p5BasisRenderer.ts
import P5 from "p5" // p5 생성자(값) 및 타입 모두 필요
import type { IVisualizationRenderer } from "@/interfaces/rendering/IVisualizationRenderer"
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"
import { SCALE_FACTOR, GRID_RANGE } from "@/config/constants"

// --- 헬퍼 함수들 ---

// 벡터 데이터 유효성 검사 (간단한 {x, y} 객체용)
const isVectorDataValid = (
  v: { x: number; y: number } | null | undefined,
): v is { x: number; y: number } => {
  return (
    !!v &&
    typeof v.x === "number" &&
    !isNaN(v.x) &&
    isFinite(v.x) &&
    typeof v.y === "number" &&
    !isNaN(v.y) &&
    isFinite(v.y)
  )
}

// p5.Vector 객체 유효성 검사 (렌더링 가능한지)
const isP5VectorValidForDrawing = (
  v: P5.Vector | null | undefined,
): v is P5.Vector => {
  return (
    !!v &&
    typeof v.x === "number" &&
    !isNaN(v.x) &&
    isFinite(v.x) &&
    typeof v.y === "number" &&
    !isNaN(v.y) &&
    isFinite(v.y)
  )
}

// --- GridRenderer 클래스 ---
// 그리드 렌더링 로직을 담당하는 클래스
class GridRenderer {
  private p: P5 // p5 인스턴스 참조 (주입받음)
  private range: number
  private scale: number

  /**
   * GridRenderer 생성자
   * @param pInstance 유효한 p5 인스턴스
   * @param range 그리드 범위
   * @param scaleFactor 스케일 팩터
   */
  constructor(pInstance: P5, range: number, scaleFactor: number) {
    if (!pInstance) {
      throw new Error("GridRenderer requires a valid p5 instance.")
    }
    this.p = pInstance // p5 인스턴스 저장
    this.range = range
    this.scale = scaleFactor
  }

  // GridRenderer 내부에서 사용할 벡터 유효성 검사
  private isValidVector(v: P5.Vector | null | undefined): v is P5.Vector {
    return isP5VectorValidForDrawing(v) // 위에서 정의한 헬퍼 사용
  }

  /**
   * 주어진 기저 벡터를 사용하여 그리드를 그립니다.
   * @param basis1 기저 벡터 1
   * @param basis2 기저 벡터 2
   * @param c 그리드 선 색상
   * @param weight 그리드 선 두께
   */
  public display(
    basis1: P5.Vector,
    basis2: P5.Vector,
    c: P5.Color,
    weight: number,
  ): void {
    // 기저 벡터 유효성 검사
    if (!this.isValidVector(basis1) || !this.isValidVector(basis2)) {
      // console.warn("GridRenderer: Invalid basis vectors provided for drawing.");
      return // 유효하지 않으면 그리지 않음
    }

    const p = this.p // 주입받은 p5 인스턴스 사용
    p.stroke(c)
    p.strokeWeight(weight)
    p.noFill()

    for (let i = -this.range; i <= this.range; i++) {
      // i * basis1 벡터 계산
      const term1 = basis1.copy().mult(i)
      if (!this.isValidVector(term1)) continue

      // -range * basis2 벡터 계산
      const term2_neg = basis2.copy().mult(-this.range)
      if (!this.isValidVector(term2_neg)) continue

      // range * basis2 벡터 계산
      const term2_pos = basis2.copy().mult(this.range)
      if (!this.isValidVector(term2_pos)) continue

      // 첫 번째 방향 그리드 라인 끝점 계산 (i*b1 - range*b2) 와 (i*b1 + range*b2)
      // p5.Vector 클래스의 정적 add 메서드 대신 인스턴스 add 사용 고려 또는 p.createVector 활용
      const p1 = P5.Vector.add(term1, term2_neg) // p5 인스턴스의 생성자를 통해 Vector 접근
      if (!this.isValidVector(p1)) continue

      const p2 = P5.Vector.add(term1, term2_pos)
      if (!this.isValidVector(p2)) continue

      // 첫 번째 방향 그리드 라인 그리기
      p.line(
        p1.x * this.scale,
        p1.y * this.scale,
        p2.x * this.scale,
        p2.y * this.scale,
      )

      // 두 번째 방향 그리드 라인 계산을 위한 벡터 계산
      const term3 = basis1.copy().mult(-this.range) // -range * basis1
      if (!this.isValidVector(term3)) continue

      const term4 = basis1.copy().mult(this.range) // range * basis1
      if (!this.isValidVector(term4)) continue

      const term5 = basis2.copy().mult(i) // i * basis2
      if (!this.isValidVector(term5)) continue

      // 두 번째 방향 그리드 라인 끝점 계산 (-range*b1 + i*b2) 와 (range*b1 + i*b2)
      const p3 = P5.Vector.add(term3, term5)
      if (!this.isValidVector(p3)) continue

      const p4 = P5.Vector.add(term4, term5)
      if (!this.isValidVector(p4)) continue

      // 두 번째 방향 그리드 라인 그리기
      p.line(
        p3.x * this.scale,
        p3.y * this.scale,
        p4.x * this.scale,
        p4.y * this.scale,
      )
    }
  }
} // End of GridRenderer class

/**
 * IVisualizationRenderer 인터페이스의 p5.js 구현체.
 * Basis 벡터와 그리드를 p5.js를 사용하여 캔버스에 렌더링합니다.
 */
export class P5BasisRenderer
  implements IVisualizationRenderer<BasisVisualizationState>
{
  private p5Instance: P5 | null = null // p5 인스턴스 저장
  private container: HTMLElement | null = null // 캔버스가 마운트될 부모 요소
  private width: number = 0 // 캔버스 너비
  private height: number = 0 // 캔버스 높이

  // p5 내부에서 사용할 벡터 (매 프레임 상태로부터 업데이트됨)
  private i_hat: P5.Vector | undefined // 표준 기저 벡터 i
  private j_hat: P5.Vector | undefined // 표준 기저 벡터 j
  private e1: P5.Vector | undefined // Primal 기저 벡터 1
  private e2: P5.Vector | undefined // Primal 기저 벡터 2
  private epsilon1: P5.Vector | undefined // Dual 기저 벡터 1
  private epsilon2: P5.Vector | undefined // Dual 기저 벡터 2

  // GridRenderer 인스턴스
  private standardGrid: GridRenderer | undefined // 표준 그리드 렌더러
  private primalGrid: GridRenderer | undefined // Primal 그리드 렌더러
  private dualGrid: GridRenderer | undefined // Dual 그리드 렌더러

  /**
   * p5 인스턴스를 생성하고 캔버스를 설정합니다.
   * @param container 캔버스를 추가할 부모 HTML 요소.
   * @param initialWidth 초기 캔버스 너비.
   * @param initialHeight 초기 캔버스 높이.
   */
  async setup(
    container: HTMLElement,
    initialWidth: number,
    initialHeight: number,
  ): Promise<void> {
    this.container = container
    this.width = initialWidth
    this.height = initialHeight

    // p5 인스턴스 생성을 위한 스케치 함수 정의
    const sketch = (p: P5) => {
      // --- p5 내부 헬퍼 함수 ---

      /**
       * 좌표계를 캔버스 중앙 원점으로 이동하고 y축을 반전시킵니다.
       */
      const applyCoordinateTransform = (): void => {
        p.translate(p.width / 2, p.height / 2) // 원점을 중앙으로 이동
        p.scale(1, -1) // y축 반전 (수학 좌표계처럼 위쪽이 양수)
      }

      /**
       * 벡터를 화살표와 라벨과 함께 그립니다.
       * @param vec 그릴 p5 벡터 객체
       * @param c 색상
       * @param label 라벨 문자열
       */
      const drawVector = (vec: P5.Vector, c: P5.Color, label: string): void => {
        // 벡터 유효성 검사
        if (!isP5VectorValidForDrawing(vec)) {
          // console.warn(`drawVector: Invalid vector data for label "${label}". Skipping draw.`);
          return
        }

        p.push() // 현재 드로잉 스타일 및 변환 상태 저장

        // 벡터를 스케일 팩터만큼 확대
        const vecScaled = vec.copy().mult(SCALE_FACTOR)
        if (!isP5VectorValidForDrawing(vecScaled)) {
          p.pop()
          return
        }

        // 선 설정 및 그리기 (원점에서 벡터 끝점까지)
        p.stroke(c)
        p.strokeWeight(2.5)
        p.fill(c)
        p.line(0, 0, vecScaled.x, vecScaled.y)

        // 화살촉 각도 계산
        const angle = p.atan2(vecScaled.y, vecScaled.x)
        if (isNaN(angle) || !isFinite(angle)) {
          p.pop()
          return
        } // 유효하지 않은 각도면 중단

        // 화살촉 위치 및 방향 설정
        p.translate(vecScaled.x, vecScaled.y) // 벡터 끝점으로 이동
        p.rotate(angle) // 벡터 방향으로 회전
        const arrowSize = 7
        p.translate(-arrowSize * 1.2, 0) // 화살촉 모양 시작 위치로 약간 뒤로 이동
        p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0) // 삼각형 화살촉 그리기
        p.rotate(-angle) // 원래 각도로 복원

        // 라벨 위치 계산 (화살표 끝에서 약간 떨어진 곳)
        const labelOffsetBase = p.createVector().set(arrowSize * 1.8, 0) // 기본 오프셋 벡터 생성
        const rotatedOffset = labelOffsetBase.rotate(angle) // 벡터 방향에 맞춰 오프셋 회전
        if (!isP5VectorValidForDrawing(rotatedOffset)) {
          p.pop()
          return
        } // 유효하지 않으면 중단

        p.translate(rotatedOffset.x, rotatedOffset.y) // 계산된 라벨 위치로 이동
        p.scale(1, -1) // 라벨 텍스트는 뒤집히지 않도록 다시 y축 반전
        p.noStroke()
        p.fill(c)
        p.textSize(16)
        p.textAlign(p.CENTER, p.CENTER)
        p.text(label, 0, 0) // 라벨 텍스트 그리기

        p.pop() // 이전 드로잉 스타일 및 변환 상태 복원
      }

      // --- p.setup ---
      // p5 스케치 초기화 시 호출됨
      p.setup = () => {
        if (!this.container) {
          console.error("P5BasisRenderer: Container not set before setup!")
          return
        }
        // 캔버스 생성 및 부모 컨테이너에 추가
        const canvas = p.createCanvas(this.width, this.height)
        canvas.parent(this.container)

        // 내부 p5 벡터 초기화 (좌표값 설정)
        this.i_hat = p.createVector().set(1, 0)
        this.j_hat = p.createVector().set(0, 1)
        this.e1 = p.createVector().set(1, 0) // 초기값 설정
        this.e2 = p.createVector().set(0, 1) // 초기값 설정
        this.epsilon1 = p.createVector().set(1, 0) // 초기값 설정
        this.epsilon2 = p.createVector().set(0, 1) // 초기값 설정

        // GridRenderer 인스턴스 생성 (생성된 p5 인스턴스 'p' 전달)
        this.standardGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR)
        this.primalGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR)
        this.dualGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR)

        // 접근성 설명 추가
        p.describe(
          "Interactive 2D basis transformation visualization showing primal and dual bases and their grids. Handles degenerate cases.",
        )

        // draw 함수는 외부 상태 변경 시 명시적으로 호출되므로, 자동 루프는 끔
        p.noLoop()
      }

      // --- p.draw ---
      // 외부 draw 메소드에서 redraw()를 호출할 때 실제 그리기를 수행
      p.draw = () => {
        // 필요한 모든 내부 상태(벡터, 그리드 렌더러)가 준비되었는지 확인
        if (
          !this.i_hat ||
          !this.j_hat ||
          !this.e1 ||
          !this.e2 ||
          !this.epsilon1 ||
          !this.epsilon2 ||
          !this.standardGrid ||
          !this.primalGrid ||
          !this.dualGrid
        ) {
          // console.warn("P5BasisRenderer: Draw called before setup is complete or vectors are initialized.");
          return // 준비 안됨
        }

        // --- 렌더링 ---
        p.background(255) // 배경 흰색으로 초기화
        applyCoordinateTransform() // 좌표계 설정 (원점 중앙, y축 반전)

        // 표준 그리드 그리기 (회색)
        this.standardGrid.display(this.i_hat, this.j_hat, p.color(200), 1)

        // Primal Basis 및 Grid 그리기 (파란색, 유효할 때만)
        // 두 기저 벡터가 모두 유효해야 그리드를 그림
        if (
          isP5VectorValidForDrawing(this.e1) &&
          isP5VectorValidForDrawing(this.e2)
        ) {
          this.primalGrid.display(
            this.e1,
            this.e2,
            p.color(0, 0, 255, 150),
            1.5,
          )
        }
        // 각 기저 벡터는 개별적으로 유효하면 그림
        if (isP5VectorValidForDrawing(this.e1))
          drawVector(this.e1, p.color(0, 0, 255), "e₁")
        if (isP5VectorValidForDrawing(this.e2))
          drawVector(this.e2, p.color(0, 0, 255), "e₂")

        // Dual Basis 및 Grid 그리기 (빨간색, 유효할 때만)
        // 두 기저 벡터가 모두 유효해야 그리드를 그림
        if (
          isP5VectorValidForDrawing(this.epsilon1) &&
          isP5VectorValidForDrawing(this.epsilon2)
        ) {
          this.dualGrid.display(
            this.epsilon1,
            this.epsilon2,
            p.color(255, 0, 0, 150),
            1.5,
          )
        }
        // 각 기저 벡터는 개별적으로 유효하면 그림
        if (isP5VectorValidForDrawing(this.epsilon1))
          drawVector(this.epsilon1, p.color(255, 0, 0), "ε¹")
        if (isP5VectorValidForDrawing(this.epsilon2))
          drawVector(this.epsilon2, p.color(255, 0, 0), "ε²")

        p.resetMatrix() // 적용된 모든 변환 리셋
      }
    } // End of sketch function definition

    // p5 인스턴스 생성 및 저장 (생성자 사용)
    this.p5Instance = new P5(sketch)
  }

  /**
   * 외부 상태 객체(state)를 받아 p5 내부 벡터를 업데이트하고,
   * p5 인스턴스의 redraw()를 호출하여 캔버스를 다시 그립니다.
   * @param state 렌더링에 필요한 데이터 (BasisVisualizationState 타입).
   */
  draw(state: BasisVisualizationState): void {
    // p5 인스턴스와 내부 벡터들이 초기화되었는지 확인
    if (
      !this.p5Instance ||
      !this.e1 ||
      !this.e2 ||
      !this.epsilon1 ||
      !this.epsilon2
    ) {
      // console.warn("P5BasisRenderer: Draw called before p5 instance or vectors are ready.");
      return
    }

    // 상태 객체에서 값 읽기 및 유효성 검사
    const validE1 = isVectorDataValid(state.e1)
    const validE2 = isVectorDataValid(state.e2)
    const validEpsilon1 = isVectorDataValid(state.epsilon1)
    const validEpsilon2 = isVectorDataValid(state.epsilon2)

    // p5 벡터 업데이트 (유효하지 않으면 NaN 할당하여 Grid/Vector 렌더링 시 건너뛰도록 함)
    this.e1.set(validE1 ? state.e1.x : NaN, validE1 ? state.e1.y : NaN)
    this.e2.set(validE2 ? state.e2.x : NaN, validE2 ? state.e2.y : NaN)
    this.epsilon1.set(
      validEpsilon1 ? state.epsilon1.x : NaN,
      validEpsilon1 ? state.epsilon1.y : NaN,
    )
    this.epsilon2.set(
      validEpsilon2 ? state.epsilon2.x : NaN,
      validEpsilon2 ? state.epsilon2.y : NaN,
    )

    // p5의 draw 함수를 명시적으로 호출하여 다시 그리도록 함 (noLoop 상태이므로 redraw 사용)
    this.p5Instance.redraw()
  }

  /**
   * p5 인스턴스를 제거하고 관련 리소스를 정리합니다.
   */
  destroy(): void {
    if (this.p5Instance) {
      this.p5Instance.remove() // p5 인스턴스 제거 (캔버스 및 관련 리소스 해제)
      this.p5Instance = null
      console.log("P5BasisRenderer destroyed.")
    }
    this.container = null // 컨테이너 참조 제거
    // 내부 벡터 및 그리드 참조도 null로 설정할 수 있음 (선택적)
    this.i_hat = undefined
    this.j_hat = undefined
    this.e1 = undefined
    this.e2 = undefined
    this.epsilon1 = undefined
    this.epsilon2 = undefined
    this.standardGrid = undefined
    this.primalGrid = undefined
    this.dualGrid = undefined
  }

  /**
   * 캔버스 크기를 조절하고 다시 그립니다.
   * @param width 새로운 너비.
   * @param height 새로운 높이.
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    if (this.p5Instance) {
      this.p5Instance.resizeCanvas(this.width, this.height)
      // 크기 변경 후 즉시 다시 그리기 (선택적, 외부 draw 호출로 대체 가능)
      this.p5Instance.redraw()
    }
  }
}
