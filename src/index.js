
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


// 2D Game Object, has a Z index to indicate the layering order in the 2D scene
// Can contain multiple objects such as colliders and the base shape
// Will render any renderable componenets
class GameObject2D {
    
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

function checkCollisions(colliders) {
    // Collider loop, checking for any collisions that may be occuring in the game
    let i = 0;
    // Fetch each collider to be considered
    while (i < colliders.length) {
        const colliderId = colliders[i].getId();
        // Check each vertex against all other colliders in the list to see if there is a collision
        let k = 0;
        while (k < colliders.length) {
            if (k !== i) {
                const otherId = colliders[k].getId();
                const verticies = colliders[k].getVerticies();
                const vertexItems = colliders[k].getVertexItems();
                let j = 0;
                while (j < verticies.length) {
                    // If one of them is colliding then both are - only one vertex needs to collide for this collider to be colliding
                    if (colliders[i].withinCollider([verticies[j], verticies[j + 1], verticies[j  + 2]])) {
                        colliders[k].collision(colliderId);
                        colliders[i].collision(otherId);
                        break;
                    }
                    j += vertexItems

                    // This object didn't detect the other inside of them
                    // Now check if this object is inside the other one
                    if (j >= verticies.length) {
                        const collVerticies = colliders[i].getVerticies();
                        const collVertexItems = colliders[i].getVertexItems();
                        let l = 0;

                        while (l < collVerticies.length) {
                            if (colliders[k].withinCollider([collVerticies[l], collVerticies[l + 1], collVerticies[l + 2]])) {
                                colliders[k].collision(colliderId);
                                colliders[i].collision(otherId);
                                break;
                            } 

                            l += collVertexItems;

                            // No collisions were detected
                            if (l >= verticies.length) {
                                colliders[k].removeCollision(colliderId);
                                colliders[i].removeCollision(otherId);
                            }
                        }
                    }
                }
            }
            k += 1;
        }
        i += 1;
    }
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
    const scene = [];
    const colliders = [];
    const player = new ShapeGL(squareVerticies, 3, squareDefaultColors, 3, squareIndices, gl);
    const playerCollider = new AreaCollider2D(AreaCollider2D.ColliderShape.SQUARE);
    playerCollider.setCallBack(function () {console.log("Player detected a collision")});
    colliders.push(playerCollider);
    playerCollider.scale([100, 100, 0]);
    playerCollider.translate([CANVAS_WIDTH / 2, 100, 0]);
    player.setTexture(`${DOMAIN_NAME}/assets/Player.png`, squareDefaultTexCoords, "aTexCoord");
    player.rotate(180, [0.0, 0.0, 1.0]);
    player.translate([CANVAS_WIDTH / 2, 100, 0]);
    player.scale([100, 100, 0]);

    const basicEnemy = new ShapeGL(squareVerticies, 3, squareDefaultColors, 3, squareIndices, gl);
    const basicEnemyCollider = new AreaCollider2D(AreaCollider2D.ColliderShape.SQUARE);
    basicEnemyCollider.setCallBack(function () {
        scene.splice(scene.indexOf(basicEnemy), 1);
        colliders.splice(colliders.indexOf(basicEnemyCollider), 1);
    });
    colliders.push(basicEnemyCollider);
    basicEnemyCollider.scale([90, 90, 0]);
    basicEnemyCollider.translate([600, 100, 0]);
    basicEnemy.setTexture(`${DOMAIN_NAME}/assets/Enemy_Basic.png`, squareDefaultTexCoords, "aTexCoord");
    basicEnemy.translate([600, 100, 0]);
    basicEnemy.scale([90, 90, 0]);

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
        checkCollisions(colliders);

        if (playerMoveLeft) {
            player.translate([-playerSpeed * deltaTime, 0.0, 0.0]);
            playerCollider.translate([-playerSpeed * deltaTime, 0.0, 0.0]);
        } else if (playerMoveRight) {
            player.translate([playerSpeed * deltaTime, 0.0, 0.0]);
            playerCollider.translate([playerSpeed * deltaTime, 0.0, 0.0]);
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