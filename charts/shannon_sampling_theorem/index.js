import p5 from 'p5'; // p5 라이브러리 가져오기

// p5 스케치를 정의하는 함수
const index = (p) => {

    // --- 스케치 내 지역 변수 ---
    let t = [];
    let sineWave = [];
    let x_r = [];
    let fs; // Sampling frequency
    let t_sampled = [];
    let xscl; // x-축 스케일
    let yscl; // y-축 스케일

    // --- 헬퍼 함수 정의 (p 인스턴스를 사용) ---

    // 축 그리기 함수
    const plottingAxis = (xscl, p) => {
        p.push(); // 스타일 설정 저장

        // 축 스타일
        p.stroke(200); // 축 색상 (밝은 회색)
        p.strokeWeight(1);
        p.fill(200); // 텍스트 및 화살표 색상
        p.textSize(15);

        // 가로축 (t 축)
        const axisY = 0.8 * p.height; // 축의 y 위치
        const lineStartX = 30; // 원본 코드의 translate 값과 맞춤
        const lineEndX = p.width - 20;
        p.line(lineStartX, axisY, lineEndX, axisY);

        // 가로축 화살표
        p.triangle(lineEndX - 8, axisY - 4, lineEndX + 2, axisY, lineEndX - 8, axisY + 4);
        p.noStroke(); // 화살표 이후 stroke 제거
        p.textAlign(p.LEFT, p.CENTER);
        p.text("t", lineEndX + 5, axisY);

        // 가로축 눈금 및 숫자
        p.stroke(200); // 눈금선 stroke 다시 설정
        p.textAlign(p.CENTER, p.TOP);
        for (let i = 0; i < 7; i++) {
            const tickX = lineStartX + i * xscl;
            p.line(tickX, axisY - 5, tickX, axisY + 5); // 눈금선
            p.noStroke(); // 숫자 stroke 제거
            p.text(i, tickX, axisY + 8); // 눈금 아래 숫자
            p.stroke(200); // 다음 눈금선 stroke 다시 설정
        }

        // 저작권 표시 (필요하다면)
        p.noStroke();
        p.fill(150); // 저작권 텍스트 색상 (어둡게)
        p.textSize(12);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text('(c) 공돌이의 수학정리노트', p.width - 10, p.height - 10);

        p.pop(); // 스타일 설정 복원
    };

    // Sinc 함수 (Whittaker–Shannon 보간 공식의 sinc 함수)
    const mySinc = (delay, p) => {
        let result = [];
        // 't'와 'fs'는 index 함수의 스코프에서 접근 가능
        for (let i = 0; i < t.length; i++) {
            // PI * fs * (t[i] - delay) 계산
            let x = p.PI * (t[i] - delay) * fs;
            if (x !== 0) {
                result[i] = p.sin(x) / x; // sin(pi*x)/(pi*x) 대신 sin(x)/x 사용 (정규화 sinc) - 이 예제에서는 fs를 곱했으므로 OK
            } else {
                result[i] = 1; // x=0일 때 sinc 함수의 극한값은 1
            }
        }
        return result;
    };

    // --- p5 필수 함수 정의 ---

    p.setup = () => {
        p.createCanvas(800, 300);

        // 원본 연속 시간 신호 (사인파) 생성
        t = []; // 초기화
        const dt = 1 / 100;
        const t_end = 6;
        for (let i = 0; i < t_end; i += dt) {
            t.push(i);
        }

        sineWave = []; // 초기화
        const freq = 0.5; // 사인파 주파수 (1/2 Hz)
        for (let i = 0; i < t.length; i++) {
            sineWave.push(p.sin(2 * p.PI * freq * t[i]));
        }
        console.log("Nyquist Frequency:", 2 * freq, "Hz"); // 나이퀴스트 주파수 출력
    };

    p.draw = () => {
        // 스케일 계산
        xscl = p.floor((p.width - 50) / 6); // 좌우 여백 고려하여 스케일 조정
        yscl = 0.2 * p.height; // y축 스케일

        p.background(0); // 배경 검은색

        // 축 그리기
        plottingAxis(xscl, p);

        // 안내 텍스트
        const my_str = "Place mouse cursor here and move left/right to change Sampling Frequency (fs)";
        p.fill(255);
        p.noStroke();
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(15);
        p.text(my_str, p.width / 2, p.height * 0.05); // 텍스트 위치 조정

        // --- 원본 신호 그리기 ---
        p.push();
        p.translate(30, 0.4 * p.height); // 그래프 원점 이동
        p.scale(1, -1); // Y축 뒤집기 (수학 좌표계처럼)
        p.noFill();
        p.stroke(255, 255, 0); // 노란색으로 원본 신호 표시
        p.strokeWeight(1.5);
        p.beginShape();
        for (let i = 0; i < t.length; i++) {
            p.vertex(t[i] * xscl, sineWave[i] * yscl);
        }
        p.endShape();
        p.pop();

        // --- 샘플링 ---
        t_sampled = [];
        // 마우스 위치에 따라 샘플링 주파수(fs) 결정 (0.1 ~ 5.1 Hz 범위)
        fs = p.map(p.mouseX, 0, p.width, 0.1, 5.1);
        fs = p.constrain(fs, 0.1, 5.1); // 마우스가 캔버스 밖으로 나가도 범위 유지

        // 샘플링 시간점 계산
        if (fs > 0) { // fs가 양수일 때만 계산
            const Ts = 1 / fs; // 샘플링 주기
            for (let i = 0; i <= 6; i += Ts) {
                t_sampled.push(i);
                // 안전장치: 너무 많은 샘플링 방지
                if (t_sampled.length > 1000) break;
            }
        }

        // --- 샘플링된 점 및 선 그리기 ---
        p.push();
        p.translate(30, 0.4 * p.height); // 그래프 원점 이동
        p.scale(1, -1); // Y축 뒤집기
        p.fill(200, 50, 50); // 빨간색으로 샘플링 점 표시
        p.noStroke();
        for (let i = 0; i < t_sampled.length; i++) {
            const sample_t = t_sampled[i];
            const sample_val = p.sin(2 * p.PI * 0.5 * sample_t); // 샘플링 시점의 사인파 값
            const sampleX = sample_t * xscl;
            const sampleY = sample_val * yscl;

            p.ellipse(sampleX, sampleY, 8); // 샘플링 점

            // 샘플링 값까지 수직선 그리기
            p.push();
            p.stroke(100); // 회색 선
            p.strokeWeight(1);
            // line(x1, y1, x2, y2) - y 좌표는 scale(-1) 때문에 반대로 생각
            p.line(sampleX, 0, sampleX, sampleY); // 0은 x축 (translate 이후 기준)
            p.pop();
        }
        p.pop();

        // --- 신호 재구성 (Whittaker–Shannon 보간) ---
        x_r = new Array(t.length).fill(0); // 재구성 신호 배열 초기화

        for (let n = 0; n < t_sampled.length; n++) {
            const sample_t = t_sampled[n];
            const sample_val = p.sin(2 * p.PI * 0.5 * sample_t); // n번째 샘플 값
            const sinc_vals = mySinc(sample_t, p); // 해당 샘플 시간에 대한 sinc 함수 값들

            for (let k = 0; k < t.length; k++) {
                if (k < x_r.length) { // 배열 범위 확인
                    // 각 샘플값 * 이동된 sinc 함수 결과를 누적
                    x_r[k] += sample_val * sinc_vals[k];
                }
            }
        }

        // --- 재구성된 신호 그리기 ---
        p.push();
        p.translate(30, 0.4 * p.height); // 그래프 원점 이동
        p.scale(1, -1); // Y축 뒤집기
        p.stroke(100, 100, 255); // 파란색으로 재구성 신호 표시
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        if (x_r && x_r.length === t.length) { // 데이터 유효성 확인
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
        // p.nf() : 숫자를 특정 형식의 문자열로 변환 (소수점 2자리까지)
        const nyquistFreq = 2 * 0.5; // 원본 신호 주파수(0.5Hz)의 2배 = 1Hz
        p.text(`Sampling Frequency (fs): ${p.nf(fs, 1, 2)} Hz`, 10, 10);
        p.text(`Nyquist Frequency: ${nyquistFreq} Hz`, 10, 30);
        if (fs < nyquistFreq) {
            p.fill(255, 100, 100); // 에일리어싱 발생 시 경고 색상
            p.text(`Aliasing occurs! (fs < Nyquist)`, 10, 50);
        }
    };
};

// p5 인스턴스 생성 (index 함수를 전달)
// HTML에 <div id="canvas-container"></div> 같은 요소가 있다면 두 번째 인자로 전달 가능
// new p5(index, 'canvas-container');
// 그렇지 않으면 body에 자동으로 추가됨
new p5(index);