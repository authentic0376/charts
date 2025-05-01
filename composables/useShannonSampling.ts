// composables/useShannonSampling.ts
import { ref, reactive, watch, computed, readonly } from 'vue';
import * as constants from '@/config/shannonConstants';
import type { ShannonVisualizationState } from '@/interfaces/rendering/ShannonVisualizationState';

// Sinc 함수 (p5 의존성 제거)
const mySinc = (x: number): number => {
    if (x === 0) {
        return 1.0;
    }
    const piX = Math.PI * x;
    return Math.sin(piX) / piX;
};

export function useShannonSampling() {
    // --- Reactive State ---
    const mouseX = ref(constants.SHANNON_CANVAS_WIDTH / 2); // Initial mouse position (center)
    const canvasWidth = ref(constants.SHANNON_CANVAS_WIDTH); // Could be updated if resizable

    const state = reactive<Omit<ShannonVisualizationState, 'canvasWidth' | 'canvasHeight'>>({
        timeVector: [],
        originalSignal: [],
        sampledTimePoints: [],
        sampledValues: [],
        reconstructedSignal: [],
        samplingFrequency: constants.NYQUIST_FREQUENCY, // Initial Fs
        nyquistFrequency: constants.NYQUIST_FREQUENCY,
        isAliasing: false,
    });

    // --- Internal Computations ---

    // Calculate sampling frequency based on mouseX
    const calculateFs = () => {
        const normalizedMouseX = Math.max(0, Math.min(canvasWidth.value, mouseX.value)) / canvasWidth.value;
        const fs = constants.FS_MIN + normalizedMouseX * (constants.FS_MAX - constants.FS_MIN);
        // Clamp fs just in case
        return Math.max(constants.FS_MIN, Math.min(constants.FS_MAX, fs));
    };

    // Generate initial time vector and original signal
    const initializeSignal = () => {
        const t: number[] = [];
        const signal: number[] = [];
        for (let time = 0; time <= constants.TIME_END; time += constants.TIME_STEP) {
            t.push(time);
            signal.push(Math.sin(2 * Math.PI * constants.SIGNAL_FREQUENCY * time));
        }
        state.timeVector = t;
        state.originalSignal = signal;
        console.log("Nyquist Frequency:", constants.NYQUIST_FREQUENCY, "Hz");
    };

    // Calculate sampled points and reconstructed signal based on current Fs
    const updateSampledAndReconstructed = () => {
        const fs = state.samplingFrequency;
        if (fs <= 0) {
            state.sampledTimePoints = [];
            state.sampledValues = [];
            state.reconstructedSignal = new Array(state.timeVector.length).fill(0);
            state.isAliasing = fs < constants.NYQUIST_FREQUENCY; // Consider Fs=0 as aliasing
            return;
        }

        const Ts = 1 / fs;
        const sampledT: number[] = [];
        const sampledV: number[] = [];
        for (let t_samp = 0; t_samp <= constants.TIME_END + Ts/2; t_samp += Ts) { // Add Ts/2 to include endpoint potentially
            if (t_samp > constants.TIME_END && sampledT.length > 0 && sampledT[sampledT.length - 1] >= constants.TIME_END) break; // Avoid going too far beyond
            const actual_t_samp = Math.min(t_samp, constants.TIME_END); // Clamp to TIME_END
            if (sampledT.length > 0 && Math.abs(actual_t_samp - sampledT[sampledT.length - 1]) < 1e-9) continue; // Avoid duplicate points due to floating point issues

            sampledT.push(actual_t_samp);
            sampledV.push(Math.sin(2 * Math.PI * constants.SIGNAL_FREQUENCY * actual_t_samp));
            if (sampledT.length > 1000) break; // Safety break
        }

        state.sampledTimePoints = sampledT;
        state.sampledValues = sampledV;

        // Reconstruction (Whittaker–Shannon interpolation)
        const reconstructed: number[] = new Array(state.timeVector.length).fill(0);
        if (sampledT.length > 0) {
            for (let n = 0; n < sampledT.length; n++) {
                const tn = sampledT[n];
                const xn = sampledV[n];
                for (let k = 0; k < state.timeVector.length; k++) {
                    const tk = state.timeVector[k];
                    reconstructed[k] += xn * mySinc(fs * (tk - tn));
                }
            }
        }
        state.reconstructedSignal = reconstructed;
        state.isAliasing = fs < constants.NYQUIST_FREQUENCY;
    };

    // --- Watchers ---
    watch(mouseX, () => {
        state.samplingFrequency = calculateFs();
    }, { immediate: true }); // Calculate initial Fs based on initial mouseX

    watch(() => state.samplingFrequency, () => {
        updateSampledAndReconstructed();
    }, { immediate: true }); // Calculate initial signals

    // --- Initialization ---
    initializeSignal(); // Generate t and original signal once

    // --- Exposed Methods ---
    const setMouseX = (x: number) => {
        mouseX.value = x;
    };

    const setCanvasWidth = (width: number) => {
        canvasWidth.value = width;
        // Recalculate Fs if canvas width changes, maintaining relative mouse position
        state.samplingFrequency = calculateFs();
    };

    // Expose readonly state and methods to update inputs
    return {
        state: readonly(state), // Provide read-only access to the internal state
        setMouseX,
        setCanvasWidth,
    };
}