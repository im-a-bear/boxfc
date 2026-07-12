// translate/translate_help.ts

// import the language constant
import { language } from "../constants.js";
import * as path from 'path';

function getTranslateName(at_path: string) {
    // Join the path components normally
    let resultPath = path.join(at_path, 'translate', `${language}.js`);
    
    // Node requires relative imports to explicitly start with '.' or '..'
    if (!resultPath.startsWith('.') && !path.isAbsolute(resultPath)) {
        resultPath = './' + resultPath;
    }
    
    return resultPath;
}

// create a type which is basically a kind of string
type DynamicVariable = {
    type: 'dynamic';
    name: string;
};;

class TranslateFileTemplate {
    // a list of string and dvars that we can evaluate
    thing: (string | DynamicVariable)[] = [];
    
    constructor(...fmgs: (DynamicVariable|string)[]) {
        fmgs.forEach(dvar => {
            // append it
            this.thing.push(dvar);
        });
    }

    dGet(...argc: string[]) {
        let full_string: string = "";
        let current_string_lnc: number = 0;

        // for each thing mathc the pairs
        this.thing.forEach(antocity => {
            if (typeof antocity === 'object' && antocity.type === 'dynamic') {
                full_string += argc[current_string_lnc] || "";
                current_string_lnc += 1;
            } else {
                full_string += antocity;
            }
        });

        return full_string;
    }
}

// use a dynamic class for translation files
interface TranslateFile {
    hello_frame: string;
    path_not_valid_file: string;
    path_not_correct_file_extension: TranslateFileTemplate;
    path_not_valid_OS: string;
    path_given_empty: string;
    path_given_whitespace: string;
    file_not_exist: string;
    file_not_real_file: string;
    not_plain_text_file: string
}

export {
    getTranslateName,
    TranslateFile,
    TranslateFileTemplate,
    DynamicVariable
}
