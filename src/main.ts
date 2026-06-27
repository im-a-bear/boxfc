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

    // keep a private constructor
    private constructor(path_to: string) {
        this.PATH = path_to;
    }

    // make a asynchronous public method constructor
    public static async make(path_to: string) {
        const bc = new BFile(path_to);

        await bc._check_proper_path();
        await bc._check_file();

        // compile here

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
        // this function checks if the full_path file exists and is a plain text file.
        let file_handle: fsc.FileHandle | null = null;

        try {
            await fsc.access(this.PATH, fsd.F_OK);

            // check if its an actual file first.
            const stats = await fsc.stat(this.PATH);
            if (!stats.isFile()) {
                throw new Error(strings.file_not_real_file); 
            }

            // make a handle (to check the first 512 bytes to see if its a non-text file)
            file_handle = await fsc.open(this.PATH, 'r');

            // get our buffer
            const { buffer } = await file_handle.read(Buffer.alloc(sample_size), 0, sample_size, 0); 

            // if it contains NULL then throw error
            if (buffer.some(byte => byte === 0)) {
                throw new Error(strings.not_plain_text_file);
            }
        } catch (error) {
            // rethrow if its a different kind of error
            if (error instanceof Error) {
                throw error;
            }

            throw new Error(strings.file_not_exist);
        } finally {
            // close our file very important!
            if (file_handle !== null) {
                await file_handle.close();
            }
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

export {
    sayHelloToV003,
    readFile
};
