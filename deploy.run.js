// Set true once per script
// if you want it to be deployed at `https://${SCRIPT_NAME}.${USER_SUBDOMAIN}.workers.dev/``
const enableDev = false;

const setRoute = false;

const SCRIPT_NAME = "cell_x-pl_art";
const ROUTE_PATTERN = "cell.x-pl.art/*";

import { CF_API_TOKEN, CF_ACCOUNT_ID, CF_ZONE_ID } from "./secrets.js";
import build from "./build.js"


import { ky, CloudflareDurableObjects } from "./Cloudflare";

export async function deploy() {
    const cf = new CloudflareDurableObjects({ 
        token: CF_API_TOKEN, 
        ky: ky.create({ timeout: 30000 }),
    });
    
    const files = {
        "worker.js": await build(),
    };
    
    const namespacesCachePromise = cf.durableObjectNamespaceList(CF_ACCOUNT_ID);
    async function upsertNamespace(className) {
        const namespace = 
            (await namespacesCachePromise).find(n => n.script == SCRIPT_NAME && n.class == className)
                ?? (await cf.durableObjectNamespaceCreate(CF_ACCOUNT_ID, SCRIPT_NAME, className));
        return namespace.id;
    }
    
    // upload bootstrap script
    await cf.scriptUploadModule(CF_ACCOUNT_ID, SCRIPT_NAME, {main_module: "worker.js"}, files);

    const metadata = {
        main_module: "worker.js",
        bindings: [{
            "type": "durable_object_namespace",
            "name": "feeds",
            "namespace_id": await upsertNamespace("Feed"),
        }, {
            "type": "durable_object_namespace",
            "name": "automata",
            "namespace_id": await upsertNamespace("Automaton"),
        }],
    };
    
    await cf.scriptUploadModule(CF_ACCOUNT_ID, SCRIPT_NAME, metadata, files);
    
    if (enableDev) {
        await cf.scriptSubdomain(CF_ACCOUNT_ID, SCRIPT_NAME, { enabled: true });
    }
    
    if (setRoute) {
        const routes = await cf.routeList(CF_ZONE_ID);
        const routeId = routes.find(r => r.pattern === ROUTE_PATTERN)?.id;
        const newRoute = { pattern: ROUTE_PATTERN, script: SCRIPT_NAME };
        if (routeId) {
            await cf.routeUpdate(CF_ZONE_ID, routeId, newRoute);
        } else {
            await cf.routeCreate(CF_ZONE_ID, newRoute);
        }
    }
    
    return "Success";
}
export const run = deploy;