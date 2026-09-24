function normalizeBasePath(value = "") {
  if (value === "" || value === "/") return "";
  if (typeof value !== "string" || !value.startsWith("/") || /[?#\\\r\n;]/.test(value)) throw new Error("CAPSTONE_BASE_PATH must be a URL folder path, not a full URL.");
  const parts = value.replace(/\/$/, "").slice(1).split("/").map(part => decodeURIComponent(part));
  if (parts.some(part => !part || part === "." || part === ".." || /[/?#\\;\x00-\x1f\x7f]/.test(part))) throw new Error("Invalid CAPSTONE_BASE_PATH.");
  return "/" + parts.map(part => encodeURIComponent(part)).join("/");
}

function normalizePublicOrigin(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("CAPSTONE_PUBLIC_ORIGIN must be an HTTPS origin without a path, credentials, query, or fragment.");
  }
  return url.origin;
}

module.exports = { normalizeBasePath, normalizePublicOrigin };
