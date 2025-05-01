// lib/p5/p5ShannonRenderer.ts
import P5 from 'p5';
import type { ShannonVisualizationState } from '@/interfaces/rendering/ShannonVisualizationState';
import * as constants from '@/config/shannonConstants';
import type {IVisualizationRenderer} from "~/interfaces/rendering/IVisualizationRenderer";

export class P5ShannonRenderer implements IVisualizationRenderer<ShannonVisualizationState> {
    private p5Instance: P5 | null = null;
    private container: HTMLElement | null = null;
    private width: number = constants.SHANNON_CANVAS_WIDTH;
    private height: number = constants.SHANNON_CANVAS_HEIGHT;

    // Scaling factors calculated within the renderer
    private xscl: number = 0;
    private yscl: number = 0;
    private axisY: number = 0;
    private signalYOffset: number = 0;
    private axisStartX: number = 0;
    private axisEndX: number = 0;


    async setup(container: HTMLElement, initialWidth: number, initialHeight: number): Promise<void> {
        this.container = container;
        this.width = initialWidth;
        this.height = initialHeight;
        this.updateScaling(); // Initial scaling calculation

        const sketch = (p: P5) => {
            // --- p5 Internal Helper: Plotting Axis ---
            const plottingAxis = () => {
                p.push();
                p.stroke(200);
                p.strokeWeight(1);
                p.fill(200);
                p.textSize(15);

                // Draw X axis line and arrowhead
                p.line(this.axisStartX, this.axisY, this.axisEndX, this.axisY);
                p.triangle(this.axisEndX - 8, this.axisY - 4, this.axisEndX + 2, this.axisY, this.axisEndX - 8, this.axisY + 4);
                p.noStroke();
                p.textAlign(p.LEFT, p.CENTER);
                p.text("t", this.axisEndX + 5, this.axisY);

                // Draw X axis ticks and labels
                p.stroke(200);
                p.textAlign(p.CENTER, p.TOP);
                const tickIncrement = constants.TIME_END / (constants.AXIS_TICKS - 1); // Time increment per tick
                for (let i = 0; i < constants.AXIS_TICKS; i++) {
                    const tickTime = i * tickIncrement;
                    const tickX = this.axisStartX + tickTime * this.xscl;
                    p.line(tickX, this.axisY - 5, tickX, this.axisY + 5);
                    p.noStroke();
                    // Display integer labels if possible
                    p.text(Number.isInteger(tickTime) ? tickTime.toString() : tickTime.toFixed(1), tickX, this.axisY + 8);
                    p.stroke(200);
                }

                // Copyright text
                p.noStroke();
                p.fill(150);
                p.textSize(12);
                p.textAlign(p.RIGHT, p.BOTTOM);
                p.text('(c) 공돌이의 수학정리노트', p.width - 10, p.height - 10);
                p.pop();
            };

            // --- p5 Setup ---
            p.setup = () => {
                if (!this.container) return;
                const canvas = p.createCanvas(this.width, this.height);
                canvas.parent(this.container);
                p.describe('Interactive Shannon Sampling Theorem visualization showing original signal, sampled points, and reconstructed signal based on sampling frequency controlled by mouse position.');
                p.noLoop(); // Draw is triggered by external state changes
            };

            // --- p5 Draw (called by redraw) ---
            p.draw = () => {
                // Get the current state from the renderer instance property (set via external draw call)
                const state = this.currentState;
                if (!state) return; // Don't draw if state isn't set

                p.background(0);
                plottingAxis(); // Draw axes first

                // --- Info Text ---
                const infoY = this.height * 0.05;
                p.fill(255);
                p.noStroke();
                p.textAlign(p.CENTER, p.TOP);
                p.textSize(15);
                p.text("Place mouse cursor here and move left/right to change Sampling Frequency (fs)", this.width / 2, infoY);

                p.textAlign(p.LEFT, p.TOP);
                p.textSize(14);
                p.text(`Sampling Frequency (fs): ${p.nf(state.samplingFrequency, 1, 2)} Hz`, 10, 10);
                p.text(`Nyquist Frequency: ${p.nf(state.nyquistFrequency, 1, 2)} Hz`, 10, 30);
                if (state.isAliasing) {
                    p.fill(255, 100, 100);
                    p.text(`Aliasing occurs! (fs < Nyquist)`, 10, 50);
                }

                // --- Transformations for Signal Plotting ---
                p.push();
                p.translate(this.axisStartX, this.signalYOffset); // Move origin to start of axis, vertically centered
                p.scale(1, -1); // Flip Y axis

                // --- Draw Original Signal ---
                p.noFill();
                p.stroke(255, 255, 0); // Yellow
                p.strokeWeight(1.5);
                p.beginShape();
                for (let i = 0; i < state.timeVector.length; i++) {
                    p.vertex(state.timeVector[i] * this.xscl, state.originalSignal[i] * this.yscl);
                }
                p.endShape();

                // --- Draw Sampled Points & Stem Lines ---
                p.stroke(100); // Gray for stems
                p.strokeWeight(1);
                p.fill(200, 50, 50); // Reddish for points
                for (let i = 0; i < state.sampledTimePoints.length; i++) {
                    const sampleX = state.sampledTimePoints[i] * this.xscl;
                    const sampleY = state.sampledValues[i] * this.yscl;
                    // Draw stem line
                    p.line(sampleX, 0, sampleX, sampleY);
                    // Draw point (after line so it's on top)
                    p.noStroke(); // No stroke for the ellipse itself
                    p.ellipse(sampleX, sampleY, 8);
                    p.stroke(100); // Restore stroke for next stem
                }


                // --- Draw Reconstructed Signal ---
                p.stroke(100, 100, 255); // Bluish
                p.strokeWeight(2);
                p.noFill();
                p.beginShape();
                for (let j = 0; j < state.timeVector.length; j++) {
                    // Avoid drawing NaN/Infinity values from reconstruction
                    if (isFinite(state.reconstructedSignal[j])) {
                        p.vertex(state.timeVector[j] * this.xscl, state.reconstructedSignal[j] * this.yscl);
                    } else if (p.drawingContext instanceof CanvasRenderingContext2D) {
                        // If value is invalid, end current line segment and start a new one later
                        p.endShape();
                        p.beginShape();
                    }
                }
                p.endShape();

                p.pop(); // Restore coordinate system
            };
        }; // End of sketch definition

        this.p5Instance = new P5(sketch);
    }

