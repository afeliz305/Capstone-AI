// One shared allowlist for the Node server and the safe public upload package.
module.exports = new Set([
  "index.html", "pages/staff.html",
  "css/styles.css", "css/staff.css", "css/capstone-chat.css",
  "css/images/FIU_mark_white.svg", "css/images/icons.svg", "css/fonts/mulish-var.woff2",
  "css/images/capstone-chat.svg",
  "js/shared/api-client.js", "js/shared/contact-policy.js", "js/shared/attachment-policy.js",
  "js/chat/capstone-chat.js", "js/staff/staff.js",
  "js/staff/staff-view.js", "js/staff/ticket-workspace.js"
]);
