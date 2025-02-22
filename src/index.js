const { vec2, vec3, vec4, mat3, mat4 } = glMatrix;

const FLOAT_SIZE = 4;

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

    configure(func) {
        if(typeof(func) !== 'function') {
            throw new Error("You must provide a function that uses webgl to configure your object for drawing.");
        }

        this.#executionFunc = func;
    }

    use() {
        this.#executionFunc();
    }
}

// 
// ShapeGL Class - Shape Object to encompass what is needed to render a 3D shape to a GL canvas
//

// Encapsulation of the needed elements to render a 3D shape to the screen.
// This class will track the local verticies, colors, elements, WebGL buffer objects,
// Vertex Array object to manage the attributes and allows for modifications on the object itself.
// The object can be transformed locally or globally, and is capable of rendering itself to a WebGL canvas.

class ShapeGL {
    #verticies = null;
    #vertexBufferObject = null;
    #localVerticiesChanged = true;
    #vertexPositionAttrib = null;
    #elements = null;
    #elementBufferObject = null;
    #elementsChanged = true;
    #colors = null;
    #colorBufferObject = null;
    #colorsChanged = true;
    #vertexColorAtrrib = null;
    #modelMatrix = null;
    #vao = null;
    #vertexItems = null;
    #colorItems = null;
    #vertexCount = null;
    #glContext = null

    // Expects arrays of verticies, colors and elements
    // Verticies are the positions for each vertex in the object
    // Colors are the color for each vertex, each vertex MUST have a color - they are associated by the order in the arrays, i.e. verticies[1] has colors[1] applied to it
    // Elements are for the order to draw the verticies in, expecting to draw triangles, use the array index, ex: 0, 1, 2 draws a triangle between verticies[0] -> verticies[1] -> verticies[2]
    // glContext needs to be a WebGL context to reference the needed functions for rendering.

    constructor(verticies, vertexItems, colors, colorItems, elements, glContext) {
        if (vertexItems !== 3 && vertexItems !== 4) {
            throw new Error("Verticies must either be 3 or 4 items each, {x,y,z} or {x,y,z,w}");
        }

        if (colorItems !== 3 && colorItems !== 4) {
            throw new Error("Colors must either be 3 or 4 items each, {r,g,b} or {r,g,b,a}");
        }

        if (verticies.length % vertexItems !== 0) {
            throw new Error("The amount of data provided for verticies is not divisible by the number of vertex items per vertex, each vertex should be formatted the same without additional data.");
        }

        
        if (colors.length % colorItems !== 0) {
            throw new Error("The amount of data provided for colors is not divisible by the number of colors items per vertex, each color should be formatted the same without additional data.");
        }

        this.#vao = null;
        this.#modelMatrix = mat4.create();
        this.#verticies = verticies;
        this.#vertexItems = vertexItems;
        this.#elements = elements;
        this.#colors = colors;
        this.#colorItems = colorItems;
        this.#vertexCount = verticies.length / vertexItems;
        this.#glContext = glContext;
        if (this.#vertexCount !== (this.#colors.length / this.#colorItems)) {
            throw new Error("The number of verticies does not match the number of colors, each vertex must associate to a color");
        }

        this.#vertexBufferObject = this.#glContext.createBuffer();
        this.#colorBufferObject = this.#glContext.createBuffer();
        this.#elementBufferObject = this.#glContext.createBuffer();


        this.#vao = new VertexArrayObject(() => {
            // Bind the VBO and set the attribute info
            this.#glContext.bindBuffer(this.#glContext.ARRAY_BUFFER, this.#vertexBufferObject);
            if (this.#localVerticiesChanged) {
                this.#localVerticiesChanged = false;
                this.#glContext.bufferData(this.#glContext.ARRAY_BUFFER, new Float32Array(this.#verticies), this.#glContext.DYNAMIC_DRAW);
            }
    
            this.#glContext.vertexAttribPointer(
                this.#vertexPositionAttrib,
                this.#vertexItems,
                this.#glContext.FLOAT,
                this.#glContext.FALSE,
                this.#vertexItems * FLOAT_SIZE,
                0
            );
    
            this.#glContext.enableVertexAttribArray(this.#vertexBufferObject); 
    