    // Store the latest state to be used by p5's draw function
    private currentState: ShannonVisualizationState | null = null;

    /**
     * Updates the internal state and triggers a redraw.
     */
    draw(state: ShannonVisualizationState): void {
        if (!this.p5Instance) return;

        // Update canvas size from state if necessary (e.g., if resizable)
        if (state.canvasWidth !== this.width || state.canvasHeight !== this.height) {
            this.resize(state.canvasWidth, state.canvasHeight);
        }

        // Store the state for the p5 draw() function to access
        this.currentState = state;

        this.p5Instance.redraw();
    }

    destroy(): void {
        if (this.p5Instance) {
            this.p5Instance.remove();
            this.p5Instance = null;
            console.log("P5ShannonRenderer destroyed.");
        }
        this.container = null;
        this.currentState = null;
    }

    /**
     * Recalculates scaling factors based on current dimensions.
     */
    private updateScaling(): void {
        this.axisStartX = constants.AXIS_X_MARGIN_LEFT;
        this.axisEndX = this.width - constants.AXIS_X_MARGIN_RIGHT;
        const axisWidth = this.axisEndX - this.axisStartX;

        this.xscl = axisWidth / constants.TIME_END; // Pixels per second
        this.yscl = this.height * constants.SIGNAL_AMPLITUDE_SCALE_RATIO; // Scale factor for signal amplitude (-1 to 1)
        this.axisY = this.height * constants.AXIS_Y_POSITION_RATIO;
        this.signalYOffset = this.height * constants.SIGNAL_Y_POSITION_RATIO; // Vertical offset for the signal baseline
    }

    /**
     * Handles canvas resize.
     */
    resize(width: number, height: number): void {
        if (!this.p5Instance) return;
        this.width = width;
        this.height = height;
        this.p5Instance.resizeCanvas(this.width, this.height);
        this.updateScaling(); // Recalculate scaling factors
        // A redraw will typically be triggered by the state update following resize
    }
}