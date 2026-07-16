import { getelements, GetElementsResult } from '../compile/binary.js';
import net from 'net';
import { fileURLToPath } from 'url';
import { dirname, join as pathjoin } from 'path';

// set a default port
let PORT = 3000;
let cont: string[] = [];
let startOF: string = "/ccjs";
let errorTemplatePathNotFound: string = pathjoin(dirname(fileURLToPath(import.meta.url)), "../static/404.box");

function setPort(port_number: number) {
    PORT = port_number;
}

function boxList(listc: string[]) {
    // append to our box list with a foreach
    listc.forEach((ec) => {
        cont.push(ec);
    });

    cont = [...new Set(cont)];
}

function defaultBoxesSet(ant: Record<string, string>) {
    const listable = Object.values(ant);

    listable.forEach((an) => {
        cont = cont.filter(ac => ac !== an);
    });

    if (ant.ntfound) {
        errorTemplatePathNotFound = ant.ntfound;
    }
}

// the design of the routes is like: 
// /home - a page (returns micro bootloader only)
// /ox - a page (returns micro bootloader only)
// /ccjs/home1/elements (returns whole element array for /home) (packet 1)
// /ccjs/home1/style (returns all CSS)
// /ccjs/home1/element1 (returns one element)
// /ccjs/home1/element1/js (returns all js)
// /ccjs/home1/element1/js-button-1

type html_status_code_type = 
    "200 OK"
    | "404 NOT FOUND"

function getHtmlBasic(compilerrc: GetElementsResult, html_status_code: string): string {
    const body =
        compilerrc.html.join('') +
        `<style>` +
        compilerrc.css +
        `</style>`;

    return (
        `HTTP/1.1 ${html_status_code}\r\n` +
        `Content-Type: text/html\r\n` + 
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        `\r\n` +
        body
    );
}

async function makeServer(): Promise<Promise<never>> {
    return new Promise(async (resolve) => {
        // get all compiled elements first
        const arra = await Promise.all(cont.map(pathc => getelements(pathc)));
        const not_found = getelements(errorTemplatePathNotFound);

        function route(thing: string): number | null {
            const pit = arra.find(objc => objc.routes[0] === thing);

            if (!pit) {
                return null;
            }

            const astro = arra.indexOf(pit);
            
            return astro;
        }

        // then make the server
        const cng = net.createServer((stc) => {
            // get a request...
            stc.on('data', (data) => {
                const line = data.toString().split('\r\n')[0];
                const [method, path] = line.split(' ');

                console.log(data.toString());

                // now check whether the method is get
                if (method === "GET") {
                    let thc = route(path);

                    if (thc === null) {
                        stc.write(getHtmlBasic(not_found, "404 NOT FOUND"));
                    } else {
                        stc.write(getHtmlBasic(arra[thc], "200 OK"));  
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
    runServer,
    defaultBoxesSet
};
