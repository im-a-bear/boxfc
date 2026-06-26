import { TranslateFileTemplate, DynamicVariable } from "./translate_help.js";

// lets define our strings in english
const hello_frame = "Hello, Framework!";
const path_not_valid_file = "Path does not point to a valid filename.";

const path_not_correct_file_extension_arg_1_and_2: DynamicVariable = { type: 'dynamic', name: 'FILE_EXTENSION' };

const path_not_correct_file_extension = new TranslateFileTemplate(
    "Path must end with ", 
    path_not_correct_file_extension_arg_1_and_2, 
    " or a compound variant like ", 
    path_not_correct_file_extension_arg_1_and_2, 
    ".ext"
);

const path_not_valid_OS = "The provided path format is invalid for this OS.";
const path_given_empty = "Path given to function is empty";
const path_given_whitespace = "Given Path is Just whitespace";

export {
    hello_frame,
    path_not_valid_file,
    path_not_correct_file_extension,
    path_not_valid_OS,
    path_given_empty,
    path_given_whitespace
};
