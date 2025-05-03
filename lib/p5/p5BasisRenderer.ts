// lib/p5/p5BasisRenderer.ts
import P5 from "p5" // p5 생성자(값) 및 타입 모두 필요
import type { IVisualizationRenderer } from "@/interfaces/rendering/IVisualizationRenderer"
import type { BasisVisualizationState } from "@/interfaces/rendering/BasisVisualizationState"
import { SCALE_FACTOR, GRID_RANGE } from "@/config/constants"

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
      // console.warn("GridRenderer: Invalid basis vectors for display", basis1, basis2);
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
      // Optional: Add more specific error handling or recovery logic here
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

  // --- Internal p5 Vectors (for rendering) ---
  private i_hat: P5.Vector | undefined // Standard basis i
  private j_hat: P5.Vector | undefined // Standard basis j
  private e1: P5.Vector | undefined // Primal basis e1
  private e2: P5.Vector | undefined // Primal basis e2
  private epsilon1: P5.Vector | undefined // Dual basis epsilon1
  private epsilon2: P5.Vector | undefined // Dual basis epsilon2
  private v_std_vec: P5.Vector | undefined // Vector v (standard coords) <-- 추가

  // --- Vector v Component Data (from state) ---
  private v_std_coords: { x: number; y: number } | null = null // <-- 추가
  private v_primal_coords: { x: number; y: number } | null = null // <-- 추가
  private v_dual_coords: { x: number; y: number } | null = null // <-- 추가

  // Grid Renderers
  private standardGrid: GridRenderer | undefined
  private primalGrid: GridRenderer | undefined
  private dualGrid: GridRenderer | undefined

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

      /**
       * 기저 벡터를 화살표와 라벨과 함께 그립니다. (기존 함수)
       */
      const drawBasisVector = (
        vec: P5.Vector,
        c: P5.Color,
        label: string,
      ): void => {
        if (!isP5VectorValidForDrawing(vec)) {
          // console.warn(`Skipping drawBasisVector for invalid vector: ${label}`, vec);
          return
        }
        p.push()
        try {
          const vecScaled = vec.copy().mult(SCALE_FACTOR)
          if (!isP5VectorValidForDrawing(vecScaled)) {
            // console.warn(`Skipping drawBasisVector for invalid scaled vector: ${label}`, vecScaled);
            p.pop()
            return
          }
          p.stroke(c)
          p.strokeWeight(2.5)
          p.fill(c)
          p.line(0, 0, vecScaled.x, vecScaled.y) // Draw line

          const angle = p.atan2(vecScaled.y, vecScaled.x)
          if (isNaN(angle) || !isFinite(angle)) {
            // console.warn(`Skipping drawBasisVector arrowhead/label due to invalid angle: ${label}`, angle);
            p.pop()
            return
          }

          p.translate(vecScaled.x, vecScaled.y) // Move to vector tip
          p.rotate(angle) // Rotate to align with vector
          const arrowSize = 7
          p.translate(-arrowSize * 1.2, 0) // Move back slightly for arrowhead start
          p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0) // Draw arrowhead
          p.rotate(-angle) // Rotate back

          // Use a small offset for the label based on angle
          const labelOffsetDistance = arrowSize * 2.0 // Increased distance slightly
          const labelOffsetX = labelOffsetDistance * p.cos(angle)
          const labelOffsetY = labelOffsetDistance * p.sin(angle)

          // Adjust text alignment based on quadrant for better placement
          if (Math.abs(vecScaled.x) > 0.1 || Math.abs(vecScaled.y) > 0.1) {
            // Avoid centering at origin
            const labelPosX = labelOffsetX
            const labelPosY = labelOffsetY

            p.translate(labelPosX, labelPosY) // Move relative to tip
            p.scale(1, -1) // Flip text back upright
            p.noStroke()
            p.fill(c)
            p.textSize(16)

            // Simplified alignment: Center alignment generally works well
            p.textAlign(p.CENTER, p.CENTER)
            p.text(label, 0, 0) // Draw label at translated origin
          } else {
            // Handle zero vector case if necessary (e.g., don't draw label)
            p.scale(1, -1) // Still need to flip back
          }
        } catch (error) {
          console.error(`Error drawing basis vector ${label}:`, error)
        } finally {
          p.pop()
        }
      }

      /**
       * --- 추가된 함수 ---
       * 데이터 벡터 v와 그 성분 레이블들을 함께 그립니다.
       */
      const drawDataVector = (
        vec_std: P5.Vector, // Vector defined in standard coords (for drawing arrow)
        coords_std: { x: number; y: number } | null,
        coords_primal: { x: number; y: number } | null,
        coords_dual: { x: number; y: number } | null,
        c: P5.Color,
      ): void => {
        // Check both vector validity and coordinate data presence
        if (
          !isP5VectorValidForDrawing(vec_std) ||
          !coords_std ||
          isNaN(coords_std.x) ||
          isNaN(coords_std.y)
        ) {
          // console.warn("Skipping drawDataVector due to invalid vector or missing/NaN std coords", vec_std, coords_std);
          return // 기본 벡터나 표준 좌표 없거나 유효하지 않으면 그리지 않음
        }

        p.push() // Start isolated drawing state
        try {
          // --- Draw Arrow (based on standard coordinates) ---
          const vecScaled = vec_std.copy().mult(SCALE_FACTOR)
          if (!isP5VectorValidForDrawing(vecScaled)) {
            // console.warn("Skipping drawDataVector due to invalid scaled vector", vecScaled);
            p.pop()
            return
          }
          p.stroke(c)
          p.strokeWeight(2.5)
          p.fill(c)
          p.line(0, 0, vecScaled.x, vecScaled.y) // Draw line

          const angle = p.atan2(vecScaled.y, vecScaled.x)
          if (isNaN(angle) || !isFinite(angle)) {
            // console.warn("Skipping drawDataVector arrowhead/label due to invalid angle", angle);
            p.pop()
            return
          }

          // Draw arrowhead
          p.translate(vecScaled.x, vecScaled.y) // Move to vector tip
          p.rotate(angle) // Rotate context to align with vector
          const arrowSize = 7
          p.translate(-arrowSize * 1.2, 0) // Move back slightly for arrowhead start
          p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0)
          p.rotate(-angle) // Rotate back to original axis alignment (but still at tip)

          // --- Draw Text Labels ---
          p.noStroke()
          p.fill(c)
          p.textSize(14) // Slightly smaller text size

          // Calculate offset from arrowhead tip (relative to tip position)
          const textOffsetX = 15 // Horizontal distance from tip
          const textOffsetY = -5 // Vertical start distance (negative moves up in p5's standard coord)
          const lineHeight = 16 // Vertical space between labels

          // Create an offset vector and rotate it by the vector's angle
          const baseOffset = p.createVector().set(textOffsetX, textOffsetY) // Use createVector directly
          const rotatedOffset = baseOffset.copy().rotate(angle) // Rotate a copy

          // Apply the final coordinate system flip for text rendering
          p.scale(1, -1) // Flip y-axis ONLY FOR TEXT rendering

          // Text position relative to the vector tip (after rotation, before y-flip)
          const textBaseX = rotatedOffset.x
          let currentTextY = -rotatedOffset.y // Start Y position (negated due to scale flip)

          // Determine text alignment based on angle to avoid overlap with arrow shaft
          if (angle > -p.PI * 0.45 && angle < p.PI * 0.45) {
            // Right side
            p.textAlign(p.LEFT, p.BOTTOM)
          } else if (angle > p.PI * 0.55 || angle < -p.PI * 0.55) {
            // Left side
            p.textAlign(p.RIGHT, p.BOTTOM)
          } else if (angle >= p.PI * 0.45) {
            // Top
            p.textAlign(p.CENTER, p.BOTTOM)
            currentTextY -= lineHeight // Extra space from top arrow
          } else {
            // Bottom
            p.textAlign(p.CENTER, p.TOP)
            currentTextY += lineHeight // Extra space from bottom arrow
          }

          // Label 1: Standard Coords v,ω(x, y)
          p.text(
            `v,ω(${coords_std.x.toFixed(1)}, ${coords_std.y.toFixed(1)})`,
            textBaseX,
            currentTextY,
          )

          // Label 2: Primal Coords v'(x', y')
          if (
            coords_primal &&
            isFinite(coords_primal.x) &&
            isFinite(coords_primal.y)
          ) {
            currentTextY -= lineHeight // Move down for next line (in flipped coords)
            p.text(
              `v'(${coords_primal.x.toFixed(1)}, ${coords_primal.y.toFixed(1)})`,
              textBaseX,
              currentTextY,
            )
          }

          // Label 3: Dual Coords ω'(ω₁, ω₂)
          if (
            coords_dual &&
            isFinite(coords_dual.x) &&
            isFinite(coords_dual.y)
          ) {
            currentTextY -= lineHeight // Move down for next line
            p.text(
              `ω'(${coords_dual.x.toFixed(1)}, ${coords_dual.y.toFixed(1)})`,
              textBaseX,
              currentTextY,
            )
          }
        } catch (error) {
          console.error("Error drawing data vector:", error)
        } finally {
          p.pop() // Restore previous drawing state
        }
      }

      // --- p.setup ---
      p.setup = () => {
        if (!self.container) {
          // Use 'self' here
          console.error("P5BasisRenderer: Container not set before setup!")
          return
        }
        const canvas = p.createCanvas(self.width, self.height) // Use 'self'
        canvas.parent(self.container) // Use 'self'

        // Initialize p5 vectors
        self.i_hat = p.createVector().set(1, 0) // Use 'self'
        self.j_hat = p.createVector().set(0, 1) // Use 'self'
        self.e1 = p.createVector().set(1, 0) // Use 'self'
        self.e2 = p.createVector().set(0, 1) // Use 'self'
        self.epsilon1 = p.createVector().set(1, 0) // Use 'self'
        self.epsilon2 = p.createVector().set(0, 1) // Use 'self'
        self.v_std_vec = p.createVector().set(1, 1) // Initialize vector v <-- 추가, Use 'self'

        // --- ADD --- Initialize coordinate data based on known initial state
        // Initial state: e1=(1,0), e2=(0,1) => M = I, M_inv = I, det=1
        // v_std = (1,1)
        // v_primal = M_inv * v_std = I * (1,1) = (1,1)
        // v_dual = (v_std dot e1, v_std dot e2) = ((1,1) dot (1,0), (1,1) dot (0,1)) = (1, 1)
        self.v_std_coords = { x: 1, y: 1 } // Use 'self'
        self.v_primal_coords = { x: 1, y: 1 } // Use 'self'
        self.v_dual_coords = { x: 1, y: 1 } // Use 'self'
        // --- END ADD ---

        // Initialize Grid Renderers
        self.standardGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR) // Use 'self'
        self.primalGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR) // Use 'self'
        self.dualGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR) // Use 'self'

        p.describe(
          "Interactive 2D basis transformation visualization showing primal, dual bases, their grids, and a data vector v with its components in different bases.",
        )
        p.noLoop()
      }

      // --- p.draw ---
      p.draw = () => {
        // Check if essential components are ready using 'self'
        if (
          !self.i_hat ||
          !self.j_hat ||
          !self.e1 ||
          !self.e2 ||
          !self.epsilon1 ||
          !self.epsilon2 ||
          !self.v_std_vec || // <-- 추가
          !self.standardGrid ||
          !self.primalGrid ||
          !self.dualGrid
        ) {
          // console.warn("P5BasisRenderer.draw: Essential components not ready.");
          return // Not ready
        }

        try {
          p.background(255) // Clear background
          applyCoordinateTransform() // Set coordinate system

          // Draw Grids using 'self'
          self.standardGrid.display(self.i_hat, self.j_hat, p.color(200), 1) // Standard (Gray)
          if (
            isP5VectorValidForDrawing(self.e1) &&
            isP5VectorValidForDrawing(self.e2)
          ) {
            self.primalGrid.display(
              self.e1,
              self.e2,
              p.color(0, 0, 255, 150),
              1.5,
            ) // Primal (Blue)
          }
          if (
            isP5VectorValidForDrawing(self.epsilon1) &&
            isP5VectorValidForDrawing(self.epsilon2)
          ) {
            // Dual Grid requires epsilon vectors, not e1/e2
            self.dualGrid.display(
              self.epsilon1, // Corrected
              self.epsilon2, // Corrected
              p.color(255, 0, 0, 150),
              1.5,
            ) // Dual (Red)
          }

          // Draw Basis Vectors using 'self'
          drawBasisVector(self.e1, p.color(0, 0, 255), "e₁")
          drawBasisVector(self.e2, p.color(0, 0, 255), "e₂")
          drawBasisVector(self.epsilon1, p.color(255, 0, 0), "ε¹")
          drawBasisVector(self.epsilon2, p.color(255, 0, 0), "ε²")

          // --- 추가: Draw Data Vector v ---
          drawDataVector(
            self.v_std_vec, // The vector arrow is always drawn based on standard coordinates
            self.v_std_coords, // Pass the component data for labels
            self.v_primal_coords,
            self.v_dual_coords,
            p.color(0, 150, 0), // Green color for vector v
          )
        } catch (error) {
          console.error("Error in p.draw:", error)
        } finally {
          p.resetMatrix() // Reset transformations
        }
      }
    } // End of sketch function definition

    // Ensure p5 runs in instance mode
    try {
      this.p5Instance = new P5(sketch)
      if (!this.p5Instance) {
        throw new Error("Failed to create p5 instance.")
      }
    } catch (error) {
      console.error("Failed to initialize P5BasisRenderer:", error)
      this.p5Instance = null // Ensure instance is null on failure
      // Optionally re-throw or handle the error further
      // throw error;
    }
  }

  /**
   * Updates internal p5 vectors and data based on the state, then redraws.
   */
  draw(state: BasisVisualizationState): void {
    // Check for p5Instance before accessing its properties or methods
    if (!this.p5Instance) {
      // console.warn("P5BasisRenderer.draw called before p5 instance is ready.");
      return
    }
    // Check internal vector states (now checked using self reference logic implicitly via p.draw checks)
    if (
      !this.e1 ||
      !this.e2 ||
      !this.epsilon1 ||
      !this.epsilon2 ||
      !this.v_std_vec
    ) {
      // console.warn("P5BasisRenderer.draw: Internal vectors not initialized.");
      return // Not fully initialized
    }

    // --- Update Basis Vectors ---
    // Use default NaN values if state data is invalid
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

    // --- 추가: Update Vector v Data ---
    const validVStd = isVectorDataValid(state.v_std)
    const validVPrimal = isVectorDataValid(state.v_primal)
    const validVDual = isVectorDataValid(state.v_dual)

    // Update the p5 vector representing v (always based on standard coords)
    this.v_std_vec.set(
      validVStd ? state.v_std.x : NaN,
      validVStd ? state.v_std.y : NaN,
    )

    // Store the component data for labeling, use null if invalid
    this.v_std_coords = validVStd ? { ...state.v_std } : null
    this.v_primal_coords = validVPrimal ? { ...state.v_primal } : null
    this.v_dual_coords = validVDual ? { ...state.v_dual } : null

    // Trigger p5 redraw only if instance exists
    try {
      this.p5Instance.redraw()
    } catch (error) {
      console.error("Error calling p5.redraw:", error)
    }
  }

  destroy(): void {
    if (this.p5Instance) {
      try {
        this.p5Instance.remove()
        console.log("P5BasisRenderer destroyed.")
      } catch (error) {
        console.error("Error removing p5 instance:", error)
      } finally {
        this.p5Instance = null
      }
    }
    this.container = null
    this.i_hat = undefined
    this.j_hat = undefined
    this.e1 = undefined
    this.e2 = undefined
    this.epsilon1 = undefined
    this.epsilon2 = undefined
    this.v_std_vec = undefined // <-- 추가
    this.standardGrid = undefined
    this.primalGrid = undefined
    this.dualGrid = undefined
    // Clear component data
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
        // Redraw after resize is generally needed
        this.p5Instance.redraw()
      } catch (error) {
        console.error("Error resizing p5 canvas:", error)
      }
    }
  }
}
