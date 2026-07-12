// src/main.ts

import * as path from 'path';
import {
    promises as fsc,
    constants as fsd
} from 'fs';

import {
    file_extension,
    sample_size
} from './constants.js';
import {
    bfile_extension_regex
} from './regex.js';
import { getTranslateName, TranslateFile } from './translate/translate_help.js';
import { bfile_to_html, CompilerOutput } from './compile/translate.js';
import { writebfile, getelements, GetElementsResult } from './compile/binary.js';
import { setPort, makeServer, boxList, runServer } from './server/static.js';

// import our strings dynamically
const strings: TranslateFile = await import(getTranslateName('.'));

// legacy testing function
function sayHelloToV003() {
    console.log(strings.hello_frame);
}

class BFile {
    // A class to keep the contents of a Bfile in intermediatery class format and asynchrously compile it to a box.

    // the contents of a raw file
    // FILE_CONTENTS!: string;
    PATH: string;

    compilerrc: CompilerOutput | null = null;

    // keep a private constructor
    private constructor(path_to: string) {
        this.PATH = path_to;
    }

    // make a asynchronous public method constructor
    public static async make(path_to: string) {
        const bc = new BFile(path_to);

        await bc._check_proper_path();
        await bc._check_file();

        const tip = await fsc.open(bc.PATH, 'r');

        const compilerc = bfile_to_html(await tip.readFile({ encoding: "utf8" }));

        await tip.close();

        let astro: boolean = false;

        bc.compilerrc = compilerc;

        compilerc.errors.forEach((elc) => {
            console.warn(`AN ERROR OCCURED: at line ${elc.line} of ${bc.PATH}: ${elc.message}`);
            astro = true;
        });

        if (astro) {
            throw new Error("A compiler error occured");
        }

        return bc
    }

    // check the proper path
    private async _check_proper_path() {
        // this function checks if this.full_path is valid path and ends with the proper extension

        try {
            // use the path.basename for easy path checking
            const base_name = path.basename(this.PATH);
            
            // throw a custom error
            if (!base_name || base_name === '.' || base_name === '..') {
                throw new Error(strings.path_not_valid_file);
            }

            // also match things like .bfile.extra
            if (!bfile_extension_regex.test(base_name)) {
                throw new Error(strings.path_not_correct_file_extension.dGet(file_extension, file_extension));
            }
        } catch (error) {
            // rethrow if os error or else just let the suer know that it is an invalid path
            if (error instanceof Error) throw error;
            throw new Error(strings.path_not_valid_OS);
        }
    }

    private async _check_file() {
        try {
            await fsc.access(this.PATH, fsd.F_OK);

            // check if its an actual file first.
            const stats = await fsc.stat(this.PATH);
            if (!stats.isFile()) {
                throw new Error(strings.file_not_real_file); 
            }
        } catch (error) {
            // rethrow if its a different kind of error
            if (error instanceof Error) {
                throw error;
            }

            throw new Error(strings.file_not_exist);
        }
    }
}

async function readFile(path_to_bfile: string) {
    if (!path_to_bfile) {
        throw new Error(strings.path_given_empty);
    }

    if (!path_to_bfile.trim()) {
        throw new Error(strings.path_given_whitespace)
    }

    return BFile.make(path_to_bfile);
}

async function dumpcj(pathc: string, bfile: CompilerOutput)  {
    writebfile(pathc, bfile);
}

async function readcj(pathc: string): Promise<GetElementsResult> {
    return getelements(pathc);
}

export {
    sayHelloToV003,
    readFile,
    dumpcj,
    readcj,
    CompilerOutput,
    GetElementsResult,
    setPort,
    boxList,
    makeServer,
    runServer
};
