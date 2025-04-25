// index.js

import p5 from 'p5';

// Encapsulate the entire sketch in a function
const sketch = (p) => {

    // Sketch variables (scoped within the sketch function)
    let scl;
    let f_neg = [];
    let f_pos = [];
    let G_neg = [];
    let G_pos = [];

    let a; // alpha value
    let mySlider;

    // Define helper functions within the sketch scope
    // These functions now use 'p.' to access p5 functions
    const drawGrid = () => {
        p.push(); // Use p.push()
        p.stroke(100);
        p.translate(p.width / 2, p.height / 2);

        // Vertical lines (using p.line, p.height)
        for (let i = -3; i <= 3; i++) {
            p.line(i * scl, -p.height / 2, i * scl, p.height / 2);
        }

        // Horizontal lines (using p.line, p.width)
        // Note: ylim is handled by the plot function's data,
        // grid lines are drawn based on scl.
        // Draw lines corresponding to y=-2 and y=2 based on scl
        for (let j = -2; j <= 2; j++) {
            if (j !== 0) { // Don't overwrite axis
                p.line(-p.width / 2, j * scl, p.width / 2, j * scl);
            }
        }

        // Axes (using p.stroke, p.strokeWeight, p.line)
        p.stroke(255);
        p.strokeWeight(2);
        // Y-axis
        p.line(0, -p.height / 2, 0, p.height / 2);
        // X-axis
        p.line(-p.width / 2, 0, p.width / 2, 0);
        p.pop(); // Use p.pop()
    };

    const plotFunction = () => {
        p.push(); // Use p.push()
        p.translate(p.width / 2, p.height / 2);
        // Flip y-axis for standard math coordinates
        p.scale(1, -1);

        // --- G Calculation ---
        // Ensure G arrays are cleared and recalculated each frame
        G_neg = [];
        // Corrected loop: iterate using index from 0 to length-1
        for (let i = 0; i < f_neg.length; i++) {
            // Use p.exp() for the exponential function
            G_neg[i] = -1 * p.exp(a * f_neg[i]);
        }

        G_pos = [];
        // Corrected loop: iterate using index from 0 to length-1
        for (let i = 0; i < f_pos.length; i++) {
            // Use p.exp()
            G_pos[i] = p.exp(-1 * a * f_pos[i]);
        }

        // --- G Drawing ---
        p.noFill(); // Use p.noFill()
        p.stroke(242, 125, 50); // Orange color
        p.strokeWeight(4); // Use p.strokeWeight()
        p.beginShape(); // Use p.beginShape()

        // Plot negative part
        for (let i = 0; i < f_neg.length; i++) {
            // Use p.vertex()
            p.vertex(f_neg[i] * scl, G_neg[i] * scl);
        }
        // Plot positive part
        for (let i = 0; i < f_pos.length; i++) {
            // Use p.vertex()
            // Note: There's a discontinuity at x=0 as G_neg(0)=-1 and G_pos(0)=1
            p.vertex(f_pos[i] * scl, G_pos[i] * scl);
        }

        // The empty vertex() call was removed.
        p.endShape(); // Use p.endShape()
        p.pop(); // Use p.pop()
    };

    // Setup function assigned to p.setup
    p.setup = () => {
        // Use p.createCanvas and p.windowWidth
        p.createCanvas(p.windowWidth - 20, 2 / 3 * (p.windowWidth - 20));
        // Use p.width for scaling. xlim is -3 to 3 (total 6 units)
        scl = p.width / 6;

        // --- Populate x-values (f_neg, f_pos) ---
        f_neg = []; // Clear array first
        for (let i = -3; i <= 0; i += 3 / 50) {
            f_neg.push(i);
        }
        // Ensure 0 is included if floating point issues missed it
        if (f_neg[f_neg.length - 1] < 0) {
            f_neg.push(0);
        }


        f_pos = []; // Clear array first
        // Start from a very small positive number if exact 0 is problematic,
        // or ensure 0 is pushed if the loop starts > 0.
        // The original loop `i=0` should include 0.
        for (let i = 0; i <= 3; i += 3 / 50) {
            f_pos.push(i);
        }

        // Create slider using p.createSlider
        // alpha는 0.01에서 0.3까지 변하는 걸로 하자. (Applying the comment)
        mySlider = p.createSlider(0.01, 0.3, 0.2, 0.001);
        // Position the slider (optional, adjust as needed)
        mySlider.position(20, p.height + 10); // Position below canvas
        mySlider.style('width', '200px'); // Give it some width

    };

    // Draw function assigned to p.draw
    p.draw = () => {
        p.background(0); // Use p.background()
        a = mySlider.value(); // Get value from slider

        drawGrid(); // Call the helper function
        plotFunction(); // Call the helper function

        // --- Draw Text Labels ---
        p.fill(255); // Use p.fill()
        // Use p.width for responsive text size
        p.textSize( Math.max(12, 16 / 800 * p.width) ); // Use p.textSize(), add min size

        // Reset transformation matrix for text drawing relative to window/canvas
        p.push();
        p.resetMatrix(); // Reset transforms for overlay text

        p.textAlign(p.LEFT, p.BOTTOM); // Use p.textAlign() and p.LEFT/p.BOTTOM constants
        let my_array = ['alpha: ', a.toFixed(3)]; // Format alpha value
        // Use standard JS join, not p.join
        // Adjust text position slightly away from edges
        p.text(my_array.join(''), 25, p.height - 5); // Position near slider

        p.textAlign(p.RIGHT, p.BOTTOM); // Use p.RIGHT/p.BOTTOM
        p.text('(c) 공돌이의 수학정리노트', p.width - 10, p.height - 5);

        p.pop(); // Restore previous drawing settings if needed

        // Reset text align for next frame if other text is drawn elsewhere
        p.textAlign(p.LEFT, p.BASELINE); // Reset to default
    };

    // Add windowResized handler for responsiveness
    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth - 20, 2 / 3 * (p.windowWidth - 20));
        scl = p.width / 6; // Recalculate scale
        // Reposition the slider
        mySlider.position(20, p.height + 10);
    }

};

// Create a new p5 instance and attach the sketch function
new p5(sketch);