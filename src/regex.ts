import { file_extension } from './constants.js';

// escape characters like . for the ile extension
const escaped_extension_for_bfile = file_extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// regex for checking file extension
const bfile_extension_regex = new RegExp(`${escaped_extension_for_bfile}(?:\..+)?$`);

export {
    bfile_extension_regex
};
