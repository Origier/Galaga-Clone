const { vec2, vec3, mat3, mat4 } = glMatrix;

const FLOAT_SIZE = 4;

// Holds the squares information on where it is currently located
const squareTranslation = {
    x: 0,
    y: 0
};

//
// Vertex Array Object Class - Stores configuration information for VertexPointerAttribs
//

class VertexArrayObject {
    #executionFunc = null;
    
    constructor(func) {
        if(typeof(func) !== 'function') {
            throw new Error("You must provide a function that uses webgl to configure your object for drawing.");
        }

        this.#executionFunc = func;    
    }

    use(glContext) {
        this.#executionFunc(glContext);
    }
}

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
    gl.clearColor(0.6, 0.6, 0.6, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    

    const vsSource = `
        attribute vec3 aVertexPosition;
        attribute vec3 aColor;

        varying mediump vec4 ourColor;

        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;

        void main() {
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
            ourColor = vec4(aColor, 1.0);
        }
    `

    const fsSource = `
        varying mediump vec4 ourColor;

        void main() {
            gl_FragColor = ourColor;
        }
    `

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    

    const verticies = [
        // Front Face
        // Positions     // Red
        0.5,  0.5, -0.5, 1.0, 0.0, 0.0,
        0.5, -0.5, -0.5, 1.0, 0.0, 0.0,
       -0.5, -0.5, -0.5, 1.0, 0.0, 0.0,
       -0.5,  0.5, -0.5, 1.0, 0.0, 0.0,

       // Back Face
       // Positions     // Orange
        0.5,  0.5,  0.5, 1.0, 0.7, 0.0,
        0.5, -0.5,  0.5, 1.0, 0.7, 0.0,
       -0.5, -0.5,  0.5, 1.0, 0.7, 0.0,
       -0.5,  0.5,  0.5, 1.0, 0.7, 0.0,

       // Top Face
       // Positions     // White
       0.5,  0.5,  0.5, 1.0, 1.0, 1.0,
       0.5,  0.5, -0.5, 1.0, 1.0, 1.0,
      -0.5,  0.5,  0.5, 1.0, 1.0, 1.0,
      -0.5,  0.5, -0.5, 1.0, 1.0, 1.0,

       // Bottom Face
       // Positions     // Black
       0.5, -0.5,  0.5, 0.0, 0.0, 0.0,
       0.5, -0.5, -0.5, 0.0, 0.0, 0.0,
      -0.5, -0.5,  0.5, 0.0, 0.0, 0.0,
      -0.5, -0.5, -0.5, 0.0, 0.0, 0.0,

       // Right Face
       // Positions     // Blue
       0.5,  0.5,  0.5, 0.0, 0.0, 1.0,
       0.5,  0.5, -0.5, 0.0, 0.0, 1.0,
       0.5, -0.5,  0.5, 0.0, 0.0, 1.0,
       0.5, -0.5, -0.5, 0.0, 0.0, 1.0,

       // Left Face
       // Positions     // Green
      -0.5,  0.5,  0.5, 0.0, 1.0, 0.0,
      -0.5,  0.5, -0.5, 0.0, 1.0, 0.0,
      -0.5, -0.5,  0.5, 0.0, 1.0, 0.0,
      -0.5, -0.5, -0.5, 0.0, 1.0, 0.0
    ];

    const indices = [
        // Front face
        0, 1, 3,
        1, 2, 3,

        // Back Face
        4, 5, 7,
        5, 6, 7,

        // Top Face
        8, 9,  10,
        9, 10, 11,

        // Bottom Face
        12, 13, 14,
        13, 14, 15,

        // Right Face
        16, 17, 18,
        17, 18, 19,

        // Left Face
        20, 21, 22,
        21, 22, 23
    ];

  

    const vbo = gl.createBuffer();
    const ebo = gl.createBuffer();
    const vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    const colorAttrib = gl.getAttribLocation(shaderProgram, "aColor");
    
    const vao = new VertexArrayObject((glContext) => {
        glContext.bindBuffer(glContext.ARRAY_BUFFER, vbo);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(verticies), glContext.DYNAMIC_DRAW);
        
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, ebo);
        glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), glContext.STATIC_DRAW);
    
        glContext.vertexAttribPointer(
            vertexPositionAttrib,
            3,
            glContext.FLOAT,
            glContext.FALSE,
            6 * FLOAT_SIZE,
            0
        );
        glContext.enableVertexAttribArray(vertexPositionAttrib); 

        glContext.vertexAttribPointer(
            colorAttrib,
            3,
            glContext.FLOAT,
            glContext.FALSE,
            6 * FLOAT_SIZE,
            3 * FLOAT_SIZE
        );
        glContext.enableVertexAttribArray(colorAttrib);
    });

    gl.useProgram(shaderProgram);

        
    const modelMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelMatrix");
    const viewMatrixLocation = gl.getUniformLocation(shaderProgram, "uViewMatrix");
    const projectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    
    let modelMatrix = mat4.create();
    let viewMatrix = mat4.create();
    let projectionMatrix = mat4.create();

    // Model matrix manipulation
    mat4.rotate(modelMatrix, modelMatrix, -((60 * Math.PI) / 180), [1.0, 0.0, 0.0]);
    mat4.scale(modelMatrix, modelMatrix, [2.0, 2.0, 2.0]);

    // View matrix manipulation
    mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -10.0]);
    mat4.rotate(viewMatrix, viewMatrix, (225 * Math.PI) / 180, [0.0, 1.0, 0.0]);
    
    // Projection Matrix manipulation
    mat4.perspective(projectionMatrix, (45 * Math.PI) / 180, 640 / 480, 0.1, 100);

    gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);
    gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
    
    let deltaTime = 0.0;
    let then = 0.0;
    let totalTime = 0.0;
    function render(now) {
        now *= 0.1;
        deltaTime = now - then;
        totalTime += deltaTime;
        then = now;

        gl.clear(gl.COLOR_BUFFER_BIT);
       
        vao.use(gl);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}