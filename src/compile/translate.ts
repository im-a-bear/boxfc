// compile/translate.ts

// Define ascii_letters
const asciiLetters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const identifierRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;

class element_args {
    name: string;
    contains: string | boolean | number | bigint;

    constructor(name: string, contains: string | boolean | number | bigint) {
        this.name = name;
        this.contains = contains;
    }
}

class defined_element_arg {
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

class defined_element {
    name: string;
    required_arguments: defined_element_arg[];

    constructor(name: string, required_arguments: defined_element_arg[]) {
        this.name = name;
        this.required_arguments = required_arguments;
    }
}

// Fixed validation error in your element registry
let defined_elements: defined_element[] = [
    new defined_element('html', []),
    new defined_element('css', []),
    new defined_element('js', [])
];

class BfileElement {
    name: string;
    args: element_args[];
    type: defined_element;
    content: string; // Captured payload inside braces

    constructor(name: string, type: defined_element, content: string = "") {
        this.name = name;
        this.type = type;
        this.content = content;
        this.args = [];
    }
}

interface CompilerError {
    line: number;
    message: string;
}

interface CompilerOutput {
    // One entry per named `html name{...}` block in the source, in source order.
    // A single block's content (however many tags it contains) is one array entry —
    // the compiler doesn't parse HTML tags, so it can't split a block up further.
    // If you want separate array entries, write separate named html blocks.
    html: string[];
    css: string;
    js: string;
    errors: CompilerError[];
}

function bfile_to_html(file_buffer: string): CompilerOutput {
    let elements: BfileElement[] = [];
    let errors: CompilerError[] = [];

    let current_word: string = "";
    let captured_type: string = "";
    let captured_name: string = "";
    let current_block_valid: boolean = true; // whether the block currently being captured should be emitted

    let in_special: boolean = false;
    let special_content: string = "";
    let special_start_line: number = 1;

    let in_braces: boolean = false;
    let brace_content: string = "";
    let brace_depth: number = 0;
    let brace_start_line: number = 1;

    let line: number = 1;

    function reportError(message: string, atLine: number = line): void {
        const full = `[Syntax Error] Line ${atLine}: ${message}`;
        errors.push({ line: atLine, message: full });
        console.error(full);
    }

    // Validates the "@docs boxfc <docname>" decorator format.
    // Other "@..." decorators are left alone (only @docs is format-checked).
    function validateDecorator(content: string, atLine: number): void {
        const tokens = content.split(/\s+/).filter(t => t.length > 0);

        if (tokens.length === 0) {
            reportError(`Empty decorator '@;'`, atLine);
            return;
        }

        if (tokens[0] !== "docs") {
            return; // not a @docs decorator, nothing to enforce
        }

        if (tokens.length < 2) {
            reportError(`Expected '@docs boxfc <docname>' but got '@${content}'`, atLine);
            return;
        }

        if (tokens[1] !== "boxfc") {
            reportError(`Expected keyword 'boxfc' after '@docs', got '${tokens[1]}'`, atLine);
            return;
        }

        if (tokens.length < 3) {
            reportError(`Expected a docname after '@docs boxfc' but none was given`, atLine);
            return;
        }

        const docname = tokens[2];
        if (!identifierRegex.test(docname)) {
            reportError(
                `Invalid docname '${docname}' — docname must be a plain string of letters/digits/underscores and cannot start with a digit`,
                atLine
            );
        }

        if (tokens.length > 3) {
            reportError(
                `Unexpected extra tokens after docname in '@docs boxfc ${docname}': '${tokens.slice(3).join(" ")}'`,
                atLine
            );
        }
    }

    for (let i = 0; i < file_buffer.length; i++) {
        const char = file_buffer[i];

        if (char === "\n") {
            line++;
        }

        // Handle single-line comments (applies everywhere, including inside braces,
        // matching the original behavior of this compiler)
        if (char === "/" && file_buffer[i + 1] === "/") {
            while (i < file_buffer.length && file_buffer[i] !== "\n") {
                i++;
            }
            continue;
        }

        // Inside brace payload capture mode - now nesting-aware
        if (in_braces) {
            if (char === "{") {
                brace_depth++;
                brace_content += char;
            } else if (char === "}") {
                brace_depth--;
                if (brace_depth === 0) {
                    in_braces = false;

                    if (current_block_valid) {
                        const matchedType = defined_elements.find(e => e.name === captured_type);
                        if (matchedType) {
                            const newElement = new BfileElement(captured_name, matchedType, brace_content.trim());
                            elements.push(newElement);
                        }
                    }

                    // Reset state machines
                    brace_content = "";
                    captured_type = "";
                    captured_name = "";
                    current_block_valid = true;
                } else {
                    brace_content += char;
                }
            } else {
                brace_content += char;
            }
            continue;
        }

        // Detect decorator markers (@docs etc)
        if (char === "@") {
            in_special = true;
            special_content = "";
            special_start_line = line;
            continue;
        }

        // End of a directive line/expression
        if (char === ";") {
            if (in_special) {
                in_special = false;
                validateDecorator(special_content.trim(), special_start_line);
                special_content = "";
            }
            current_word = "";
            continue;
        }

        // Capture characters inside @ macro declarations for later validation
        if (in_special) {
            special_content += char;
            continue;
        }

        // Word extraction state machine
        if (asciiLetters.includes(char) || char === "_") {
            current_word += char;
        } else {
            if (current_word.length > 0) {
                // If it is a block keyword registry type, save it
                if (defined_elements.some(e => e.name === current_word)) {
                    captured_type = current_word;
                } else if (captured_type !== "") {
                    // If type is already known, this word is its custom identifier name
                    if (!identifierRegex.test(current_word)) {
                        reportError(`Invalid element name '${current_word}' — names must be plain letters/digits/underscores`);
                    }
                    captured_name = current_word;
                } else {
                    // A bare word appeared with no known type context before it
                    reportError(`Unexpected identifier '${current_word}' — no known element type declared before it`);
                }
                current_word = "";
            }

            // Open block tracking payload window
            if (char === "{") {
                current_block_valid = true;

                if (captured_type === "") {
                    reportError(`Block opened with '{' but no valid element type ('html', 'css', or 'js') was declared before it`);
                    current_block_valid = false;
                } else if (!defined_elements.some(e => e.name === captured_type)) {
                    reportError(`Unknown element type '${captured_type}'`);
                    current_block_valid = false;
                } else if (captured_name === "") {
                    reportError(`Block of type '${captured_type}' is missing a name before '{'`);
                    current_block_valid = false;
                }

                in_braces = true;
                brace_depth = 1;
                brace_start_line = line;
            } else if (char === "}") {
                reportError(`Unexpected closing brace '}' with no matching '{'`);
            } else if (!/\s/.test(char)) {
                // Any other non-whitespace, non-structural character outside a recognized
                // context (not a letter/underscore, not '{', '}', '@', ';', or whitespace)
                reportError(`Unexpected character '${char}'`);
            }
        }
    }

    // End-of-file consistency checks
    if (in_braces) {
        reportError(
            `Unterminated block '${captured_name || "(unnamed)"}' of type '${captured_type || "(unknown)"}' — missing closing '}'`,
            brace_start_line
        );
    }
    if (in_special) {
        reportError(`Unterminated decorator starting with '@' — missing ';'`, special_start_line);
    }

    // Process output channels out of AST collection
    let htmlList: string[] = [];
    let cssOutput = "";
    let jsOutput = "";

    for (const el of elements) {
        if (el.type.name === "html") {
            htmlList.push(el.content);
        } else if (el.type.name === "css") {
            cssOutput += el.content + "\n";
        } else if (el.type.name === "js") {
            jsOutput += el.content + "\n";
        }
    }

    return {
        html: htmlList,
        css: cssOutput.trim(),
        js: jsOutput.trim(),
        errors
    };
}

export {
    BfileElement,
    bfile_to_html,
    CompilerError,
    CompilerOutput
};