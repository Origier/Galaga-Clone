
class GLManager {
    // Hold the buffer ints and the next position to insert the buffer at in the array
    #bufferPosInts = [];
    #bufferColInts = [];
    #context = null;
    
    BUFFER_TYPE = Object.freeze({
        POSITION: 1,
        COLOR: 2
    });

    // glContext is the WebGL context to be managed
    // Clear color is expected to be rgba object format
    // Clear depth is just a number for the expected depth clearing
    constructor(glContext, clearColor, clearDepth) {
        this.#context = glContext;
        this.#context.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
        this.#context.clearDepth(clearDepth);
        this.#context.enable(this.#context.DEPTH_TEST);
        this.#context.depthFunc(this.#context.LEQUAL);
        this.#context.clear(this.#context.COLOR_BUFFER_BIT | this.#context.DEPTH_BUFFER_BIT);
    }

    initBuffer(bufferType, bufferData, usage) {
        // Create the needed buffer and apend the array
        const buffer = this.#context.createBuffer();
        if (bufferType === this.BUFFER_TYPE.POSITION) {
            this.#bufferPosInts.push(buffer);
        } else if (bufferType === this.BUFFER_TYPE.COLOR) {
            this.#bufferColInts.push(buffer);
        }

        // Bind the buffer for use
        this.#context.bindBuffer(this.#context.ARRAY_BUFFER, buffer);

        // Set the buffer data
        this.#context.bufferData(this.#context.ARRAY_BUFFER, new Float32Array(bufferData), usage);
    }

    drawScene(programInfo) {
        // Clear the scene with the defaults previously set
        this.#context.clear(this.#context.COLOR_BUFFER_BIT | this.#context.DEPTH_BUFFER_BIT);

        
    }
}