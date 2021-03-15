import { resolve, dirname } from "https://jspm.dev/npm:@jspm/core@2.0.0-beta.7/nodelibs/path";

export const globalFs = {
    resolveId(source, importer) {
        function addJsExtensionIfNecessary(file) {
            function findFile(file) {
        	    if (fs.existsSync(file)) { return file; }
            }
            
        	return findFile(file) 
        	    ?? findFile(file + '.mjs') 
        	    ?? findFile(file + '.js');
        }
        
        const absoluteSource = resolve(
            importer ? dirname(importer) : resolve(), 
            source);
    	return addJsExtensionIfNecessary(absoluteSource);
    },
    load(id) {
        return fs.readFileSync(id, "utf-8");
    }
};

export const fetchHttp = {
    resolveId(source, importer) {
        if (/^https?:\/\//.test(source)) { 
            return source;
        }
        if (/^https?:\/\//.test(importer)) { 
            const url = new URL(importer);
            url.pathname = path.join(path.dirname(url.pathname), source);
            return url.toString();
        }
    },
    async load(id) {
        if (/^https?:\/\//.test(id)) {
            return await (await fetch(id)).text();    
        }
    }
};

export function functionMap(functionMap) {
    return {
        resolveId(id) {
            if (functionMap[id]) { return id; }
        },
        async load(id) {
            if (functionMap[id]) {
                return `export default ${JSON.stringify(await functionMap[id]())};`;
            }
        }
    }
}