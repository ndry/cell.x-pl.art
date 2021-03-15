import { Router } from "https://jspm.dev/npm:itty-router@2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export class Automaton {
    constructor(controller, env) {
        const { storage } = controller;
        this.storage = storage;
        const router = this.router = Router();
        router.post("/comments", async request => {
            await this.postComment(await request.text());
            return new Response();
        });
        router.get("/comments", async request => {
            return new Response(
                JSON.stringify(await this.listComments()), {
                headers: {
                    "content-type": "application/json;charset=UTF-8",
                },
            });
        });
    }
    
    async postComment(text) {
        const { storage } = this;
        
        const key = new Date().toISOString() + "_" + Math.random();
        await storage.put(key, text);
    }
    
    async listComments() {
        const { storage } = this;

        const postsMap = await storage.list({limit: 100, reverse: true});
        const posts = Object.fromEntries(postsMap.entries());
        return posts;
    }
    
    async fetch(request) {
        return this.router.handle(request);
    }
}
class AutomatonClient {
    constructor(env, args) {
        const n = "automata";
        const { name } = args;
        this.client = env[n].get(env[n].idFromName(name));
    }
    
    async postComment(text) {
        return await this.client.fetch("/comments", { method: "POST", body: text });
    }
    
    async listComments() {
        return await (await this.client.fetch("/comments")).json();
    }
}

export class Feed {
    constructor(controller, env) {
        this.storage = controller.storage;
        this.env = env;
    }
    
    async fetch(request) {
        return await handleErrors(async () => {
            let url = new URL(request.url);
            let path = url.pathname.slice(1).split('/');
            
            if (request.method === "POST") {
                const key = new Date().toISOString() + "_" + Math.random();
                await this.storage.put(key, await request.json());
                return new Response("ok", {
                    headers: {
                        ...corsHeaders,
                    },
                });
            } 
            
            const postsMap = await this.storage.list({limit: 100, reverse: true});
            const posts = Object.fromEntries(postsMap.entries());
            return new Response(JSON.stringify(posts), {
                headers: {
                    ...corsHeaders,
                    "content-type": "application/json;charset=UTF-8",
                },
            });
        });
    }
}

class FeedClient {
    constructor(env, args) {
        const n = "feeds";
        const { name } = args;
        this.client = env[n].get(env[n].idFromName(name));
    }
 
    async postFeedEntry(entry) {
        return await this.client.fetch("/", { 
            method: "POST", 
            body: JSON.stringify(entry), 
            headers: { 
                "content-type": "application/json;charset=UTF-8",
            },
        });
    }
}

const isDev = true;
const handleErrors = isDev ? respondErrors : f => f();
async function respondErrors(func) {
    try {
        return await func();
    } catch (err) {
        return new Response(err.stack, {
            status: 500,
            headers: {
                ...corsHeaders,
            },
        });
    }
}

const router = (() => {
    const router = Router();
    
    router.get("/", async (request, env) => {
        const { feeds } = env;
        const feed = feeds.get(feeds.idFromName("global"));
        return feed.fetch(request);
    });
    
    router.post("/", async (request, env) => {
        const { feeds } = env;
        const feed = feeds.get(feeds.idFromName("global"));
        return feed.fetch(request);
    });
    
    router.post("/automata/:code/comments", async (request, env) => {
        const { code } = request.params;
        const comment = await request.text();
        const feed = new FeedClient(env, {name: "global"});
        const automaton = new AutomatonClient(env, {name: code});
        await automaton.postComment(comment);
        await feed.postFeedEntry({ code, comment });
        return new Response("", {
            headers: {
                ...corsHeaders,
            },
        });
    });
    
    router.get("/automata/:code/comments", async (request, env) => {
        const { code } = request.params;
        const automaton = new AutomatonClient(env, {name: code});
        const comments = await automaton.listComments();
        
        return new Response(JSON.stringify(comments), {
            headers: {
                ...corsHeaders,
                "content-type": "application/json;charset=UTF-8",
            },
        });
    });
    
    router.options('*', () => new Response(undefined, {
        headers: {
            ...corsHeaders,
        },
    }));
    
    // 404 for everything else
    router.all('*', () => new Response('Not Found.', { status: 404 }));
    
    return router;
})();
            
export default {
    async fetch(request, env) {
        return handleErrors(() => router.handle(request, env));
    }
}