            // Bind the CBO and set the attribute info
            this.#glContext.bindBuffer(this.#glContext.ARRAY_BUFFER, this.#colorBufferObject);
            if (this.#colorsChanged) {
                this.#colorsChanged = false;
                this.#glContext.bufferData(this.#glContext.ARRAY_BUFFER, new Float32Array(this.#colors), this.#glContext.STATIC_DRAW);
            }
            
    
            this.#glContext.vertexAttribPointer(
                this.#vertexColorAtrrib,
                this.#vertexItems,
                this.#glContext.FLOAT,
                this.#glContext.FALSE,
                this.#vertexItems * FLOAT_SIZE,
                0
            );
            this.#glContext.enableVertexAttribArray(this.#vertexColorAtrrib);
            
            this.#glContext.bindBuffer(this.#glContext.ELEMENT_ARRAY_BUFFER, this.#elementBufferObject);
            if (this.#elementsChanged) {
                this.#elementsChanged = false;
                this.#glContext.bufferData(this.#glContext.ELEMENT_ARRAY_BUFFER, new Int16Array(this.#elements), this.#glContext.STATIC_DRAW);
            }
        });
    }

    configureVao(func) {
        if (this.#vao === null) {
            this.#vao = new VertexArrayObject(func);
        } else {
            this.#vao.configure(func);
        }
    }

    setVertexData(verticies) {
        this.#verticies = verticies;
    }

    setElementData(elements) {
        this.#elements = elements;
    }

    setColorData(colors) {
        this.#colors = colors;
    }

    // Transforms the object on the local verticies based on the transform matrix
    transformLocal(transformMatrix) {
        this.#localVerticiesChanged = true;

        let transformedVerticies = [];
        let i = 0;
        let tempVector = null;
        while (i < this.#verticies.length) {
            let w = 1;
            if (this.#vertexItems === 4) {
                w = this.#verticies[i + 3];
            }

            tempVector = vec4.fromValues(this.#verticies[i], this.#verticies[i + 1], this.#verticies[i + 2], w);
            vec4.transformMat4(tempVector, tempVector, transformMatrix);

            if (this.#vertexItems === 4) {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2], tempVector[3]);
            } else {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2]);
            }

            i += this.#vertexItems;
        }
        this.#verticies = transformedVerticies;
    }

    translateLocal(translationVector) {
        if (typeof(translationVector) !== 'object') {
            throw new Error("Translation Vector must be an array or vector");
        }
        const translation = mat4.create();
        mat4.fromTranslation(translation, translationVector);
        this.transformLocal(translation);
    }

    rotateLocal(degrees, rotationAxisVector) {
        if (typeof(rotationAxisVector) !== 'object') {
            throw new Error("Rotation axis vector must be an array or vector");
        }
        const rotation = mat4.create();
        mat4.fromRotation(rotation, (degrees * Math.PI) / 180, rotationAxisVector);
        this.transformLocal(rotation);
    }

    scaleLocal(scalingVector) {
        if (typeof(scalingVector) !== 'object') {
            throw new Error("Scaling Vector must be an array or vector");
        }
        const scale = mat4.create();
        mat4.fromScaling(scale, scalingVector);
        this.transformLocal(scale);
    }

    translateGlobal(translationVector) {
        if (typeof(translationVector) !== 'object') {
            throw new Error("Translation Vector must be an array or vector");
        }
        mat4.translate(this.#modelMatrix, this.#modelMatrix, translationVector);
    }

    rotateGlobal(degrees, rotationAxisVector) {
        if (typeof(rotationAxisVector) !== 'object') {
            throw new Error("Rotation axis vector must be an array or vector");
        }
        mat4.rotate(this.#modelMatrix, this.#modelMatrix, (degrees * Math.PI) / 180, rotationAxisVector);
    }

    scaleGlobal(scalingVector) {
        if (typeof(scalingVector) !== 'object') {
            throw new Error("Scaling Vector must be an array or vector");
        }
        mat4.scale(this.#modelMatrix, this.#modelMatrix, scalingVector);
    }

    getGlobalVerticies() {
        let transformedVerticies = [];
        let i = 0;
        let tempVector = null;
        while (i < this.#verticies.length) {
            let w = 1;
            if (this.#vertexItems === 4) {
                w = this.#verticies[i + 3];
            }

            tempVector = vec4.fromValues(this.#verticies[i], this.#verticies[i + 1], this.#verticies[i + 2], w);
            vec4.transformMat4(tempVector, tempVector, this.#modelMatrix);

            if (this.#vertexItems === 4) {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2], tempVector[3]);
            } else {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2]);
            }

            i += this.#vertexItems;
        }

        return transformedVerticies;
    }

    getLocalVerticies() {
        return this.#verticies;
    }

    render(shaderProgram, modelMatrixName, vertexPositionName, vertexColorName) {
        this.#vertexPositionAttrib = this.#glContext.getAttribLocation(shaderProgram, vertexPositionName);
        this.#vertexColorAtrrib = this.#glContext.getAttribLocation(shaderProgram, vertexColorName);
        const modelMatrixLocation = this.#glContext.getUniformLocation(shaderProgram, modelMatrixName);
        this.#glContext.uniformMatrix4fv(modelMatrixLocation, false, this.#modelMatrix);
        this.#vao.use();
        this.#glContext.drawElements(this.#glContext.TRIANGLES, this.#elements.length, this.#glContext.UNSIGNED_SHORT, 0);
    }
}



const verticies = [
    // Front Face
    // Positions     
    0.5,  0.5, -0.5, 
    0.5, -0.5, -0.5, 
   -0.5, -0.5, -0.5, 
   -0.5,  0.5, -0.5, 

   // Back Face
   // Positions      
    0.5,  0.5,  0.5, 
    0.5, -0.5,  0.5, 
   -0.5, -0.5,  0.5, 
   -0.5,  0.5,  0.5, 

   // Top Face
   // Positions     
   0.5,  0.5,  0.5, 
   0.5,  0.5, -0.5, 
  -0.5,  0.5,  0.5, 
  -0.5,  0.5, -0.5, 

   // Bottom Face
   // Positions     
   0.5, -0.5,  0.5, 
   0.5, -0.5, -0.5, 
  -0.5, -0.5,  0.5, 
  -0.5, -0.5, -0.5, 

   // Right Face
   // Positions     
   0.5,  0.5,  0.5, 
   0.5,  0.5, -0.5, 
   0.5, -0.5,  0.5, 
   0.5, -0.5, -0.5, 

   // Left Face
   // Positions     
  -0.5,  0.5,  0.5, 
  -0.5,  0.5, -0.5, 
  -0.5, -0.5,  0.5, 
  -0.5, -0.5, -0.5
];

const colors = [
    // Red
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    // Orange
    1.0, 0.7, 0.0,
    1.0, 0.7, 0.0,
    1.0, 0.7, 0.0,
    1.0, 0.7, 0.0,
    // White
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    // Black
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
    // Blue
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    // Green
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0
]

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


const canvas = document.querySelector('#gl-canvas');

// Initalize the gl context
const gl = canvas.getContext('webgl');

if (gl === null) {
    alert('Webgl was unable to load, your machine or browser may not be able to support this webpage :(');
} else {
    main();
}

const cube = new ShapeGL(verticies, 3, colors, 3, indices, gl);
const cube2 = new ShapeGL(verticies, 3, colors, 3, indices, gl);
cube2.scaleGlobal([0.5, 0.5, 0.5]);
cube2.translateGlobal([0.0, 2.0, 0.0]);
cube2.rotateGlobal(45, [0.0, 1.0, 0.0]);


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

    // Creating a new manager
    // const manager = new GLManager(gl);

    // Event listener to move the square
    document.addEventListener('keydown', moveSquare);

    // Set clear color to black, fully opaque
    gl.clearColor(0.6, 0.6, 0.6, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // Clear the color buffer with specified clear color and depth
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

    gl.useProgram(shaderProgram);

    const viewMatrixLocation = gl.getUniformLocation(shaderProgram, "uViewMatrix");
    const projectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    
    let viewMatrix = mat4.create();
    let projectionMatrix = mat4.create();

    // // View matrix manipulation
    mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -10.0]);
    // mat4.rotate(viewMatrix, viewMatrix, (45 * Math.PI) / 180, [0.0, 1.0, 0.0]);
    
    // // Projection Matrix manipulation
    mat4.perspective(projectionMatrix, (45 * Math.PI) / 180, 640 / 480, 0.1, 100);

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

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
       
        cube.render(shaderProgram, "uModelMatrix", "aVertexPosition", "aColor");
        cube2.render(shaderProgram, "uModelMatrix", "aVertexPosition", "aColor");

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}