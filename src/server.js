import { createServer } from "node:http";
import { HTMLEngine } from "./htmlEngine.js";

const engine = new HTMLEngine("./html/index.html");
const portNumber = 8080;

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