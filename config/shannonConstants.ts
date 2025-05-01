// config/shannonConstants.ts

// Canvas dimensions
export const SHANNON_CANVAS_WIDTH: number = 800;
export const SHANNON_CANVAS_HEIGHT: number = 300;

// Signal properties
export const SIGNAL_FREQUENCY: number = 0.5; // Hz (Original sine wave frequency)
export const NYQUIST_FREQUENCY: number = 2 * SIGNAL_FREQUENCY; // Hz

// Time properties
export const TIME_END: number = 6; // Seconds
export const TIME_STEP: number = 1 / 100; // Seconds (for generating original signal)

// Sampling frequency range controlled by mouse
export const FS_MIN: number = 0.1; // Hz
export const FS_MAX: number = 5.1; // Hz

// Axis and Scaling (May be calculated dynamically in renderer, but defining defaults can be useful)
export const AXIS_Y_POSITION_RATIO = 0.8; // Relative to canvas height
export const SIGNAL_Y_POSITION_RATIO = 0.4; // Relative to canvas height
export const SIGNAL_AMPLITUDE_SCALE_RATIO = 0.2; // Relative to canvas height
export const AXIS_X_MARGIN_LEFT = 30; // Pixels
export const AXIS_X_MARGIN_RIGHT = 20; // Pixels
export const AXIS_TICKS = 7; // Number of major ticks on x-axis (0 to TIME_END)