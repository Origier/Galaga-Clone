// Collider Class - used for determining when objects collide
// Contains verticies that check for collision events each frame
// Has a call back function to be called when the collision occurs
// Supports transformation similar to ShapeGL objects, but the verticies are only localized
class AreaCollider2D extends Object3D {
    #callBack = null;
    #collisions = [];
    #collisionId = 0;
    static nextId = 1;

    static ColliderShape = Object.freeze({
        SQUARE: 1,
        TRIANGLE: 2,
    });

    constructor(colliderShape) {
        const maxShape = Math.max(Object.values(AreaCollider2D.ColliderShape));
        
        if (colliderShape > maxShape || colliderShape <= 0) {
            throw new Error("ColliderShape should be one of the enums provided by collider.");
        }

        if (colliderShape === 1) {
            super(squareVerticies, 3);
        } else if (colliderShape === 2) {
            super(triangleVerticies, 3);
        }
        this.#collisionId = AreaCollider2D.nextId;
        AreaCollider2D.nextId += 1;
        this.calculateOrigin();
    }

    collision(colliderId) {
        if (this.#callBack === null) {
            throw new Error("Callback function needs to be set first with setCallBack");
        }  

        if (this.#collisions.includes(colliderId)) {
            return;
        } else {
            this.#callBack();
            this.#collisions.push(colliderId);
        }
    }

    removeCollision(colliderId) {
        if (this.#collisions.includes(colliderId)) {
            this.#collisions.splice(this.#collisions.indexOf(colliderId), 1);
        }
    }

    getId() {
        return this.#collisionId;
    }

    setCallBack(func) {
        if (typeof(func) !== 'function') {
            throw new Error("Func needs to be a function");
        }
        this.#callBack = func;
    }

    getVerticies() {
        return this.getGlobalVerticies();
    }

    getVertexItems() {
        return this._vertexItems;
    }
    

    // Checks the relative direction from each vertex to pos
    // If the relative position is similar to that of the origin, ie towards the center of the object, then it is colliding
    // Otherwise it is not colliding
    withinCollider(pos) {
        let diffSigns = 0;
        let i = 0;
        
        let originDiffX = 0;
        let originDiffY = 0;

        let posDiffX = 0;
        let posDiffY = 0;

        const verticies = this.getVerticies();

        while (i < verticies.length) {
            originDiffX = this._origin[0] - verticies[i];
            originDiffY = this._origin[1] - verticies[i + 1];
            
            posDiffX = pos[0] - verticies[i];
            posDiffY = pos[1] - verticies[i + 1];
            
            // If either of the signs are flipped between the direction to the origin and the direction to the position, then it is likely outside the bounds of the area
            if ((originDiffX < 0 && posDiffX >= 0) || (originDiffX >= 0 && posDiffX < 0)) {
                diffSigns += 1;
            } else if ((originDiffY < 0 && posDiffY >= 0) || (originDiffY >= 0 && posDiffY < 0)) {
                diffSigns += 1;
            }

            if (diffSigns >= 2) {
                return false;
            }

            i += this._vertexItems;
        }

        return true;
    }
}