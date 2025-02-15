function initBuffers(gl, squareTranslation) {
    const positionBuffer = initPositionBuffer(gl, squareTranslation);
    const colorBuffer = initColorBuffer(gl);

    return {
        position: positionBuffer,
        color: colorBuffer
    };
}

function initColorBuffer(gl) {
    const colors = [
        1.0,
        1.0,
        1.0,
        1.0, // White
        1.0,
        0.0,
        0.0,
        1.0, // Red
        0.0, 
        1.0, 
        0.0,
        1.0, // Green
        0.0,
        0.0,
        1.0,
        1.0  // Blue
    ];

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return colorBuffer;
}

function initPositionBuffer(gl, squareTranslation) {
    // Create a buffer for the square's position
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.
    const positions = [1.0 + squareTranslation.x, 1.0 + squareTranslation.y,
                      -1.0 + squareTranslation.x, 1.0 + squareTranslation.y,
                       1.0 + squareTranslation.x, -1.0 + squareTranslation.y,
                      -1.0 + squareTranslation.x, -1.0 + squareTranslation.y];

    // Now pass the list of positions into WebGL to build the shape, we do this by creating a float32Array from the Javascript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);

    return positionBuffer;
}