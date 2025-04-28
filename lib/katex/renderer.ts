// lib/katex/renderer.ts
import katex from 'katex';
import type { Ref } from 'vue';

// 필요한 계산 결과 타입 정의 (useBasisTransformation의 calculated와 유사)
interface CalculatedState {
    detM: number;
    M_inv: number[][];
    e1: { x: number, y: number };
    e2: { x: number, y: number };
    epsilon1: { x: number, y: number };
    epsilon2: { x: number, y: number };
}

// KaTeX 렌더링 대상 요소 Ref 타입 정의
interface KatexElementRefs {
    el_primal_e1: Ref<HTMLElement | null>;
    el_primal_e2: Ref<HTMLElement | null>;
    el_matrix_m: Ref<HTMLElement | null>;
    el_determinant: Ref<HTMLElement | null>;
    el_dual_epsilon1: Ref<HTMLElement | null>;
    el_dual_epsilon2: Ref<HTMLElement | null>;
    el_matrix_m_inv: Ref<HTMLElement | null>;
}

// --- Formatting Helpers ---
const formatNum = (n: number | undefined | null, digits = 2): string => (n === undefined || n === null || isNaN(n)) ? '\\text{N/A}' : n.toFixed(digits);
const formatVectorLatex = (v: { x: number, y: number } | undefined): string => { if (!v || isNaN(v.x) || isNaN(v.y)) return '\\text{N/A}'; return `\\begin{pmatrix} ${formatNum(v.x)} \\\\ ${formatNum(v.y)} \\end{pmatrix}`; };
const formatMatrixLatex = (m: number[][]): string => { if (!m || !m[0] || !m[1] || m.flat().some(isNaN)) return '\\text{N/A}'; return `\\begin{pmatrix} ${formatNum(m[0][0])} & ${formatNum(m[0][1])} \\\\ ${formatNum(m[1][0])} & ${formatNum(m[1][1])} \\end{pmatrix}`; }

// --- KaTeX Rendering Function ---
const renderKatex = (targetElement: HTMLElement | null, latex: string, displayMode = false) => {
    if (targetElement) {
        try {
            katex.render(latex, targetElement, { throwOnError: false, displayMode: displayMode });
        } catch (e) {
            console.error("KaTeX rendering failed:", e);
            targetElement.textContent = `Error: ${latex}`;
        }
    } else { console.warn("Target element for KaTeX not found."); }
};

// --- Main DOM Update Function ---
export function updateInfoDOM(state: CalculatedState, elements: KatexElementRefs): void {
    // 각 요소에 대해 renderKatex 호출
    renderKatex(elements.el_primal_e1.value, `\\mathbf{e}_1 = ${formatVectorLatex(state.e1)}`);
    renderKatex(elements.el_primal_e2.value, `\\mathbf{e}_2 = ${formatVectorLatex(state.e2)}`);
    renderKatex(elements.el_matrix_m.value, `M = ${formatMatrixLatex([[state.e1.x, state.e2.x], [state.e1.y, state.e2.y]])}`);
    renderKatex(elements.el_determinant.value, `\\det(M) \\approx ${formatNum(state.detM, 3)}`);
    renderKatex(elements.el_dual_epsilon1.value, `\\boldsymbol{\\epsilon}^1 = ${formatVectorLatex(state.epsilon1)}`);
    renderKatex(elements.el_dual_epsilon2.value, `\\boldsymbol{\\epsilon}^2 = ${formatVectorLatex(state.epsilon2)}`);
    renderKatex(elements.el_matrix_m_inv.value, `M^{-1} = ${formatMatrixLatex(state.M_inv)}`);
}