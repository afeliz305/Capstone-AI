const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { TextDecoder } = require("node:util");
const policy = require("../public/widget/attachment-policy");

function invalid(message, statusCode = 400) { return Object.assign(new Error(message), { statusCode }); }

function prepareAttachments(input = []) {
  const error = policy.validate(input);
  if (error) throw invalid(error);
  return input.map((file) => {
    if (typeof file.data !== "string" || file.data.length > Math.ceil(policy.MAX_FILE_BYTES / 3) * 4 ||
        file.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) {
      throw invalid("An attachment could not be read. Select the document again.");
    }
    const bytes = Buffer.from(file.data, "base64");
    if (bytes.length !== file.size || bytes.toString("base64") !== file.data) throw invalid("An attachment has an invalid size or encoding.");
    const extension = policy.extension(file.name);
    // Basic format checks only, not malware scanning or full document parsing.
    if (extension === "pdf" && bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw invalid("The PDF document has an invalid file header.");
    if (extension === "docx" && (bytes.length < 4 || bytes.readUInt32LE(0) !== 0x04034b50 ||
        !bytes.includes(Buffer.from("[Content_Types].xml")) || !bytes.includes(Buffer.from("word/document.xml")))) {
      throw invalid("The Word document must be a valid .docx file.");
    }
    if (extension === "txt") {
      try {
        if (bytes.includes(0)) throw new Error();
        new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch { throw invalid("Text documents must contain UTF-8 text, not binary data."); }
    }
    return { id: randomUUID(), name: file.name, size: bytes.length, type: policy.types[extension], bytes };
  });
}

function createAttachmentStore(directory) {
  function filePath(id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw invalid("Attachment not found.", 404);
    return path.join(directory, id);
  }
  async function remove(ids) {
    for (const id of ids) {
      try { await fs.unlink(filePath(id)); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  async function save(files) {
    if (!files.length) return [];
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const written = [];
    try {
      for (const file of files) {
        const handle = await fs.open(filePath(file.id), "wx", 0o600);
        written.push(file.id);
        try { await handle.writeFile(file.bytes); } finally { await handle.close(); }
      }
    } catch (error) {
      await remove(written);
      throw error;
    }
    return files.map(({ bytes, ...metadata }) => metadata);
  }
  return { save, remove, read: (id) => fs.readFile(filePath(id)) };
}

module.exports = { prepareAttachments, createAttachmentStore };
