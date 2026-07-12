import { getelements } from '../compile/binary.js';
import net from 'net';

// set a default port
let PORT = 3000;
const cont: string[] = [];
const startOF: string = "/ccjs";

function setPort(port_number: number) {
    PORT = port_number;
}

function boxList(listc: string[]) {
    // append to our box list with a foreach
    listc.forEach((ec) => {
        cont.push(ec);
    });
}

// the design of the routes is like: 
// /home - a page (returns micro bootloader only)
// /ox - a page (returns micro bootloader only)
// /ccjs/home1/elements (returns whole element array for /home) (packet 1)
// /ccjs/home1/style (returns all CSS)
// /ccjs/home1/element1 (returns one element)
// /ccjs/home1/element1/js (returns all js)
// /ccjs/home1/element1/js-button-1

async function makeServer(): Promise<Promise<never>> {
    return new Promise(async (resolve) => {
        // get all compiled elements first
        const arra = await Promise.all(cont.map(pathc => getelements(pathc)));

        // then make the server
        const cng = net.createServer((stc) => {
            // get a request...
            stc.on('data', (data) => {
                const line = data.toString().split('\r\n')[0];
                const [method, path] = line.split(' ');

                // now check whether the method is get
                if (method === "GET") {
                    if (path === "/") {
                        stc.write(
                            `HTTP/1.1 200 OK\r\n` +
                            `Content-Type: text/html\r\n` +
                            `Content-Length: ${arra[0].html.join('').length}\r\n` +
                            `\r\n` +
                            arra[0].html.join('')
                        );
                    }
                }

                return stc.end();
            })
        });

        // listen
        cng.listen(PORT, () => {
            console.log(`⚡ Listening on http://localhost:${PORT}`);
        });
    });
}

async function runServer(server: Promise<void>): Promise<void> {
    await server;
}

export {
    setPort,
    boxList,
    makeServer,
    runServer
}
