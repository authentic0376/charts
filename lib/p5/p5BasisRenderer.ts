// lib/p5/p5BasisRenderer.ts
import P5 from "p5"
import type { IVisualizationRenderer } from "@/interfaces/rendering/IVisualizationRenderer"
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"
import { SCALE_FACTOR, GRID_RANGE } from "@/config/constants"
import type { Ref } from "vue" // Ref 타입을 사용하기 위해 import

// --- 헬퍼 함수들 ---
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
class GridRenderer {
  private p: P5
  private range: number
  private scale: number

  constructor(pInstance: P5, range: number, scaleFactor: number) {
    if (!pInstance) {
      throw new Error("GridRenderer requires a valid p5 instance.")
    }
    this.p = pInstance
    this.range = range
    this.scale = scaleFactor
  }

  private isValidVector(v: P5.Vector | null | undefined): v is P5.Vector {
    return isP5VectorValidForDrawing(v)
  }

  public display(
    basis1: P5.Vector,
    basis2: P5.Vector,
    c: P5.Color,
    weight: number,
  ): void {
    if (!this.isValidVector(basis1) || !this.isValidVector(basis2)) {
      return
    }
    const p = this.p
    p.stroke(c)
    p.strokeWeight(weight)
    p.noFill()
    try {
      for (let i = -this.range; i <= this.range; i++) {
        const term1 = basis1.copy().mult(i)
        if (!this.isValidVector(term1)) continue
        const term2_neg = basis2.copy().mult(-this.range)
        if (!this.isValidVector(term2_neg)) continue
        const term2_pos = basis2.copy().mult(this.range)
        if (!this.isValidVector(term2_pos)) continue

        const p1 = P5.Vector.add(term1, term2_neg)
        if (!this.isValidVector(p1)) continue
        const p2 = P5.Vector.add(term1, term2_pos)
        if (!this.isValidVector(p2)) continue
        p.line(
          p1.x * this.scale,
          p1.y * this.scale,
          p2.x * this.scale,
          p2.y * this.scale,
        )

        const term3 = basis1.copy().mult(-this.range)
        if (!this.isValidVector(term3)) continue
        const term4 = basis1.copy().mult(this.range)
        if (!this.isValidVector(term4)) continue
        const term5 = basis2.copy().mult(i)
        if (!this.isValidVector(term5)) continue

        const p3 = P5.Vector.add(term3, term5)
        if (!this.isValidVector(p3)) continue
        const p4 = P5.Vector.add(term4, term5)
        if (!this.isValidVector(p4)) continue
        p.line(
          p3.x * this.scale,
          p3.y * this.scale,
          p4.x * this.scale,
          p4.y * this.scale,
        )
      }
    } catch (error) {
      console.error("Error during GridRenderer display:", error)
    }
  }
} // End of GridRenderer class

/**
 * Basis 시각화 렌더러 구현체
 */
