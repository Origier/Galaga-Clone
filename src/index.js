
main();

function main() {
    const canvas = document.querySelector('#gl-canvas');

    // Initalize the gl context
    const gl = canvas.getContext('webgl');

    if (gl === null) {
        alert('Webgl was unable to load, your machine or browser may not be able to support this webpage :(');
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}