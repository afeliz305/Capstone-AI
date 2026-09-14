const path = require("node:path");
const { seedSampleTickets } = require("../lib/sample-tickets");

if (process.env.NODE_ENV === "production") {
  console.error("Sample ticket generation is disabled in production.");
  process.exitCode = 1;
} else if (!process.argv.includes("--server-stopped")) {
  console.error("Stop the local server first, then run: npm.cmd run tickets:seed -- --server-stopped");
  process.exitCode = 1;
} else {
  const file = process.env.CAPSTONE_DATA_FILE ? path.resolve(process.env.CAPSTONE_DATA_FILE) : path.join(__dirname, "../data/tickets.json");
  seedSampleTickets(file).then((result) => {
    console.log(result.added ? `Added ${result.resolved} resolved examples and ${result.open} open test tickets. Queue total: ${result.total}.` : "This sample batch is already present. No tickets were added or changed.");
    if (result.backup) console.log("Previous queue backed up locally: " + result.backup);
    console.log("Start the app, sign in to Staff queue, and choose All team tickets.");
  }).catch((error) => { console.error("Sample tickets could not be imported: " + error.message); process.exitCode = 1; });
}
