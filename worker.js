const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
export class Feed {
    constructor(controller, env) {
        this.storage = controller.storage;
        this.env = env;
    }
    
    async fetch(request) {
        return await respondErrors(async () => {
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
            
            const postsMap = await this.storage.list({limit: 100});
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

const isDev = true;
const respondErrors = isDev ? respondErrorsDev : f => f();
async function respondErrorsDev(func) {
    try {
        return await func();
    } catch (err) {
        return new Response(err.stack, {status: 500});
    }
}

export default {
    async fetch(request, env) {
        return respondErrors(() => {
            const { feeds } = env;
            const feed = feeds.get(feeds.idFromName("global"));
            return feed.fetch(request);
        });
    }
}