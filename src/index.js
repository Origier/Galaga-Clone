const { vec2, vec3, mat3, mat4 } = glMatrix;

// Holds the squares information on where it is currently located
const squareTranslation = {
    x: 0,
    y: 0
};

//
// Vertex Array Object State Machine
//

const vaos = []
let currentVAO = null;

const ARGUMENT_TYPE = Object.freeze({
    BUFFER_TYPE: 1,
    BUFFER_ID: 2,
    BUFFER_DATA: 3,
    BUFFER_USAGE: 4,
    ATTRIBUTE_ID: 5,
    DATA_POINT_SIZE: 6,
    DATA_TYPE: 7,
    NORMALIZED: 8,
    STRIDE: 9,
    OFFSET: 10,
    ELEMENT_BUFFER_ID: 11,
    ELEMENT_BUFFER_DATA: 12
});

function createVertexArrayObject() {
    index = vaos.length;
    vaos.push({
        bufferType: null,
        bufferId: null,
        bufferData: null,
        bufferUsage: null,
        attributeId: null,
        dataPointSize: null,
        dataType: null,
        normalized: null,
        stride: null,
        offset: null,
        elementBufferId: null,
        elementBufferData: null
    })
    return index;
}

function bindVertexArrayObject(id) {
    currentVAO = id;
}

function unbindVertexArrayObject() {
    currentVAO = null;
}

function configureVertexArrayObject(argumentType, arguement) {
    switch (argumentType) {
        case ARGUMENT_TYPE.BUFFER_TYPE:
            vaos[currentVAO].bufferType = arguement;
            break;
        case ARGUMENT_TYPE.BUFFER_ID:
            vaos[currentVAO].bufferId = arguement;
            break;
        case ARGUMENT_TYPE.BUFFER_DATA:
            vaos[currentVAO].bufferData = arguement;
            break;
        case ARGUMENT_TYPE.BUFFER_USAGE:
            vaos[currentVAO].bufferUsage = arguement;
            break;
        case ARGUMENT_TYPE.ATTRIBUTE_ID:
            vaos[currentVAO].attributeId = arguement;
            break;
        case ARGUMENT_TYPE.DATA_POINT_SIZE:
            vaos[currentVAO].dataPointSize = arguement;
            break;
        case ARGUMENT_TYPE.DATA_TYPE:
            vaos[currentVAO].dataType = arguement;
            break;
        case ARGUMENT_TYPE.NORMALIZED:
            vaos[currentVAO].normalized = arguement;
            break;
        case ARGUMENT_TYPE.STRIDE:
            vaos[currentVAO].stride = arguement;
            break;
        case ARGUMENT_TYPE.OFFSET:
            vaos[currentVAO].offset = arguement;
            break;
        case ARGUMENT_TYPE.ELEMENT_BUFFER_ID:
            vaos[currentVAO].elementBufferId = arguement;
            break;
        case ARGUMENT_TYPE.ELEMENT_BUFFER_DATA:
            vaos[currentVAO].elementBufferData = arguement;
            break;
        default:
            throw new Error("There is no vertax array object setting that matches that arguement type.");
    }
}

// Executes the settings for the VAO on the glcontext to prepare for drawing
function useVertexArrayObject(glContext) {
    const vao = vaos[currentVAO];
    // Ensure all of the data is set
    for (let key in vao) {
        if (vao[key] === null && key !== "elementBufferId" && key !== "elementBufferData") {
            throw new Error(`You haven't set the setting for ${key} yet.`);
        }
    }

    glContext.bindBuffer(vao.bufferType, vao.bufferId);
    glContext.bufferData(vao.bufferType, new Float32Array(vao.bufferData), vao.bufferUsage);
    if (vao.elementBufferId !== null) {
        if (vao.elementBufferData === null) {
            throw new Error(`You haven't set the setting for the element buffer data yet.`);
        }
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, vao.elementBufferId);
        glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, new Int16Array(vao.elementBufferData), vao.bufferUsage);
    }

    glContext.vertexAttribPointer(
        vao.attributeId,
        vao.dataPointSize,
        vao.dataType,
        vao.normalized,
        vao.stride,
        vao.offset
    );
    glContext.enableVertexAttribArray(vao.attributeId);
}

//
// State Machine End
//

main();

//
// Initialize a shader program, so WebGl knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(`Unable to initialize the shader program: ${gl.getProgramParameter(shaderProgram)}`);
        return null;
    }

    return shaderProgram;
}

