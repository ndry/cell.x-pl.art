// export { default as ky } from "https://unpkg.com/ky@0.26.0/index.js";
import { default as _ky } from "https://unpkg.com/ky@0.26.0/index.js";
export const ky = _ky;

function check(r) {
    if (!r.success) { throw r; }
    return r.result;
}

export class Cloudflare {
    constructor(args) {
        this.ky = (args.ky ?? ky).extend({
            prefixUrl: "/proxy/api.cloudflare.com/client/v4/",
            headers: {
                "Authorization": "Bearer " + args.token,
            }
        });
    }
    
    async scriptList(accoutId) {
        return check(await this.ky.get(
            `accounts/${accoutId}/workers/scripts/`, {
            }
        ).json());
    }
    
    async scriptUpload(accoutId, scriptName, sourceCode) {
        return check(await this.ky.put(
            `accounts/${accoutId}/workers/scripts/${scriptName}`, {
                body: sourceCode,
                headers: { "Content-Type": "application/javascript" },
            }
        ).json());
    }
    
    async scriptSubdomain(accoutId, scriptName, props) {
        return check(await this.ky.post(
            `accounts/${accoutId}/workers/scripts/${scriptName}/subdomain`, {
                json: props,
            }
        ).json());
    }
    
    async routeList(zoneId) {
        return check(await this.ky.get(
            `zones/${zoneId}/workers/routes`, {
            }
        ).json());
    }
    
    async routeCreate(zoneId, route) {
        return check(await this.ky.post(
            `zones/${zoneId}/workers/routes`, {
                json: route,
            }
        ).json());
    }
    
    async routeUpdate(zoneId, routeId, route) {
        return check(await this.ky.put(
            `zones/${zoneId}/workers/routes/${routeId}`, {
                json: route,
            }
        ).json());
    }
}

export class CloudflareDurableObjects extends Cloudflare {
    
    async _scriptUploadModuleFormData(accoutId, scriptName, formData) {
        return check(await this.ky.put(
            `accounts/${accoutId}/workers/scripts/${scriptName}`, {
                body: formData,
            }
        ).json());
    }
        
    async scriptUploadModule(accoutId, scriptName, metadata, files) {
        const data = new FormData();
        data.append(
            "metadata", 
            new Blob([JSON.stringify(metadata)], { type: "application/json"}), 
            "metadata.json");
        for (const [fileName, fileContent] of Object.entries(files)) {
            const type = /\.m?js$/.test(fileName) 
                ? "application/javascript+module" 
                : "application/octet-stream";
            data.append("files", new Blob([fileContent], { type }), fileName);
        }
        return await this._scriptUploadModuleFormData(accoutId, scriptName, data);
    }
    
    async durableObjectNamespaceList(accoutId) {
        return check(await this.ky.get(
            `accounts/${accoutId}/workers/durable_objects/namespaces/`, {
            }
        ).json());
    }
    
    async durableObjectNamespaceCreate(accoutId, scriptName, className) {
        return check(await this.ky.post(
            `accounts/${accoutId}/workers/durable_objects/namespaces/`, {
                json: {
                    name: `${scriptName}-${className}`, 
                    script: scriptName, 
                    class: className,
                },
            }
        ).json());
    }
}
