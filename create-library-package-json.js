import path from 'path';
import fs from 'fs';
import json from './package.json' assert { type: 'json' };

let publicFolder = './public';

let packageJsonKeys = ['name', 'version', 'author', 'license', 'keywords', 'description', 'exports', 'files', 'type', 'main', 'module', 'svelte', 'types']
function main() {
    let result = {};
    if (json) {
        packageJsonKeys.forEach((key) => {
            if (json[key]) {
                result[key] = json[key];
            }
        })
    }
    if (!fs.existsSync(publicFolder)) {
        fs.mkdirSync(publicFolder);
    }
    fs.writeFileSync(path.resolve(publicFolder + '/package.json'), JSON.stringify(result, null, 4))
    console.log('package.json created.')

}

main();