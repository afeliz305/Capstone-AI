const readline = require("node:readline");
const { Writable } = require("node:stream");
const { STAFF, memberFor, setStaffPassword } = require("../lib/staff-auth");

async function main() {
  if (!process.stdin.isTTY) throw new Error("Run this command in your own interactive terminal. Passwords are not accepted as command-line arguments.");
  if (process.argv.length > 3) throw new Error("Pass only the email address, never a password on the command line.");
  let muted = false;
  const output = new Writable({ write(chunk, encoding, next) { if (!muted) process.stdout.write(chunk, encoding); next(); } });
  const terminal = readline.createInterface({ input: process.stdin, output, terminal: true });
  const ask = (prompt) => new Promise((resolve) => terminal.question(prompt, resolve));
  const hidden = async (prompt) => {
    process.stdout.write(prompt);
    muted = true;
    const answer = await ask("");
    muted = false;
    process.stdout.write("\n");
    return answer;
  };
  terminal.on("SIGINT", () => { process.stdout.write("\nCancelled.\n"); terminal.close(); process.exit(130); });
  try {
    console.log("Set a local Capstone staff password. Do not use your FIU password.");
    let member = memberFor(process.argv[2]);
    if (!process.argv[2]) {
      STAFF.forEach((staff, index) => console.log(`${index + 1}. ${staff.name} (${staff.email})`));
      member = STAFF[Number(await ask("Staff number: ")) - 1];
    }
    if (!member) throw new Error("Choose one of the six staff accounts.");
    console.log(`Account: ${member.name} (${member.email})`);
    const password = await hidden("New prototype password (12–128 characters; typing is hidden): ");
    const confirmation = await hidden("Confirm password: ");
    if (password !== confirmation) throw new Error("Passwords did not match. Nothing was changed.");
    await setStaffPassword(member.email, password);
    console.log(`Password saved for ${member.name}. You can now sign in at http://localhost:3000/staff.html.`);
  } finally { terminal.close(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
