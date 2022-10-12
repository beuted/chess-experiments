const process = require("process");
const fs = require("fs");
const readline = require("readline");
const Stockfish = require("./stockfish.js");

const UCI_EVAL_FILE = process.env.UCI_EVAL_FILE;

async function runRepl(stockfish) {
  const iface = readline.createInterface({ input: process.stdin });
  for await (const command of iface) {
    if (command == "quit") {
      break;
    }
    stockfish.postMessage(command);
  }
  stockfish.postMessage("quit");
}

async function main(argv) {
  const stockfish = await Stockfish();
  const FS = stockfish.FS;
  if (UCI_EVAL_FILE) {
    const buffer = await fs.promises.readFile(UCI_EVAL_FILE);
    const filename = "/__UCI_EVAL_FILE__.nnue";
    const file = FS.open(filename, "w");
    FS.write(file, buffer, 0, buffer.length);
    FS.close(file);
    stockfish.postMessage(`setoption name EvalFile value ${filename}`);
  }
  if (argv.length > 0) {
    const commands = argv.join(" ").split("++");
    for (const command of commands) {
      stockfish.postMessage(command);
    }
    stockfish.postMessage("quit");
    return;
  }
  runRepl(stockfish);
}

if (require.main === module) {
  main(process.argv.slice(2));
}
