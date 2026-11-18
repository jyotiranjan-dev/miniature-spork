// Cloudflare Worker: stores all notes as one JSON file and checks the access key on the server.
// Serves the website (index.html) and the notes JSON at /api/notes.
const KEY_HASH = "72af8dd0b918a468643f5f3ae6d8573517127e0764471abeb5ed5e9bd7db9006";
const DEFAULTS = [
  {id:"main-notes",title:"Main notes",url:"https://notes-by-js.notion.site/ebd/40651af1748980e286a0f2ff52905e33",cat:"General",emoji:"📓",desc:"Everything starts here.",t:1},
  {id:"internal",title:"Internal",url:"https://notes-by-js.notion.site/ebd/40b51af1748980bca83df0571930ff24",cat:"Internal",emoji:"🔒",desc:"Internal notes.",t:2}
];
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,PUT,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-Key"};
const sha = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2,"0")).join("");

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== "/api/notes") return env.ASSETS ? env.ASSETS.fetch(req) : new Response("Not found", {status: 404});
    if (req.method === "OPTIONS") return new Response(null, {headers: cors});
    if (req.method === "GET") {
      const v = await env.NOTES.get("notes");
      return new Response(v || JSON.stringify(DEFAULTS), {headers: {...cors, "Content-Type":"application/json", "Cache-Control":"no-store"}});
    }
    if (req.method === "PUT") {
      if (await sha(req.headers.get("X-Key") || "") !== KEY_HASH) return new Response("bad key", {status: 401, headers: cors});
      let data;
      try { data = await req.json(); } catch { return new Response("bad json", {status: 400, headers: cors}); }
      if (!Array.isArray(data) || data.length > 500 || data.some(n => !n || typeof n.title !== "string" || !/^https?:\/\//.test(n.url || ""))) return new Response("invalid", {status: 400, headers: cors});
      await env.NOTES.put("notes", JSON.stringify(data));
      return new Response("ok", {headers: cors});
    }
    return new Response("method not allowed", {status: 405, headers: cors});
  }
};
