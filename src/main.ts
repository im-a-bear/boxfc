// src/main.ts

import * as path from 'path';
import {
    file_extension
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
    // A class to keep the contents of a Bfile in intermediatery class format and also to read a proper path.

    FILE_EXTENSION: string = file_extension;
    EXTENSION_REGEX: RegExp = bfile_extension_regex;

    // the contents of a raw file
    FILE_CONTENTS!: string;
    PATH: string;

    constructor(path_to: string) {
        this.PATH = path_to;

        this._check_proper_path()
        this._check_file_exists()
    }

    _check_proper_path() {
        // this function checks if this.full_path is valid path and ends with the proper extension

        try {
            // use the path.basename for easy path checking
            const base_name = path.basename(this.PATH);
            
            // throw a custom error
            if (!base_name || base_name === '.' || base_name === '..') {
                throw new Error(strings.path_not_valid_file);
            }

            // also match things like .bfile.extra
            if (!this.EXTENSION_REGEX.test(base_name)) {
                throw new Error(strings.path_not_correct_file_extension.dGet(this.FILE_EXTENSION, this.FILE_EXTENSION));
            }
        } catch (error) {
            // rethrow if os error or else just let the suer know that it is an invalid path
            if (error instanceof Error) throw error;
            throw new Error(strings.path_not_valid_OS);
        }
    }

    _check_file_exists() {
        // this function checks if the full_path file exists and is a plain text file.
    }
}

function readFile(path_to_bfile: string) {
    if (!path_to_bfile) {
        throw new Error(strings.path_given_empty);
    }

    if (!path_to_bfile.trim()) {
        throw new Error(strings.path_given_whitespace)
    }
}

export {
    sayHelloToV003,
    readFile
};
