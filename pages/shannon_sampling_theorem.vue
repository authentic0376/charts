<template>
  <!-- p5 캔버스가 마운트될 DOM 요소 -->
  <div ref="canvasContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import p5 from 'p5'; // p5 라이브러리 가져오기

// 템플릿의 ref="canvasContainer" 와 연결될 참조 변수
// 타입은 p5 캔버스를 담을 HTMLDivElement 이거나 초기값 null
const canvasContainer = ref<HTMLDivElement | null>(null);

// p5 인스턴스를 저장할 변수 (타입은 p5 또는 초기값 null)
// 컴포넌트 언마운트 시 스케치를 제거하기 위해 필요
let sketchInstance: p5 | null = null;

// --- 기존 p5.js 스케치 로직을 여기에 함수 형태로 정의 ---
// 원본 코드의 index 함수 내용을 가져옵니다.
const sketch = (p: p5) => { // p 매개변수에 p5 타입을 명시!

  // --- 스케치 내 지역 변수 ---
  let t: number[] = []; // 타입 명시
  let sineWave: number[] = []; // 타입 명시
  let x_r: number[] = []; // 타입 명시
  let fs: number; // Sampling frequency, 타입 명시
  let t_sampled: number[] = []; // 타입 명시
  let xscl: number; // x-축 스케일, 타입 명시
  let yscl: number; // y-축 스케일, 타입 명시

  // --- 헬퍼 함수 정의 (p 인스턴스를 사용) ---

  // 축 그리기 함수
  const plottingAxis = (xscl: number, p: p5) => { // 매개변수 타입 명시
    p.push();
    p.stroke(200);
    p.strokeWeight(1);
    p.fill(200);
    p.textSize(15);

    const axisY = 0.8 * p.height;
    const lineStartX = 30;
    const lineEndX = p.width - 20;
    p.line(lineStartX, axisY, lineEndX, axisY);
    p.triangle(lineEndX - 8, axisY - 4, lineEndX + 2, axisY, lineEndX - 8, axisY + 4);
    p.noStroke();
    p.textAlign(p.LEFT, p.CENTER);
    p.text("t", lineEndX + 5, axisY);
    p.stroke(200);
    p.textAlign(p.CENTER, p.TOP);
    for (let i = 0; i < 7; i++) {
      const tickX = lineStartX + i * xscl;
      p.line(tickX, axisY - 5, tickX, axisY + 5);
      p.noStroke();
      p.text(i, tickX, axisY + 8);
      p.stroke(200);
    }
    p.noStroke();
    p.fill(150);
    p.textSize(12);
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.text('(c) 공돌이의 수학정리노트', p.width - 10, p.height - 10);
    p.pop();
  };

  // Sinc 함수
  const mySinc = (delay: number, p: p5): number[] => { // 매개변수 및 반환 타입 명시
    let result: number[] = [];
    for (let i = 0; i < t.length; i++) {
      let x = p.PI * (t[i] - delay) * fs;
      if (x !== 0) {
        result[i] = p.sin(x) / x;
      } else {
        result[i] = 1;
      }
    }
    return result;
  };

  // --- p5 필수 함수 정의 ---

  p.setup = () => {
    p.createCanvas(800, 300); // 캔버스 크기는 필요에 따라 조절

    // 원본 연속 시간 신호 (사인파) 생성
    t = [];
    const dt = 1 / 100;
    const t_end = 6;
    for (let i = 0; i < t_end; i += dt) {
      t.push(i);
    }

    sineWave = [];
    const freq = 0.5;
    for (let i = 0; i < t.length; i++) {
      sineWave.push(p.sin(2 * p.PI * freq * t[i]));
    }
    console.log("Nyquist Frequency:", 2 * freq, "Hz");
  };

  p.draw = () => {
    // 스케일 계산
    xscl = p.floor((p.width - 50) / 6);
    yscl = 0.2 * p.height;

    p.background(0);
    plottingAxis(xscl, p);

    // 안내 텍스트
    const my_str = "Place mouse cursor here and move left/right to change Sampling Frequency (fs)";
    p.fill(255);
    p.noStroke();
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(15);
    p.text(my_str, p.width / 2, p.height * 0.05);

    // --- 원본 신호 그리기 ---
    p.push();
    p.translate(30, 0.4 * p.height);
    p.scale(1, -1);
    p.noFill();
    p.stroke(255, 255, 0);
    p.strokeWeight(1.5);
    p.beginShape();
    for (let i = 0; i < t.length; i++) {
      p.vertex(t[i] * xscl, sineWave[i] * yscl);
    }
    p.endShape();
    p.pop();

    // --- 샘플링 ---
    t_sampled = [];
    fs = p.map(p.mouseX, 0, p.width, 0.1, 5.1);
    fs = p.constrain(fs, 0.1, 5.1);

    if (fs > 0) {
      const Ts = 1 / fs;
      for (let i = 0; i <= 6; i += Ts) {
        t_sampled.push(i);
        if (t_sampled.length > 1000) break;
      }
    }

    // --- 샘플링된 점 및 선 그리기 ---
    p.push();
    p.translate(30, 0.4 * p.height);
    p.scale(1, -1);
    p.fill(200, 50, 50);
    p.noStroke();
    for (let i = 0; i < t_sampled.length; i++) {
      const sample_t = t_sampled[i];
      const sample_val = p.sin(2 * p.PI * 0.5 * sample_t);
      const sampleX = sample_t * xscl;
      const sampleY = sample_val * yscl;
      p.ellipse(sampleX, sampleY, 8);
      p.push();
      p.stroke(100);
      p.strokeWeight(1);
      p.line(sampleX, 0, sampleX, sampleY);
      p.pop();
    }
    p.pop();

    // --- 신호 재구성 (Whittaker–Shannon 보간) ---
    x_r = new Array(t.length).fill(0);

    for (let n = 0; n < t_sampled.length; n++) {
      const sample_t = t_sampled[n];
      const sample_val = p.sin(2 * p.PI * 0.5 * sample_t);
      const sinc_vals = mySinc(sample_t, p);

      for (let k = 0; k < t.length; k++) {
        if (k < x_r.length) {
          x_r[k] += sample_val * sinc_vals[k];
        }
      }
    }

    // --- 재구성된 신호 그리기 ---
    p.push();
    p.translate(30, 0.4 * p.height);
    p.scale(1, -1);
    p.stroke(100, 100, 255);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    if (x_r && x_r.length === t.length) {
      for (let j = 0; j < t.length; j++) {
        p.vertex(t[j] * xscl, x_r[j] * yscl);
      }
    }
    p.endShape();
    p.pop();

    // --- 샘플링 주파수 정보 표시 ---
    p.fill(255);
    p.noStroke();
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(14);
    const nyquistFreq = 2 * 0.5;
    p.text(`Sampling Frequency (fs): ${p.nf(fs, 1, 2)} Hz`, 10, 10);
    p.text(`Nyquist Frequency: ${nyquistFreq} Hz`, 10, 30);
    if (fs < nyquistFreq) {
      p.fill(255, 100, 100);
      p.text(`Aliasing occurs! (fs < Nyquist)`, 10, 50);
    }
  };
}; // --- sketch 함수 정의 끝 ---

// Vue 컴포넌트가 마운트(DOM에 추가)된 후에 실행될 코드
onMounted(() => {
  // canvasContainer.value 가 확실히 DOM 요소인지 확인
  if (canvasContainer.value) {
    // p5 인스턴스 생성!
    // 첫 번째 인자: 위에서 정의한 스케치 함수
    // 두 번째 인자: 스케치를 마운트할 HTML 요소 (ref로 가져온 값)
    sketchInstance = new p5(sketch, canvasContainer.value);
  } else {
    console.error('Canvas container not found!');
  }
});

// Vue 컴포넌트가 언마운트(DOM에서 제거)되기 전에 실행될 코드
onUnmounted(() => {
  // 생성된 p5 인스턴스가 있다면 제거하여 메모리 누수 방지
  if (sketchInstance) {
    sketchInstance.remove();
    sketchInstance = null; // 참조 제거
  }
});

</script>