export class P5BasisRenderer
  implements IVisualizationRenderer<BasisVisualizationState>
{
  private p5Instance: P5 | null = null
  private container: HTMLElement | null = null
  private width: number = 0
  private height: number = 0
  private canvas: P5.Renderer | null = null // p5 캔버스 객체 저장

  // --- Vector v의 상태를 업데이트하기 위한 Vue Ref ---
  private vxRef: Ref<number> | null = null
  private vyRef: Ref<number> | null = null

  // --- Internal p5 Vectors (for rendering) ---
  private i_hat: P5.Vector | undefined // Standard basis i
  private j_hat: P5.Vector | undefined // Standard basis j
  private e1: P5.Vector | undefined // Primal basis e1
  private e2: P5.Vector | undefined // Primal basis e2
  private epsilon1: P5.Vector | undefined // Dual basis epsilon1
  private epsilon2: P5.Vector | undefined // Dual basis epsilon2
  private v_std_vec: P5.Vector | undefined // Vector v (standard coords)

  // --- Vector v Component Data (from state) ---
  private v_std_coords: { x: number; y: number } | null = null
  private v_primal_coords: { x: number; y: number } | null = null
  private v_dual_coords: { x: number; y: number } | null = null

  // Grid Renderers
  private standardGrid: GridRenderer | undefined
  private primalGrid: GridRenderer | undefined
  private dualGrid: GridRenderer | undefined

  /**
   * Vue 컴포넌트로부터 Vector v의 x, y 좌표를 관리하는 Ref 객체를 받습니다.
   * @param vx Vue 컴포넌트의 input_vx_val Ref
   * @param vy Vue 컴포넌트의 input_vy_val Ref
   */
  public setVectorRefs(vx: Ref<number>, vy: Ref<number>): void {
    this.vxRef = vx
    this.vyRef = vy
  }

  async setup(
    container: HTMLElement,
    initialWidth: number,
    initialHeight: number,
  ): Promise<void> {
    this.container = container
    this.width = initialWidth
    this.height = initialHeight

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this // Store reference to 'this' for use inside sketch

    const sketch = (p: P5) => {
      // --- p5 내부 헬퍼 함수 ---
      const applyCoordinateTransform = (): void => {
        p.translate(p.width / 2, p.height / 2)
        p.scale(1, -1) // Y축 반전
      }

      const drawBasisVector = (
        vec: P5.Vector,
        c: P5.Color,
        label: string,
      ): void => {
        if (!isP5VectorValidForDrawing(vec)) {
          return
        }
        p.push()
        try {
          const vecScaled = vec.copy().mult(SCALE_FACTOR)
          if (!isP5VectorValidForDrawing(vecScaled)) {
            p.pop()
            return
          }
          p.stroke(c)
          p.strokeWeight(2.5)
          p.fill(c)
          p.line(0, 0, vecScaled.x, vecScaled.y)

          const angle = p.atan2(vecScaled.y, vecScaled.x)
          if (isNaN(angle) || !isFinite(angle)) {
            p.pop()
            return
          }

          p.translate(vecScaled.x, vecScaled.y)
          p.rotate(angle)
          const arrowSize = 7
          p.translate(-arrowSize * 1.2, 0)
          p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0)
          p.rotate(-angle)

          const labelOffsetDistance = arrowSize * 2.0
          const labelOffsetX = labelOffsetDistance * p.cos(angle)
          const labelOffsetY = labelOffsetDistance * p.sin(angle)

          if (Math.abs(vecScaled.x) > 0.1 || Math.abs(vecScaled.y) > 0.1) {
            const labelPosX = labelOffsetX
            const labelPosY = labelOffsetY

            p.translate(labelPosX, labelPosY)
            p.scale(1, -1)
            p.noStroke()
            p.fill(c)
            p.textSize(16)
            p.textAlign(p.CENTER, p.CENTER)
            p.text(label, 0, 0)
          } else {
            p.scale(1, -1)
          }
        } catch (error) {
          console.error(`Error drawing basis vector ${label}:`, error)
        } finally {
          p.pop()
        }
      }

      const drawDataVector = (
        vec_std: P5.Vector,
        coords_std: { x: number; y: number } | null,
        coords_primal: { x: number; y: number } | null,
        coords_dual: { x: number; y: number } | null,
        c: P5.Color,
      ): void => {
        if (
          !isP5VectorValidForDrawing(vec_std) ||
          !coords_std ||
          isNaN(coords_std.x) ||
          isNaN(coords_std.y)
        ) {
          return
        }

        p.push()
        try {
          const vecScaled = vec_std.copy().mult(SCALE_FACTOR)
          if (!isP5VectorValidForDrawing(vecScaled)) {
            p.pop()
            return
          }
          p.stroke(c)
          p.strokeWeight(2.5)
          p.fill(c)
          p.line(0, 0, vecScaled.x, vecScaled.y)

          const angle = p.atan2(vecScaled.y, vecScaled.x)
          if (isNaN(angle) || !isFinite(angle)) {
            p.pop()
            return
          }

          p.translate(vecScaled.x, vecScaled.y)
          p.rotate(angle)
          const arrowSize = 7
          p.translate(-arrowSize * 1.2, 0)
          p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0)
          p.rotate(-angle)

          p.noStroke()
          p.fill(c)
          p.textSize(14)

          const textOffsetX = 15
          const textOffsetY = -5
          const lineHeight = 16

          const baseOffset = p.createVector().set(textOffsetX, textOffsetY)
          const rotatedOffset = baseOffset.copy().rotate(angle)

          p.scale(1, -1)

          const textBaseX = rotatedOffset.x
          let currentTextY = -rotatedOffset.y

          if (angle > -p.PI * 0.45 && angle < p.PI * 0.45) {
            p.textAlign(p.LEFT, p.BOTTOM)
          } else if (angle > p.PI * 0.55 || angle < -p.PI * 0.55) {
            p.textAlign(p.RIGHT, p.BOTTOM)
          } else if (angle >= p.PI * 0.45) {
            p.textAlign(p.CENTER, p.BOTTOM)
            currentTextY -= lineHeight
          } else {
            p.textAlign(p.CENTER, p.TOP)
            currentTextY += lineHeight
          }

          p.text(
            `v,ω(${coords_std.x.toFixed(1)}, ${coords_std.y.toFixed(1)})`,
            textBaseX,
            currentTextY,
          )

          if (
            coords_primal &&
            isFinite(coords_primal.x) &&
            isFinite(coords_primal.y)
          ) {
            currentTextY -= lineHeight
            p.text(
              `v'(${coords_primal.x.toFixed(1)}, ${coords_primal.y.toFixed(1)})`,
              textBaseX,
              currentTextY,
            )
          }

          if (
            coords_dual &&
            isFinite(coords_dual.x) &&
            isFinite(coords_dual.y)
          ) {
            currentTextY -= lineHeight
            p.text(
              `ω'(${coords_dual.x.toFixed(1)}, ${coords_dual.y.toFixed(1)})`,
              textBaseX,
              currentTextY,
            )
          }
        } catch (error) {
          console.error("Error drawing data vector:", error)
        } finally {
          p.pop()
        }
      }

      // --- 추가된 함수 ---
      /**
       * 캔버스 클릭 시 호출되어 클릭 지점의 좌표로 Vector v를 업데이트합니다.
       */
      const handleMousePressed = () => {
        // Ref 객체가 설정되었는지, p5 인스턴스가 유효한지 확인
        if (!self.vxRef || !self.vyRef || !self.p5Instance) {
          console.warn("Vector Refs or p5 instance not set for mouse press.")
          return
        }

        // p5.js의 mouseX, mouseY는 캔버스 좌상단 기준 픽셀 좌표
        const mouseX = self.p5Instance.mouseX
        const mouseY = self.p5Instance.mouseY

        // 캔버스 범위 밖 클릭은 무시
        if (
          mouseX < 0 ||
          mouseX > self.width ||
          mouseY < 0 ||
          mouseY > self.height
        ) {
          return
        }

        // 픽셀 좌표 -> 차트 좌표계 변환
        // 1. 중심점 이동 고려 (캔버스 중심이 (0,0)이 되도록)
        let chartX = mouseX - self.width / 2
        let chartY = self.height / 2 - mouseY // Y축 반전 고려 (p5는 위가 0)

        // 2. 스케일링 고려
        chartX = chartX / SCALE_FACTOR
        chartY = chartY / SCALE_FACTOR

        // 변환된 좌표로 Vue 컴포넌트의 Ref 업데이트
        self.vxRef.value = chartX
        self.vyRef.value = chartY

        // 상태가 업데이트되었으므로 다시 그리도록 요청 (선택적, Vue의 watch가 처리할 수도 있음)
        // self.p5Instance.redraw();
      }

      // --- p.setup ---
      p.setup = () => {
        if (!self.container) {
          console.error("P5BasisRenderer: Container not set before setup!")
          return
        }
        self.canvas = p.createCanvas(self.width, self.height) // 캔버스 객체 저장
        self.canvas.parent(self.container)

        // --- 중요: 캔버스 클릭 이벤트 핸들러 등록 ---
        self.canvas.mousePressed(handleMousePressed)

        self.i_hat = p.createVector().set(1, 0)
        self.j_hat = p.createVector().set(0, 1)
        self.e1 = p.createVector().set(1, 0)
        self.e2 = p.createVector().set(0, 1)
        self.epsilon1 = p.createVector().set(1, 0)
        self.epsilon2 = p.createVector().set(0, 1)
        self.v_std_vec = p.createVector().set(1, 1) // 초기값

        // 초기 좌표 데이터 설정
        self.v_std_coords = { x: 1, y: 1 }
        self.v_primal_coords = { x: 1, y: 1 }
        self.v_dual_coords = { x: 1, y: 1 }

        self.standardGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR)
        self.primalGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR)
        self.dualGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR)

        p.describe(
          "Interactive 2D basis transformation visualization. Click on the canvas to set the green vector 'v'.",
        )
        p.noLoop()
      }

      // --- p.draw ---
      p.draw = () => {
        if (
          !self.i_hat ||
          !self.j_hat ||
          !self.e1 ||
          !self.e2 ||
          !self.epsilon1 ||
          !self.epsilon2 ||
          !self.v_std_vec ||
          !self.standardGrid ||
          !self.primalGrid ||
          !self.dualGrid
        ) {
          return // Not ready
        }

        try {
          p.background(255)
          applyCoordinateTransform()

          self.standardGrid.display(self.i_hat, self.j_hat, p.color(200), 1)
          if (
            isP5VectorValidForDrawing(self.e1) &&
            isP5VectorValidForDrawing(self.e2)
          ) {
            self.primalGrid.display(
              self.e1,
              self.e2,
              p.color(0, 0, 255, 150),
              1.5,
            )
          }
          if (
            isP5VectorValidForDrawing(self.epsilon1) &&
            isP5VectorValidForDrawing(self.epsilon2)
          ) {
            self.dualGrid.display(
              self.epsilon1,
              self.epsilon2,
              p.color(255, 0, 0, 150),
              1.5,
            )
          }

          drawBasisVector(self.e1, p.color(0, 0, 255), "e₁")
          drawBasisVector(self.e2, p.color(0, 0, 255), "e₂")
          drawBasisVector(self.epsilon1, p.color(255, 0, 0), "ε¹")
          drawBasisVector(self.epsilon2, p.color(255, 0, 0), "ε²")

          // 초록색 데이터 벡터 그리기
          drawDataVector(
            self.v_std_vec,
            self.v_std_coords,
            self.v_primal_coords,
            self.v_dual_coords,
            p.color(0, 150, 0), // Green color
          )
        } catch (error) {
          console.error("Error in p.draw:", error)
        } finally {
          p.resetMatrix()
        }
      }
    } // End of sketch function definition

    try {
      this.p5Instance = new P5(sketch)
      if (!this.p5Instance) {
        throw new Error("Failed to create p5 instance.")
      }
    } catch (error) {
      console.error("Failed to initialize P5BasisRenderer:", error)
      this.p5Instance = null
    }
  }

  draw(state: BasisVisualizationState): void {
    if (!this.p5Instance) {
      return
    }
    if (
      !this.e1 ||
      !this.e2 ||
      !this.epsilon1 ||
      !this.epsilon2 ||
      !this.v_std_vec
    ) {
      return
    }

    const validE1 = isVectorDataValid(state.e1)
    const validE2 = isVectorDataValid(state.e2)
    const validEpsilon1 = isVectorDataValid(state.epsilon1)
    const validEpsilon2 = isVectorDataValid(state.epsilon2)

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

    const validVStd = isVectorDataValid(state.v_std)
    const validVPrimal = isVectorDataValid(state.v_primal)
    const validVDual = isVectorDataValid(state.v_dual)

    this.v_std_vec.set(
      validVStd ? state.v_std.x : NaN,
      validVStd ? state.v_std.y : NaN,
    )

    this.v_std_coords = validVStd ? { ...state.v_std } : null
    this.v_primal_coords = validVPrimal ? { ...state.v_primal } : null
    this.v_dual_coords = validVDual ? { ...state.v_dual } : null

    try {
      this.p5Instance.redraw()
    } catch (error) {
      console.error("Error calling p5.redraw:", error)
    }
  }

  destroy(): void {
    if (this.p5Instance) {
      try {
        // 마우스 이벤트 리스너 명시적 제거 (필요 시)
        if (this.canvas) {
          this.canvas.mousePressed(null as any) // p5 타입 정의가 완벽하지 않을 수 있음
        }
        this.p5Instance.remove()
        console.log("P5BasisRenderer destroyed.")
      } catch (error) {
        console.error("Error removing p5 instance:", error)
      } finally {
        this.p5Instance = null
        this.canvas = null
      }
    }
    this.container = null
    this.vxRef = null // Ref 참조 해제
    this.vyRef = null // Ref 참조 해제
    this.i_hat = undefined
    this.j_hat = undefined
    this.e1 = undefined
    this.e2 = undefined
    this.epsilon1 = undefined
    this.epsilon2 = undefined
    this.v_std_vec = undefined
    this.standardGrid = undefined
    this.primalGrid = undefined
    this.dualGrid = undefined
    this.v_std_coords = null
    this.v_primal_coords = null
    this.v_dual_coords = null
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    if (this.p5Instance) {
      try {
        this.p5Instance.resizeCanvas(this.width, this.height)
        this.p5Instance.redraw()
      } catch (error) {
        console.error("Error resizing p5 canvas:", error)
      }
    }
  }
}
