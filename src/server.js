import { createServer } from "node:http";
import { HTMLEngine } from "./htmlEngine.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, FLOAT_SIZE, DEFAULT_DEPTH_CLEAR, BACKGROUND_COLOR_R, BACKGROUND_COLOR_G, BACKGROUND_COLOR_B, BACKGROUND_COLOR_A } from "./documentSettings.js";

const engine = new HTMLEngine("./html/index.html");
const portNumber = 8080;
engine.insertVariables({
    canvasHeight: CANVAS_HEIGHT, 
    canvasWidth: CANVAS_WIDTH, 
    floatSize: FLOAT_SIZE, 
    backgroundColorR: BACKGROUND_COLOR_R,
    backgroundColorG: BACKGROUND_COLOR_G, 
    backgroundColorB: BACKGROUND_COLOR_B, 
    backgroundColorA: BACKGROUND_COLOR_A, 
    depthClear: DEFAULT_DEPTH_CLEAR});
const server = createServer((req, res) => {
    console.log(`Server: Recieved a request at ${req.url}`);
    res.writeHead(200, {'content-type': 'text/html'});
    if (req.url === '/') {
        res.write(engine.getHTMLString());
        res.end();
    } else {
        res.write("No endpoint found.");
        res.end();
    }
});

server.listen(portNumber);

console.log(`Server: Listening on port ${portNumber}`);