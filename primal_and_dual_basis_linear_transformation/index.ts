import p5 from 'p5';
// KaTeX 타입 임포트는 선택 사항입니다. 직접 katex.renderToString 등을 사용하지 않으면 필요 없을 수 있습니다.
// import katex from 'katex';

// --- Configuration Constants ---
const SCALE_FACTOR: number = 40; // 1 unit = pixels
const GRID_RANGE: number = 10;   // How far from origin to draw grid lines
const CANVAS_WIDTH: number = 600;
const CANVAS_HEIGHT: number = 600;

// *** KaTeX의 renderMathInElement 함수가 전역에 존재함을 TypeScript에 알림 ***
// 첫 번째 인자는 렌더링할 HTML 요소, 두 번째는 옵션 객체 (any 타입으로 처리)
// 반환값은 없으므로 void
declare const renderMathInElement: (element: HTMLElement, options?: any) => void;

// --- Main p5 Sketch Function (Instance Mode) ---
const sketch = (p: p5): void => {

    // --- UI Elements (will be p5.Element) ---
    let slider_e1x: p5.Element;
    let slider_e1y: p5.Element;
    let slider_e2x: p5.Element;
    let slider_e2y: p5.Element;
    let resetButton: p5.Element;

    // --- State Variables (declared here, initialized in setup) ---
    let i_hat: p5.Vector; // Standard basis i
    let j_hat: p5.Vector; // Standard basis j
    let e1: p5.Vector;    // Primal basis e₁
    let e2: p5.Vector;    // Primal basis e₂
    let epsilon1: p5.Vector; // Dual basis ε¹
    let epsilon2: p5.Vector; // Dual basis ε²

    let detM: number = NaN;    // Determinant
    let M_inv: number[][] = [[NaN, NaN], [NaN, NaN]]; // Inverse matrix

    // --- Helper Class for Drawing Grids ---
    class GridRenderer {
        private range: number;
        private scale: number;
        private p: p5; // Store the p5 instance

        constructor(pInstance: p5, range: number, scaleFactor: number) {
            this.p = pInstance;
            this.range = range;
            this.scale = scaleFactor;
        }

        public display(basis1: p5.Vector, basis2: p5.Vector, c: p5.Color, weight: number): void {
            this.p.stroke(c);
            this.p.strokeWeight(weight);
            this.p.noFill();

            for (let i = -this.range; i <= this.range; i++) {
                // Use instance methods with .copy() to avoid modifying originals and ensure type safety
                const term1 = basis1.copy().mult(i); // i * basis1

                const term2_neg = basis2.copy().mult(-this.range); // -range * basis2
                const p1 = term1.copy().add(term2_neg);            // p1 = (i * basis1) + (-range * basis2)

                const term2_pos = basis2.copy().mult(this.range); // range * basis2
                const p2 = term1.copy().add(term2_pos);           // p2 = (i * basis1) + (range * basis2)

                // Draw line using calculated points (p1, p2 are p5.Vector)
                this.p.line(p1.x * this.scale, p1.y * this.scale, p2.x * this.scale, p2.y * this.scale);

                const term3 = basis1.copy().mult(-this.range); // -range * basis1
                const term4 = basis1.copy().mult(this.range);  // range * basis1
                const term5 = basis2.copy().mult(i);         // i * basis2

                const p3 = term3.copy().add(term5);           // p3 = (-range * basis1) + (i * basis2)
                const p4 = term4.copy().add(term5);           // p4 = (range * basis1) + (i * basis2)

                // Draw line using calculated points (p3, p4 are p5.Vector)
                this.p.line(p3.x * this.scale, p3.y * this.scale, p4.x * this.scale, p4.y * this.scale);
            }
        }
    }

    // --- Grid Renderer Instances (declared here, initialized in setup) ---
    let standardGrid: GridRenderer;
    let primalGrid: GridRenderer;
    let dualGrid: GridRenderer;

    // --- HTML Element References for KaTeX Output (declared here, assigned in setup) ---
    let infoContainer: HTMLElement | null; // 정보 컨테이너 자체 참조
    let el_primal_e1: HTMLElement | null;
    let el_primal_e2: HTMLElement | null;
    let el_matrix_m: HTMLElement | null;
    let el_determinant: HTMLElement | null;
    let el_dual_epsilon1: HTMLElement | null;
    let el_dual_epsilon2: HTMLElement | null;
    let el_matrix_m_inv: HTMLElement | null;

    // --- Setup Function (assigned to p.setup) ---
    p.setup = (): void => {
        // *** infoContainer 할당 ***
        infoContainer = document.getElementById('info-container'); // setup에서 할당

        // Create canvas and place it inside the #canvas-container div
        const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        canvas.parent('canvas-container'); // Assign canvas to the container

        // Initialize vectors
        i_hat = p.createVector(1, 0);
        j_hat = p.createVector(0, 1);
        // Initialize basis vectors to standard basis using helper function
        setBasisToStandard();

        // Initialize Grid Renderers
        standardGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
        primalGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);
        dualGrid = new GridRenderer(p, GRID_RANGE, SCALE_FACTOR);

        // Create UI Sliders and Reset Button, placing them in #controls-container
        createUIElements();

        // Get references to the HTML elements where KaTeX output will go
        el_primal_e1 = document.getElementById('primal-e1');
        el_primal_e2 = document.getElementById('primal-e2');
        el_matrix_m = document.getElementById('matrix-m');
        el_determinant = document.getElementById('determinant');
        el_dual_epsilon1 = document.getElementById('dual-epsilon1');
        el_dual_epsilon2 = document.getElementById('dual-epsilon2');
        el_matrix_m_inv = document.getElementById('matrix-m-inv');

        p.describe(
            'Instance mode implementation of the 2D basis transformation visualizer with KaTeX rendering. Canvas and controls are in separate HTML containers. Shows standard, primal (e1, e2), and dual (epsilon1, epsilon2) grids and vectors. Information displayed using LaTeX via KaTeX. Controlled by sliders and a reset button. (TypeScript Version)'
        );
    };

    // --- Draw Function (assigned to p.draw) ---
    p.draw = (): void => {
        // 1. Update state from UI
        updateBasisVectorsFromSliders(); // Update vectors from slider values

        // 2. Perform Calculations
        calculateTransformations(); // Calculate determinant, inverse, dual vectors

        // 3. Render Visualization on Canvas
        p.background(255);
        applyCoordinateTransform(); // Set drawing origin to center, flip Y axis

        // Draw Grids
        standardGrid.display(i_hat, j_hat, p.color(200), 1);         // Grey Standard Grid
        primalGrid.display(e1, e2, p.color(0, 0, 255, 150), 1.5);    // Blue Primal Grid
        if (!isNaN(detM) && p.abs(detM) > 0.001) { // Only draw dual if determinant is non-zero
            dualGrid.display(epsilon1, epsilon2, p.color(255, 0, 0, 150), 1.5); // Red Dual Grid
        }

        // Draw Basis Vectors
        drawVector(e1, p.color(0, 0, 255), 'e₁'); // Draw e1
        drawVector(e2, p.color(0, 0, 255), 'e₂'); // Draw e2
        if (!isNaN(detM) && p.abs(detM) > 0.001) { // Only draw dual vectors if valid
            drawVector(epsilon1, p.color(255, 0, 0), 'ε¹'); // Draw epsilon1
            drawVector(epsilon2, p.color(255, 0, 0), 'ε²'); // Draw epsilon2
        }

        p.resetMatrix(); // Restore default coordinate system before updating DOM info

        // 4. Update Information Display in DOM using KaTeX
        updateInfoDOM(); // Update the text content of info elements
    };


    // --- Helper Functions (defined within the sketch scope) ---

    /** Resets the basis vectors and sliders to the standard basis state. Called by reset button. */
    const resetBasis = (): void => {
        setBasisToStandard(); // Reset internal vector states
        updateSlidersFromBasis(); // Update slider positions to match reset state
    }

    /** Sets the internal basis vectors (e1, e2, epsilon1, epsilon2) to the standard state. */
    const setBasisToStandard = (): void => {
        // Initialize vectors if they don't exist, otherwise set their values
        if (!e1) e1 = p.createVector(1, 0); else e1.set(1, 0);
        if (!e2) e2 = p.createVector(0, 1); else e2.set(0, 1);
        if (!epsilon1) epsilon1 = p.createVector(NaN, NaN); else epsilon1.set(NaN, NaN); // Dual starts as invalid
        if (!epsilon2) epsilon2 = p.createVector(NaN, NaN); else epsilon2.set(NaN, NaN);
        // Reset matrix related calculations
        detM = NaN;
        M_inv = [[NaN, NaN], [NaN, NaN]];
    }

    /** Updates the positions of the UI sliders based on the current e1 and e2 vectors. */
    const updateSlidersFromBasis = (): void => {
        // Check if sliders exist before setting value
        if (slider_e1x) slider_e1x.value(e1.x);
        if (slider_e1y) slider_e1y.value(e1.y);
        if (slider_e2x) slider_e2x.value(e2.x);
        if (slider_e2y) slider_e2y.value(e2.y);
    }


    /** Applies coordinate transformations (origin center, Y up). Uses 'p'. */
    const applyCoordinateTransform = (): void => {
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1); // Flip Y axis for standard mathematical coordinates
    }

    /** Creates UI sliders and the reset button, placing them in the #controls-container div. Uses 'p'. */
    const createUIElements = (): void => {
        const controlsContainerId = 'controls-container'; // Target div ID

        // Span + Slider for e1.x
        const span_e1x = p.createSpan('e₁.x');
        span_e1x.parent(controlsContainerId); // Place in controls container
        slider_e1x = p.createSlider(-2, 2, e1.x, 0.1); // Use initial value from e1
        slider_e1x.parent(controlsContainerId); // Place in controls container

        // Span + Slider for e1.y
        const span_e1y = p.createSpan('e₁.y');
        span_e1y.parent(controlsContainerId);
        slider_e1y = p.createSlider(-2, 2, e1.y, 0.1);
        slider_e1y.parent(controlsContainerId);

        // Span + Slider for e2.x
        const span_e2x = p.createSpan('e₂.x');
        span_e2x.parent(controlsContainerId);
        slider_e2x = p.createSlider(-2, 2, e2.x, 0.1);
        slider_e2x.parent(controlsContainerId);

        // Span + Slider for e2.y
        const span_e2y = p.createSpan('e₂.y');
        span_e2y.parent(controlsContainerId);
        slider_e2y = p.createSlider(-2, 2, e2.y, 0.1);
        slider_e2y.parent(controlsContainerId);

        // Reset Button
        resetButton = p.createButton('Reset Basis');
        resetButton.parent(controlsContainerId); // Place in controls container
        resetButton.mousePressed(resetBasis); // Attach reset function to click event
    }

    /** Updates e1 and e2 basis vectors based on current slider values. */
    const updateBasisVectorsFromSliders = (): void => {
        // Ensure sliders/vectors exist before accessing them
        // Update components individually to avoid creating new vectors each time
        const v1x = slider_e1x.value() as number;
        const v1y = slider_e1y.value() as number;
        const v2x = slider_e2x.value() as number;
        const v2y = slider_e2y.value() as number;
        if (e1) e1.set(v1x, v1y);
        if (e2) e2.set(v2x, v2y);
    }

    /** Calculates determinant, inverse matrix, and dual basis vectors based on e1 and e2. Uses 'p.abs'. */
    const calculateTransformations = (): void => {
        // Ensure e1 and e2 are initialized before calculation
        if (!e1 || !e2) return;

        const a = e1.x; const c = e2.x;
        const b = e1.y; const d = e2.y;

        detM = a * d - b * c; // Calculate determinant

        if (p.abs(detM) < 0.001) { // Check if matrix is singular (or close to it)
            // Mark inverse and dual basis as invalid
            M_inv = [[NaN, NaN], [NaN, NaN]];
            if (epsilon1) epsilon1.set(NaN, NaN);
            if (epsilon2) epsilon2.set(NaN, NaN);
        } else {
            // Calculate inverse matrix components
            const invDet = 1.0 / detM;
            M_inv = [
                [invDet * d, invDet * (-c)],
                [invDet * (-b), invDet * a]
            ];
            // Dual basis vectors are the ROWS of the inverse matrix
            if (epsilon1) epsilon1.set(M_inv[0][0], M_inv[0][1]);
            if (epsilon2) epsilon2.set(M_inv[1][0], M_inv[1][1]);
        }
    }

    /**
     * Draws a vector as an arrow from the origin. Uses instance methods and 'p'.
     * @param vec The vector to draw.
     * @param c The color of the vector.
     * @param label The label text for the vector (e.g., 'e₁', 'ε¹').
     */
    const drawVector = (vec: p5.Vector, c: p5.Color, label: string): void => {
        p.push(); // Isolate transformations and styles

        // Use instance methods with .copy() to ensure type safety
        const vecScaled = vec.copy(); // Create a copy
        vecScaled.mult(SCALE_FACTOR); // Scale the copy

        p.stroke(c);
        p.strokeWeight(2.5);
        p.fill(c);

        // Draw line segment using the scaled copy
        p.line(0, 0, vecScaled.x, vecScaled.y);

        // Draw arrowhead
        const angle = p.atan2(vecScaled.y, vecScaled.x);
        p.translate(vecScaled.x, vecScaled.y); // Move to arrowhead position
        p.rotate(angle);                   // Rotate to vector's angle
        const arrowSize = 7;
        p.translate(-arrowSize * 1.2, 0); // Offset for arrowhead tip placement
        p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);

        // Draw label (undo transformations for text)
        p.rotate(-angle); // Rotate back
        // Calculate offset relative to the unrotated axis, then rotate it
        const labelOffsetBase = p.createVector(arrowSize * 1.8, 0); // Offset along positive x
        const rotatedOffset = labelOffsetBase.rotate(angle);        // Rotate offset by vector angle
        p.translate(rotatedOffset.x, rotatedOffset.y);             // Apply the rotated offset

        p.scale(1, -1); // Flip text back upright in the transformed coordinate system
        p.noStroke();
        p.fill(c);
        p.textSize(16);
        p.textAlign(p.CENTER, p.CENTER); // Use p.CENTER constant
        p.text(label, 0, 0); // Draw label at the translated position

        p.pop(); // Restore previous drawing state
    }


    /** Updates the HTML elements with KaTeX formatted strings. */
    const updateInfoDOM = (): void => {
        // Helper to format vector as pmatrix (LaTeX)
        const formatVectorLatex = (v: p5.Vector | undefined): string => {
            if (!v || isNaN(v.x) || isNaN(v.y)) return '\\text{N/A}';
            // Use toFixed for consistent decimal places
            return `\\begin{pmatrix} ${v.x.toFixed(2)} \\\\ ${v.y.toFixed(2)} \\end{pmatrix}`;
        };

        // Helper to format matrix as pmatrix (LaTeX)
        const formatMatrixLatex = (m: number[][]): string => {
            if (!m || !m[0] || !m[1] || isNaN(m[0][0]) || isNaN(m[0][1]) || isNaN(m[1][0]) || isNaN(m[1][1])) return '\\text{N/A}';
            return `\\begin{pmatrix} ${m[0][0].toFixed(2)} & ${m[0][1].toFixed(2)} \\\\ ${m[1][0].toFixed(2)} & ${m[1][1].toFixed(2)} \\end{pmatrix}`;
        }

        // Update Primal Basis Elements using LaTeX strings
        // Ensure elements exist before setting textContent
        if (el_primal_e1) el_primal_e1.textContent = `$\\mathbf{e}_1 = ${formatVectorLatex(e1)}$`;
        if (el_primal_e2) el_primal_e2.textContent = `$\\mathbf{e}_2 = ${formatVectorLatex(e2)}$`;

        // Update Matrix M and Determinant
        if (el_matrix_m) el_matrix_m.textContent = `$M = \\begin{pmatrix} ${e1?.x.toFixed(2) ?? '?'} & ${e2?.x.toFixed(2) ?? '?'} \\\\ ${e1?.y.toFixed(2) ?? '?'} & ${e2?.y.toFixed(2) ?? '?'} \\end{pmatrix}$`;
        if (el_determinant) el_determinant.textContent = `$\\det(M) \\approx ${isNaN(detM) ? '\\text{N/A}' : detM.toFixed(3)}$`;

        // Update Dual Basis Elements
        if (el_dual_epsilon1) el_dual_epsilon1.textContent = `$\\boldsymbol{\\epsilon}^1 = ${formatVectorLatex(epsilon1)}$`;
        if (el_dual_epsilon2) el_dual_epsilon2.textContent = `$\\boldsymbol{\\epsilon}^2 = ${formatVectorLatex(epsilon2)}$`;

        // Update Inverse Matrix M⁻¹ Element
        if (el_matrix_m_inv) el_matrix_m_inv.textContent = `$M^{-1} = ${formatMatrixLatex(M_inv)}$`;

        // *** Trigger KaTeX Rendering Explicitly ***
// Check if the function exists (loaded via CDN) and the container element is found
        if (typeof renderMathInElement === 'function' && infoContainer) {
            try {
                renderMathInElement(infoContainer, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError : false
                });
                // console.log("KaTeX rendering triggered."); // 디버깅 로그 추가
            } catch (error) {
                console.error("KaTeX rendering failed inside updateInfoDOM:", error);
            }
        } else if (!infoContainer) {
            console.warn("KaTeX info container not found.");
        } else if (typeof renderMathInElement !== 'function') {
            console.warn("renderMathInElement function not found when expected."); // 함수가 없는 경우 경고
        }
    }

}; // End of sketch function definition

// --- Create the p5 Instance ---
// This line actually starts the sketch by calling the sketch function with a new p5 instance
new p5(sketch);