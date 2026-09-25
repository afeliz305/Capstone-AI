(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    const source = document.currentScript?.src;
    const options = {
      baseUrl: new URL("../../", source || new URL("js/shared/api-client.js", document.baseURI)).href,
      transport: document.currentScript?.dataset?.apiTransport,
      fetchImpl: root.fetch.bind(root)
    };
    if (options.transport === "browser") {
      // Deliberate build mode only, never a fallback for a failed server save.
      root.CapstoneApi = root.CapstoneBrowserDemo.create(options);
    } else if (options.transport === "supabase") {
      root.CapstoneApi = root.CapstoneSupabase.create(options);
    } else root.CapstoneApi = factory().createApiClient({ ...options, indexedSearch:options.transport === "php" ? root.CapstoneIndexedSearch : undefined });
  }
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const setupMessage = "The Capstone backend is not available at this address. Start the server version with npm.cmd start from DEVELOPMENT. For browser-only Ocelot testing, upload the complete generated Capstone - AI website from package:ocelot, then hard-refresh; do not upload DEVELOPMENT. If you deliberately chose the PHP shared version, follow the optional PHP health/setup guide. No save was confirmed.";

  function createApiClient({ baseUrl, fetchImpl, transport = "node", indexedSearch }) {
    const base = new URL(baseUrl);
    if (!["node", "php"].includes(transport)) throw new Error("Invalid Capstone API transport.");
    function url(route) {
      if (!/^\/api\//.test(route)) throw new Error("Invalid Capstone API route.");
      const target = new URL(route.slice(1), base);
      if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname + "api/")) {
        throw new Error("Invalid Capstone API route.");
      }
      if (transport === "php") {
        const endpoint = new URL("api/index.php", base);
        endpoint.search = target.search;
        endpoint.searchParams.set("route", target.pathname.slice(base.pathname.length + 3));
        return endpoint.href;
      }
      return target.href;
    }
    async function request(route, options = {}) {
      if (!["http:", "https:"].includes(base.protocol)) throw new Error(setupMessage);
      url(route); // Validate even locally handled routes.
      const parsed = new URL(route,base);
      if (transport === "php" && indexedSearch && parsed.pathname === "/api/search" && (!options.method || options.method === "GET")) {
        const question = (parsed.searchParams.get("q") || "").trim().slice(0,500);
        const data = question ? {question,...indexedSearch(question,parsed.searchParams.get("context"))} : {error:"A question is required."};
        return new Response(JSON.stringify(data),{status:question?200:400,headers:{"Content-Type":"application/json"}});
      }
      let response;
      try {
        response = await fetchImpl(url(route), {
          ...options, credentials: "same-origin", redirect: "error",
          headers: { Accept: "application/json", ...options.headers }
        });
      } catch {
        throw new Error("Cannot reach the Capstone backend. Check your connection and that the app server is running. No success was confirmed; check the queue before retrying a ticket submission.");
      }
      return response;
    }
    async function readJson(response) {
      const type = response.headers?.get("content-type") || "";
      if (response.redirected || !/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(type)) {
        throw new Error(setupMessage);
      }
      try {
        const data = await response.json();
        if (data === null || typeof data !== "object") throw new Error();
        return data;
      } catch {
        throw new Error("The Capstone backend returned an invalid response. Contact the project owner; this is not an incorrect-password message.");
      }
    }
    return { baseUrl: base.href, url, fetch: request, readJson };
  }
  return { createApiClient };
});
