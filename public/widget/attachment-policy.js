(function (root) {
  "use strict";
  const MAX_FILES = 3;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
  const types = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain" };
  function extension(name) { return String(name).split(".").pop().toLowerCase(); }
  function validate(files) {
    if (!Array.isArray(files)) return "Attachments must be a list of files.";
    if (files.length > MAX_FILES) return "Attach up to 3 documents per ticket.";
    let total = 0;
    for (const file of files) {
      if (!file || typeof file.name !== "string" || !file.name.trim() || file.name.length > 180 || /[\\/\x00-\x1f\x7f<>:"|?*]/.test(file.name)) {
        return "Use a document filename of 180 characters or fewer, without path separators or special characters.";
      }
      if (!Object.hasOwn(types, extension(file.name))) return "Only PDF, Word (.docx), and text (.txt) documents are supported.";
      try { encodeURIComponent(file.name); } catch { return "The document filename contains invalid characters. Rename it and try again."; }
      if (!Number.isSafeInteger(file.size) || file.size <= 0) return "Attachments must not be empty.";
      if (file.size > MAX_FILE_BYTES) return "Each document must be 5 MB or smaller.";
      total += file.size;
    }
    return total > MAX_TOTAL_BYTES ? "Documents must total 10 MB or less per ticket." : "";
  }
  const policy = { MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, types, extension, validate };
  if (typeof module === "object" && module.exports) module.exports = policy;
  else root.CapstoneAttachmentPolicy = policy;
})(typeof window === "undefined" ? {} : window);
