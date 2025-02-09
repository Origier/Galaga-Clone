function initBuffers(gl) {
    const positionBuffer = initPositionBuffer(gl);

    return {
        position: positionBuffer
    };
}

function initPositionBuffer(gl) {
    // Create a buffer for the square's position
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.
    const positions = [1.0, 1.0,
        0.25, 1.5,
        1.0, -1.0,
        -1.0, 1.0,
        0.25, 1.5,
        -0.25, 1.5,
        -1.0, 1.0,
        -1.0, -1.0,
        1.0, -1.0
    ];

    // Now pass the list of positions into WebGL to build the shape, we do this by creating a float32Array from the Javascript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return positionBuffer;
}