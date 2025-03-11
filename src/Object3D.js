
// 3D representation of an object that contains verticies and is able to be transformed
// by linear algebraic principles
class Object3D {
    // Base positions
    _verticies = [];
    _vertexItems = 3;
    _origin = [0.0, 0.0, 0.0];

    // Global modifiers
    _globalRotation = [0.0, 0.0, 0.0];
    _globalScale = [1.0, 1.0, 1.0];
    _globalTranslation = [0.0, 0.0, 0.0];
    _modelMatrix = null;

    constructor(verticies, vertexItems) {
        if (vertexItems !== 3 && vertexItems !== 4) {
            throw new Error("Verticies must either be 3 or 4 items each, {x,y,z} or {x,y,z,w}");
        }

        if (verticies.length % vertexItems !== 0) {
            throw new Error("The amount of data provided for verticies is not divisible by the number of vertex items per vertex, each vertex should be formatted the same without additional data.");
        }

        this._verticies = verticies;
        this._vertexItems = vertexItems;
        this._modelMatrix = mat4.create();
    }

    // Transforms the object on the local verticies based on the transform matrix
    transformLocal(transformMatrix) {
        console.log("Object3D transformLocal called");
        let transformedVerticies = [];
        let i = 0;
        let tempVector = null;
        while (i < this._verticies.length) {
            let w = 1;
            if (this._vertexItems === 4) {
                w = this._verticies[i + 3];
            }

            tempVector = vec4.fromValues(this._verticies[i], this._verticies[i + 1], this._verticies[i + 2], w);
            vec4.transformMat4(tempVector, tempVector, transformMatrix);

            if (this._vertexItems === 4) {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2], tempVector[3]);
            } else {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2]);
            }

            i += this._vertexItems;
        }
        this._verticies = transformedVerticies;
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

    getLocalVerticies() {
        return this._verticies;
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////

    // Global Vertex manipulation
    translate(translationVector) {
        if (typeof(translationVector) !== 'object') {
            throw new Error("Translation Vector must be an array or vector");
        }
        let i = 0;
        while (i < 3) {
            this._globalTranslation[i] = this._globalTranslation[i] + translationVector[i];
            i += 1;
        }
        this.calculateModelMatrix();
    }

    rotate(degrees, rotationAxisVector) {
        if (typeof(rotationAxisVector) !== 'object') {
            throw new Error("Rotation axis vector must be an array or vector");
        }
        let i = 0;
        while (i < 3) {
            if (rotationAxisVector[i] === 1.0) {
                this._globalRotation[i] = this._globalRotation[i] + degrees;
            }
            i += 1;
        }
        this.calculateModelMatrix();
    }

    scale(scalingVector) {
        if (typeof(scalingVector) !== 'object') {
            throw new Error("Scaling Vector must be an array or vector");
        }
        let i = 0;
        while (i < 3) {
            this._globalScale[i] = this._globalScale[i] + scalingVector[i];
            i += 1;
        }
        this.calculateModelMatrix();
    }

    setTranslationVector(translationVector) {
        this._globalTranslation = translationVector;
        this.calculateModelMatrix();
    }

    setRotationVector(rotationVector) {
        this._globalRotation = rotationVector;
        this.calculateModelMatrix();
    }

    setScaleVector(scaleVector) {
        this._globalScale = scaleVector;
        this.calculateModelMatrix();
    }

    calculateModelMatrix() {
        this._modelMatrix = mat4.create();
        mat4.translate(this._modelMatrix, this._modelMatrix, this._globalTranslation);
        mat4.scale(this._modelMatrix, this._modelMatrix, this._globalScale);
        mat4.rotate(this._modelMatrix, this._modelMatrix, (this._globalRotation[0] * Math.PI) / 180, [1.0, 0.0, 0.0]);
        mat4.rotate(this._modelMatrix, this._modelMatrix, (this._globalRotation[1] * Math.PI) / 180, [0.0, 1.0, 0.0]);
        mat4.rotate(this._modelMatrix, this._modelMatrix, (this._globalRotation[2] * Math.PI) / 180, [0.0, 0.0, 1.0]);
        this.calculateOrigin();
    }

    getGlobalVerticies() {
        let transformedVerticies = [];
        let i = 0;
        let tempVector = null;
        while (i < this._verticies.length) {
            let w = 1;
            if (this._vertexItems === 4) {
                w = this._verticies[i + 3];
            }

            tempVector = vec4.fromValues(this._verticies[i], this._verticies[i + 1], this._verticies[i + 2], w);
            vec4.transformMat4(tempVector, tempVector, this._modelMatrix);

            if (this._vertexItems === 4) {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2], tempVector[3]);
            } else {
                transformedVerticies.push(tempVector[0], tempVector[1], tempVector[2]);
            }

            i += this._vertexItems;
        }

        return transformedVerticies;
    }

    calculateOrigin() {
        let averageX = 0;
        let averageY = 0;
        let averageZ = 0;
        let i = 0;
        const verticies = this.getGlobalVerticies();

        while (i < verticies.length) {
            averageX += verticies[i];
            averageY += verticies[i + 1];
            averageZ += verticies[i + 2];
            i += this._vertexItems;
        }

        averageX = averageX / (verticies.length / this._vertexItems);
        averageY = averageY / (verticies.length  / this._vertexItems);
        averageZ = averageZ / (verticies.length  / this._vertexItems);
        this._origin = [averageX, averageY, averageZ];
    }

    getOrigin() {
        return this._origin;
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////
}