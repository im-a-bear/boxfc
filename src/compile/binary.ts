// compile/binary.ts
//
// Serializes CompilerOutput (from translate.ts) into a compact binary "bfile"
// format on disk, and reads it back.
//
// html is an array because CompilerOutput.html is one string per named `html name{...}`
// block in the source (translate.ts no longer joins blocks together). css and js stay as
// single merged strings, since a stylesheet/script is naturally one blob.
//
// writebfile() overwrites `filePath` by default, like a normal file write. Pass
// { append: true } if you explicitly want to bundle multiple compiled sources into one
// binary across separate calls — each call then adds its html entries to the array and
// merges its css/js into the existing strings, instead of replacing the file.

import * as fs from "fs";
import * as path from "path";
import { CompilerOutput } from "./translate.js";

const MAGIC = Buffer.from("BFC1", "utf8"); // 4-byte format signature
const FORMAT_VERSION = 2; // v2: html is stored as an array of strings (one per named html block)

interface BfileEntry {
    html: string[];
    css: string;
    js: string;
}

interface GetElementsResult {
    html: string[];
    css: string;
    js: string;
}

function encodeUint32LE(value: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(value, 0);
    return buf;
}

function encodeString(str: string): Buffer {
    const strBuf = Buffer.from(str, "utf8");
    return Buffer.concat([encodeUint32LE(strBuf.length), strBuf]);
}

function encodeStringArray(values: string[]): Buffer {
    return Buffer.concat([
        encodeUint32LE(values.length),
        ...values.map(encodeString)
    ]);
}

function encodeEntry(entry: BfileEntry): Buffer {
    return Buffer.concat([
        encodeStringArray(entry.html),
        encodeString(entry.css),
        encodeString(entry.js)
    ]);
}

function encodeFile(entries: BfileEntry[]): Buffer {
    const header = Buffer.concat([
        MAGIC,
        Buffer.from([FORMAT_VERSION]),
        encodeUint32LE(entries.length)
    ]);
    const body = Buffer.concat(entries.map(encodeEntry));
    return Buffer.concat([header, body]);
}

function readUint32LE(buf: Buffer, offset: number): number {
    if (offset + 4 > buf.length) {
        throw new Error(`Corrupt bfile binary: expected a length value at offset ${offset}, but the buffer ended`);
    }
    return buf.readUInt32LE(offset);
}

function decodeString(buf: Buffer, offset: number): { value: string; nextOffset: number } {
    const len = readUint32LE(buf, offset);
    const start = offset + 4;
    const end = start + len;
    if (end > buf.length) {
        throw new Error(`Corrupt bfile binary: string length ${len} at offset ${offset} runs past the end of the file`);
    }
    return { value: buf.toString("utf8", start, end), nextOffset: end };
}

function decodeStringArray(buf: Buffer, offset: number): { value: string[]; nextOffset: number } {
    const count = readUint32LE(buf, offset);
    offset += 4;

    const values: string[] = [];
    for (let i = 0; i < count; i++) {
        const result = decodeString(buf, offset);
        values.push(result.value);
        offset = result.nextOffset;
    }

    return { value: values, nextOffset: offset };
}

function decodeFile(buf: Buffer): BfileEntry[] {
    if (buf.length < MAGIC.length + 1 + 4) {
        throw new Error("Corrupt bfile binary: file is too small to contain a valid header");
    }

    const magic = buf.subarray(0, MAGIC.length);
    if (!magic.equals(MAGIC)) {
        throw new Error(
            `Not a valid bfile binary: bad magic header (got '${magic.toString("utf8")}', expected '${MAGIC.toString("utf8")}')`
        );
    }

    let offset = MAGIC.length;
    const version = buf.readUInt8(offset);
    offset += 1;

    if (version !== FORMAT_VERSION) {
        throw new Error(`Unsupported bfile binary version ${version} (this reader only supports version ${FORMAT_VERSION})`);
    }

    const entryCount = readUint32LE(buf, offset);
    offset += 4;

    const entries: BfileEntry[] = [];
    for (let i = 0; i < entryCount; i++) {
        const htmlResult = decodeStringArray(buf, offset);
        offset = htmlResult.nextOffset;

        const cssResult = decodeString(buf, offset);
        offset = cssResult.nextOffset;

        const jsResult = decodeString(buf, offset);
        offset = jsResult.nextOffset;

        entries.push({ html: htmlResult.value, css: cssResult.value, js: jsResult.value });
    }

    return entries;
}

interface WriteBfileOptions {
    // When true, if `filePath` already contains a valid bfile binary, the new compiler
    // output is appended as an additional entry instead of replacing the file. Defaults
    // to false: by default writebfile() OVERWRITES `filePath`, same as a normal file write.
    append?: boolean;
}

/**
 * Serializes a CompilerOutput into the bfile binary format and writes it to `filePath`.
 *
 * By default this overwrites `filePath` if it already exists. Pass `{ append: true }` if
 * you want to bundle multiple compiled sources into a single binary file across separate
 * calls (each call then adds one more entry instead of replacing the previous ones).
 */
function writebfile(filePath: string, compilerInput: CompilerOutput, options: WriteBfileOptions = {}): void {
    const newEntry: BfileEntry = {
        html: [...compilerInput.html],
        css: compilerInput.css,
        js: compilerInput.js
    };

    let entries: BfileEntry[] = [];

    if (options.append && fs.existsSync(filePath)) {
        try {
            entries = decodeFile(fs.readFileSync(filePath));
        } catch (err) {
            throw new Error(
                `Cannot write bfile: '${filePath}' already exists and is not a valid bfile binary (${(err as Error).message}). ` +
                `Remove or rename the file first, or call writebfile without { append: true } to overwrite it.`
            );
        }
    }

    entries.push(newEntry);

    const outDir = path.dirname(filePath);
    if (outDir && !fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(filePath, encodeFile(entries));
}

/**
 * Reads a bfile binary from `filePath` and returns:
 *   - html: an array of html strings, one per entry that was written to this file
 *   - css:  every entry's css joined together into a single string
 *   - js:   every entry's js joined together into a single string
 */
function getelements(filePath: string): GetElementsResult {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Cannot read bfile: '${filePath}' does not exist`);
    }

    const entries = decodeFile(fs.readFileSync(filePath));

    return {
        html: entries.flatMap(e => e.html),
        css: entries.map(e => e.css).filter(s => s.length > 0).join("\n"),
        js: entries.map(e => e.js).filter(s => s.length > 0).join("\n")
    };
}

export {
    writebfile,
    getelements,
    GetElementsResult,
    BfileEntry,
    WriteBfileOptions
};