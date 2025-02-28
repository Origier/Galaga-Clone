
const { vec2, vec3, vec4, mat3, mat4 } = glMatrix;

const playerSpeed = 10.0;
let deltaTime = 0.0;
let eventQue = [];
let playerMoveLeft = false;
let playerMoveRight = false;

// Shader Programs
const vsSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexColor;
    attribute vec2 aTexCoord;

    varying mediump vec4 ourColor;
    varying lowp vec2 TexCoord;

    uniform mat4 uModelMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
        ourColor = vec4(aVertexColor, 1.0);
        TexCoord = aTexCoord;
    }
`

const fsSource = `
    varying mediump vec4 ourColor;
    varying lowp vec2 TexCoord;

    uniform sampler2D ourTexture;

    void main() {
        gl_FragColor = texture2D(ourTexture, TexCoord);
    }
`


// Async server controls to fetch data
async function fetchData(url) {
    let responseData = new Uint8Array(0);
    let tempData = null;
    const dataResponse = await fetch(url);
    for await (const chunk of dataResponse.body) {
        tempData = new Uint8Array(responseData.length + chunk.length);
        tempData.set(responseData);
        tempData.set(chunk, responseData.length);
        responseData = tempData;
    }
    return responseData;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Setup the texture to be used immediately rather than wait for the image to download
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // Blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        }
    };
    image.src = url;

    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0
}

//


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
    #glContext = null;
    #texture = null;
    #textureAttribName = null;
    #textureAttrib = null;
    #textureBufferObject = null;
    #textureCoords = null;
    #textureSet = false;

    #globalRotation = [0.0, 0.0, 0.0];
    #globalScale = [1.0, 1.0, 1.0];
    #globalTranslation = [0.0, 0.0, 0.0];

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
            // Bind the Vertex Buffer Object for where to place the verticies
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
    
            // Bind the Color buffer object for the colors to draw
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

            // Bind the Texture if needed
            if (this.#textureSet) {
                this.#glContext.bindTexture(this.#glContext.TEXTURE_2D, this.#texture);
                this.#glContext.bindBuffer(this.#glContext.ARRAY_BUFFER, this.#textureBufferObject);
                this.#glContext.vertexAttribPointer(
                    this.#textureAttrib,
                    2,
                    this.#glContext.FLOAT,
                    this.#glContext.FALSE,
                    2 * FLOAT_SIZE,
                    0
                );
                this.#glContext.enableVertexAttribArray(this.#textureAttrib);
            }
            
            // Bind the Element Buffer for the drawing order
            this.#glContext.bindBuffer(this.#glContext.ELEMENT_ARRAY_BUFFER, this.#elementBufferObject);
            if (this.#elementsChanged) {
                this.#elementsChanged = false;
                this.#glContext.bufferData(this.#glContext.ELEMENT_ARRAY_BUFFER, new Int16Array(this.#elements), this.#glContext.STATIC_DRAW);
            }
        });
    }

    setTexture(url, textureCoords, textureAttribName) {
        this.#texture = loadTexture(this.#glContext, url);
        this.#textureSet = true;
        this.#textureCoords = textureCoords;
        this.#textureAttribName = textureAttribName;
        this.#textureBufferObject = this.#glContext.createBuffer();
        this.#glContext.bindBuffer(this.#glContext.ARRAY_BUFFER, this.#textureBufferObject);
        this.#glContext.bufferData(this.#glContext.ARRAY_BUFFER, new Float32Array(this.#textureCoords), this.#glContext.STATIC_DRAW);
    }

    removeTexture() {
        this.#texture = null;
        this.#textureSet = false;
        this.#textureCoords = null;
        this.#textureAttribName = null;
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

    calculateModelMatrix() {
        this.#modelMatrix = mat4.create();
        mat4.translate(this.#modelMatrix, this.#modelMatrix, this.#globalTranslation);
        mat4.scale(this.#modelMatrix, this.#modelMatrix, this.#globalScale);
        mat4.rotate(this.#modelMatrix, this.#modelMatrix, (this.#globalRotation[0] * Math.PI) / 180, [1.0, 0.0, 0.0]);
        mat4.rotate(this.#modelMatrix, this.#modelMatrix, (this.#globalRotation[1] * Math.PI) / 180, [0.0, 1.0, 0.0]);
        mat4.rotate(this.#modelMatrix, this.#modelMatrix, (this.#globalRotation[2] * Math.PI) / 180, [0.0, 0.0, 1.0]);
    }

    translateGlobal(translationVector) {
        if (typeof(translationVector) !== 'object') {
            throw new Error("Translation Vector must be an array or vector");
        }
        let i = 0;
        while (i < 3) {
            this.#globalTranslation[i] = this.#globalTranslation[i] + translationVector[i];
            i += 1;
        }
        this.calculateModelMatrix();
    }

    rotateGlobal(degrees, rotationAxisVector) {
        if (typeof(rotationAxisVector) !== 'object') {
            throw new Error("Rotation axis vector must be an array or vector");
        }
        let i = 0;
        while (i < 3) {
            if (rotationAxisVector[i] === 1.0) {
                this.#globalRotation[i] = this.#globalRotation[i] + degrees;
            }
            i += 1;
        }
        this.calculateModelMatrix();
    }

    scaleGlobal(scalingVector) {
        if (typeof(scalingVector) !== 'object') {
            throw new Error("Scaling Vector must be an array or vector");
        }
        let i = 0;
        while (i < 3) {
            this.#globalScale[i] = this.#globalScale[i] + scalingVector[i];
            i += 1;
        }
        this.calculateModelMatrix();
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
        if (this.#textureSet) {
            this.#textureAttrib = this.#glContext.getAttribLocation(shaderProgram, this.#textureAttribName);
        }
        this.#glContext.uniformMatrix4fv(modelMatrixLocation, false, this.#modelMatrix);
        this.#vao.use();
        this.#glContext.drawElements(this.#glContext.TRIANGLES, this.#elements.length, this.#glContext.UNSIGNED_SHORT, 0);
    }
}



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

function configureWebGL(gl) {
    gl.clearColor(BACKGROUND_COLOR_R, BACKGROUND_COLOR_G, BACKGROUND_COLOR_B, BACKGROUND_COLOR_A);  // Setting Background
    gl.clearDepth(DEFAULT_DEPTH_CLEAR);                                                             // Setting the depth rendering
    gl.enable(gl.DEPTH_TEST);                                                                       // Enabling depth testing
    gl.depthFunc(gl.LEQUAL);                                                                        // Using the LEQUAL function for depth testing
    gl.enable(gl.BLEND);                                                                            // Enabling blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);                                             // Applying blending to alpha channels to ensure the canvas is not transparent 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);                                            // Clearing the buffers, resetting the canvas to the default settings just set
}

function togglePlayerMovement(event) {
    if (event.code === 'KeyA') {
        if (playerMoveLeft && event.type === 'keyup') {
            playerMoveLeft = false;
        } else {
            playerMoveLeft = true;
        }
    } else if (event.code === 'KeyD') {
        if (playerMoveRight && event.type === 'keyup') {
            playerMoveRight = false;
        } else {
            playerMoveRight = true;
        }
    }
}

function dispatchEvent(event, eventInfo) {
    if (event.type === 'keydown' || event.type === 'keyup') {
        togglePlayerMovement(event);
    }
}

function queEvent(event) {
    eventQue.push(event);
}

main();

function main() {

    const canvas = document.querySelector('#gl-canvas');

    // Initalize the gl context - ensure that webgl is usable
    const gl = canvas.getContext('webgl', {
        alpha: true,
    });

    if (gl === null) {
        alert('Webgl was unable to load, your machine or browser may not be able to support this webpage :(');
        return;
    }

    let totalTime = 0.0;
    // Build the player scene
    const scene = []
    const player = new ShapeGL(squareVerticies, 3, squareDefaultColors, 3, squareIndices, gl);
    player.setTexture(`${DOMAIN_NAME}/assets/Player.png`, squareDefaultTexCoords, "aTexCoord");
    player.rotateGlobal(180, [0.0, 0.0, 1.0]);
    player.translateGlobal([CANVAS_WIDTH / 2, 100, 0]);
    player.scaleGlobal([100, 100, 0]);

    const basicEnemy = new ShapeGL(squareVerticies, 3, squareDefaultColors, 3, squareIndices, gl);
    basicEnemy.setTexture(`${DOMAIN_NAME}/assets/Enemy_Basic.png`, squareDefaultTexCoords, "aTexCoord");
    basicEnemy.translateGlobal([CANVAS_WIDTH / 2, 500, 0]);
    basicEnemy.scaleGlobal([100, 100, 0]);

    // Adding the items to be rendered
    scene.push(player);
    scene.push(basicEnemy);
    
    // Adding Document event handlers
    document.addEventListener('keydown', queEvent);
    document.addEventListener('keyup', queEvent);

    // Configure the gl context and set the constructed shaders
    configureWebGL(gl);
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    gl.useProgram(shaderProgram);

    // Configuring the Camera Position and the Projection View
    const viewMatrixLocation = gl.getUniformLocation(shaderProgram, "uViewMatrix");
    const projectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    
    let viewMatrix = mat4.create();
    let projectionMatrix = mat4.create();

    mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -10.0]);
    mat4.ortho(projectionMatrix, 0, CANVAS_WIDTH, 0, CANVAS_HEIGHT, 0.1, 100); // Orthographic

    // Setting the above matricies to the uniforms in the shader program
    gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
    
    // Main game loop
    let then = 0.0;
    function render(now) {
        // Time management
        now *= 0.1;
        deltaTime = now - then;
        totalTime += deltaTime;
        then = now;

        const eventInfo = {
            playerObject: player,
            totalTime: totalTime
        }

        for (eventReq of eventQue) {
            dispatchEvent(eventReq, eventInfo);
        }

        eventQue = [];

        if (playerMoveLeft) {
            player.translateGlobal([-playerSpeed * deltaTime, 0.0, 0.0]);
        } else if (playerMoveRight) {
            player.translateGlobal([playerSpeed * deltaTime, 0.0, 0.0]);
        }

        // Resetting the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Rendering everything in the scene
        for (object of scene) {
            object.render(shaderProgram, "uModelMatrix", "aVertexPosition", "aVertexColor");
        }
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}