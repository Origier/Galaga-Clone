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

class ShapeGL extends Object3D {
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
    #colorItems = null;
    #vertexCount = null;
    #glContext = null;
    #texture = null;
    #textureAttribName = null;
    #textureAttrib = null;
    #textureBufferObject = null;
    #textureCoords = null;
    #textureSet = false;

    // Expects arrays of verticies, colors and elements
    // Verticies are the positions for each vertex in the object
    // Colors are the color for each vertex, each vertex MUST have a color - they are associated by the order in the arrays, i.e. verticies[1] has colors[1] applied to it
    // Elements are for the order to draw the verticies in, expecting to draw triangles, use the array index, ex: 0, 1, 2 draws a triangle between verticies[0] -> verticies[1] -> verticies[2]
    // glContext needs to be a WebGL context to reference the needed functions for rendering.

    constructor(verticies, vertexItems, colors, colorItems, elements, glContext) {
        super(verticies, vertexItems);

        if (colorItems !== 3 && colorItems !== 4) {
            throw new Error("Colors must either be 3 or 4 items each, {r,g,b} or {r,g,b,a}");
        }

        if (colors.length % colorItems !== 0) {
            throw new Error("The amount of data provided for colors is not divisible by the number of colors items per vertex, each color should be formatted the same without additional data.");
        }

        this.#vao = null;
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
                this.#glContext.bufferData(this.#glContext.ARRAY_BUFFER, new Float32Array(this._verticies), this.#glContext.DYNAMIC_DRAW);
            }
    
            this.#glContext.vertexAttribPointer(
                this.#vertexPositionAttrib,
                this._vertexItems,
                this.#glContext.FLOAT,
                this.#glContext.FALSE,
                this._vertexItems * FLOAT_SIZE,
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
                this._vertexItems,
                this.#glContext.FLOAT,
                this.#glContext.FALSE,
                this._vertexItems * FLOAT_SIZE,
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

    setElementData(elements) {
        this.#elements = elements;
    }

    setColorData(colors) {
        this.#colors = colors;
    }

    // Transforms the object on the local verticies - indicates to the VAO that the vertex buffer needs to be rewritten.
    transformLocal(transformMatrix) {
        this.#localVerticiesChanged = true;
        console.log("Shape GL transformLocal called");
        super.transformLocal(transformMatrix);
    }
    

    render(shaderProgram, modelMatrixName, vertexPositionName, vertexColorName) {
        this.#vertexPositionAttrib = this.#glContext.getAttribLocation(shaderProgram, vertexPositionName);
        this.#vertexColorAtrrib = this.#glContext.getAttribLocation(shaderProgram, vertexColorName);
        const modelMatrixLocation = this.#glContext.getUniformLocation(shaderProgram, modelMatrixName);
        if (this.#textureSet) {
            this.#textureAttrib = this.#glContext.getAttribLocation(shaderProgram, this.#textureAttribName);
        }
        this.#glContext.uniformMatrix4fv(modelMatrixLocation, false, this._modelMatrix);
        this.#vao.use();
        this.#glContext.drawElements(this.#glContext.TRIANGLES, this.#elements.length, this.#glContext.UNSIGNED_SHORT, 0);
    }
}