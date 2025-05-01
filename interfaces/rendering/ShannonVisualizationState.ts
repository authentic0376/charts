// interfaces/rendering/ShannonVisualizationState.ts

/**
 * Shannon 샘플링 시각화 렌더러에 필요한 상태를 정의하는 인터페이스.
 */
export interface ShannonVisualizationState {
    // Time vector for the original and reconstructed signals
    timeVector: readonly number[]; // <--- 수정됨
    // Original continuous-time signal values
    originalSignal: readonly number[]; // <--- 수정됨
    // Time points where sampling occurs
    sampledTimePoints: readonly number[]; // <--- 수정됨
    // Sampled signal values
    sampledValues: readonly number[]; // <--- 수정됨
    // Reconstructed signal values
    reconstructedSignal: readonly number[]; // <--- 수정됨
    // Current sampling frequency (Fs)
    samplingFrequency: number;
    // Nyquist frequency (for reference)
    nyquistFrequency: number;
    // Flag indicating if aliasing is occurring (Fs < Nyquist)
    isAliasing: boolean;
    // Canvas dimensions (needed for scaling calculations within renderer)
    canvasWidth: number;
    canvasHeight: number;
    // Optional: Mouse position if needed directly by renderer (though Fs is preferred)
    // mouseX?: number;
}