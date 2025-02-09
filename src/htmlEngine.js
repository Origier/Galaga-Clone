import { readFileSync } from 'node:fs';

// Class to create an HTML String from a given path
// This class will parse out the HTML and generate new HTML based on what is provided
// As an example, Javascript can be inserted into the given HTML file by pointing to the 
// javascript file within the HTML like so: <script src={javascript.js}></script>
// This segement will be replaced with a script block containing the javascript in this file.
// Furthmore this class can be used to insert variable values into parts of the html sheet by 
// using the following format: ${variable_name}, this will then be replaced with the variable value you provide.
class HTMLEngine {
    #htmlString = '<body>No Body Provided</body>';

    constructor(htmlPath) {
        try {
            this.#htmlString = readFileSync(htmlPath, 'utf8');
            const htmlComponents = this.#htmlString.split('<');
            const indexScript = htmlComponents.findIndex((value) => value.indexOf('script') !== -1);
            // Found script component, insert the script
            if (indexScript !== -1) {
                this.#insertJavascript(htmlComponents);
            }
        } catch (err) {
            console.log("Unable to open source html file: ", err.message);
        }
    }

    // Inserts every javascript file that is referenced in the source HTML file with the following syntax <script ... src={file.js}></script>
    #insertJavascript(htmlComponents) {
        let indexScript = 0;
        let endIndexScript = 0;
        let searchForStart = true;
        let htmlScriptString = '';
        let srcIndex = 0;
        let startIndex = 0;
        let endIndex = 0;

        while (true) {
            while (true) {
                if (searchForStart && htmlComponents[indexScript].search(/script.*>/) !== -1) {
                    searchForStart = false;
                    endIndexScript = indexScript + 1;
                } else if (searchForStart) {
                    indexScript += 1;
                } else if (htmlComponents[endIndexScript].indexOf('/script>') !== -1) {
                    break;
                }  else {
                    endIndexScript += 1;
                }
                
                // Exit condition, no appropriate script components left
                if (indexScript >= htmlComponents.length || endIndexScript >= htmlComponents.length) {
                    return;
                }
            }

            htmlScriptString = htmlComponents[indexScript];
            srcIndex = htmlScriptString.indexOf('src');
            if (srcIndex === -1) {
                searchForStart = true;
                indexScript += 1;
                endIndexScript += 1;
                continue;
            }
            startIndex = htmlScriptString.indexOf('{', srcIndex);
            endIndex = htmlScriptString.indexOf('}', srcIndex);
            if (startIndex === -1 || endIndex === -1) {
                searchForStart = true;
                indexScript += 1;
                endIndexScript += 1;
            // Valid script component found, exit loop and continue
            } else {
                let attributeString = htmlScriptString.replace(/src={.*}/, '');
                let pathString = htmlScriptString.slice(startIndex + 1, endIndex);
                let javascriptString = `console.log('No script component found');`;
                
                try {
                    javascriptString = readFileSync(pathString, 'utf8');
                } catch (err) {
                    console.log("Unable to open source javascript file: ", err.message);
                }
                javascriptString = `<` + attributeString + javascriptString + `</script>`;
                // Insert the script file into the html string, removing the old script element
                const firstHalf = htmlComponents.slice(0, indexScript);
                const secondHalf = htmlComponents.slice(endIndexScript + 1, htmlComponents.length);
                secondHalf.unshift(''); // Added to ensure the arrays join correctly

                this.#htmlString = firstHalf.join('<') + javascriptString + secondHalf.join('<');
                searchForStart = true;
                indexScript += 1;
                endIndexScript += 1;
                htmlComponents = this.#htmlString.split('<');
            }

            // Exit condition, no appropriate script components left
            if (indexScript >= htmlComponents.length || endIndexScript >= htmlComponents.length) {
                return;
            }
        }
    }

    insertVariables(variablesObj) {
        // Find each variable name in the html document and replace it with the value
        for (let variable in variablesObj) {
            const regex = new RegExp(`\\$\{${variable}\}`, 'g');
            this.#htmlString = this.#htmlString.replaceAll(regex, variablesObj[variable].toString());
        }
    }
    
    getHTMLString() {
        return this.#htmlString;
    }
}

export {
    HTMLEngine
};