//
// Creates a shader of the given type, uploads the source and compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function moveSquare(event) {
    if (event.code === 'KeyW') {
        squareTranslation.y += 0.1;
    } else if (event.code === 'KeyS') {
        squareTranslation.y -= 0.1;
    } else if (event.code === 'KeyA') {
        squareTranslation.x -= 0.1;
    } else if (event.code === 'KeyD') {
        squareTranslation.x += 0.1;
    }
}

function main() {
    let deltaTime = 0.0;

    const canvas = document.querySelector('#gl-canvas');

    // Initalize the gl context
    const gl = canvas.getContext('webgl');

    if (gl === null) {
        alert('Webgl was unable to load, your machine or browser may not be able to support this webpage :(');
        return;
    }

    // Creating a new manager
    // const manager = new GLManager(gl);

    // Event listener to move the square
    document.addEventListener('keydown', moveSquare);

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    

    const vsSource = `
        attribute vec4 aVertexPosition;

        void main() {
            gl_Position = aVertexPosition;
        }
    `

    const fsSource = `
        void main() {
            gl_FragColor = vec4(1.0, 0.5, 0.2, 1.0);
        }
    `

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    

    const verticies = [
        0.5,  0.5,  0.0,
        0.5, -0.5,  0.0,
       -0.5, -0.5,  0.0,
       -0.5,  0.5,  0.0
    ];

    const indices = [
        0, 1, 3,
        1, 2, 3
    ];

    const vbo = gl.createBuffer();
    const ebo = gl.createBuffer();
    const vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    const vao = createVertexArrayObject();
    bindVertexArrayObject(vao);
    configureVertexArrayObject(ARGUMENT_TYPE.BUFFER_TYPE, gl.ARRAY_BUFFER);
    configureVertexArrayObject(ARGUMENT_TYPE.BUFFER_ID, vbo);
    configureVertexArrayObject(ARGUMENT_TYPE.BUFFER_DATA, verticies);
    configureVertexArrayObject(ARGUMENT_TYPE.BUFFER_USAGE, gl.STATIC_DRAW);
    configureVertexArrayObject(ARGUMENT_TYPE.ATTRIBUTE_ID, vertexPositionAttrib);
    configureVertexArrayObject(ARGUMENT_TYPE.DATA_POINT_SIZE, 3);
    configureVertexArrayObject(ARGUMENT_TYPE.DATA_TYPE, gl.FLOAT);
    configureVertexArrayObject(ARGUMENT_TYPE.NORMALIZED, gl.FALSE);
    configureVertexArrayObject(ARGUMENT_TYPE.STRIDE, 0);
    configureVertexArrayObject(ARGUMENT_TYPE.OFFSET, 0);
    configureVertexArrayObject(ARGUMENT_TYPE.ELEMENT_BUFFER_ID, ebo);
    configureVertexArrayObject(ARGUMENT_TYPE.ELEMENT_BUFFER_DATA, indices);

    unbindVertexArrayObject();

    gl.useProgram(shaderProgram);
    bindVertexArrayObject(vao);
    useVertexArrayObject(gl);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // // Vertex shader program
    // const vsSource = `
    //     attribute vec4 aVertexPosition;
    //     attribute vec4 aVertexColor;

    //     uniform mat4 uModelViewMatrix;
    //     uniform mat4 uProjectionMatrix;

    //     varying lowp vec4 vColor;

    //     void main() {
    //         gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    //         vColor = aVertexColor;
    //     }
    // `;

    // const fsSource = `
    //     varying lowp vec4 vColor;


    //     void main() {
    //         gl_FragColor = vColor;
    //     }
    // `;

    // const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // // Collect all the info needed to use the shader program
    // // Look up which attribute our shader program is using
    // // for aVertexPosition and look up uniform locations
    // const programInfo = {
    //     program: shaderProgram,
    //     attribLocations: {
    //         vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    //         vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
    //     },
    //     uniformLocations: {
    //         projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
    //         modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    //     },
    // };

    // let then = 0;

    // // Draw the scene repeatedly
    // function render(now) {
    //     now *= 0.001; // convert to seconds
    //     deltaTime = now - then;
    //     then = now;

    //     // Here's where we call the routine that builds all the objects we'll be drawing
    //     let buffers = initBuffers(gl, squareTranslation);

    //     drawScene(gl, programInfo, buffers);

    //     requestAnimationFrame(render);
    // }
    // requestAnimationFrame(render);
}