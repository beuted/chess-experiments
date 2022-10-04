import { cache } from "./sfCache";
type Stockfish = {
  addMessageListener(fn: (line: string) => void): void;
  removeMessageListener(fn: (line: string) => void): void;
  postMessage(msg: string): void;
  ready: Promise<any>;
}

declare const Stockfish: () => Stockfish;

export type StockfishState = {
  scores: (number | undefined)[];
}

export class StockfishService {

  private sf: Stockfish | null = null;
  private depth = 15;

  private scores: number[] = [];
  private fens: string[] = [];
  private cb: ((line: string) => void) | null = null;

  private fenScoresCache: { [fen: string]: number } = cache;
  private updateState: (state: StockfishState) => void = () => { };

  constructor(depth: number) {
    this.depth = depth;
  }

  async setup() {
    this.sf = await Stockfish();

    // tell the engine to switch to UCI mode
    this.sf.postMessage("uci");
    // GUI: set hash to 32 MB
    this.sf.postMessage("setoption name Hash value 32");
    // GUI: waiting for the engine to finish initializing
    this.sf.postMessage("isready");
    // GUI: let the engine know if starting a new game
    this.sf?.postMessage("ucinewgame");
  }

  async init(updateState: (state: StockfishState) => void): Promise<any> {
    this.updateState = updateState;
    this.scores = [];
    this.fens = [];

    if (!!this.cb)
      this.sf?.removeMessageListener(this.cb)

    this.cb = (line: string) => {
      var params = line.split(' ');

      if ((line.startsWith(`info depth ${this.depth} seldepth`) || line.startsWith(`info depth 0`)) && params[10] != 'upperbound' && params[10] != 'lowerbound') {
        //console.warn(line);

        let score = 0;
        if (params.includes('cp')) {
          score = Number(params[9]);
        } else if (params.includes('mate')) {
          let sign = !params[9] ? -1 : Math.sign(Number(params[9])); // When Number(params[9]) == 0 or undefined we use a positive sign

          score = sign * 2000;

          //TODO I could get the info of how many move until I mate or I get matted from params[9] it looks like this:
          // 0 = I just did check mate
          // 1 = I'll get mated in 1 move
          // -1 = I can mate in 1 move
        } else {
          console.error("cannot parse line " + line);
        }

        // Push score on the first empty slot (empty slot can be created when values are in cache)
        for (let i = 0; i < this.scores.length + 1; i++) {
          if (this.scores[i] === undefined) {
            this.scores[i] = score;
            break;
          }
        }

        // Fill the cache
        if (!this.fenScoresCache[this.fens[this.scores.length - 1]])
          this.fenScoresCache[this.fens[this.scores.length - 1]] = score;

        updateState({ scores: this.scores });
      }
    }

    this.sf?.addMessageListener(this.cb);
  }

  computeFen(fen: string): void {
    this.fens.push(fen);
    // Use the cache
    if (this.fenScoresCache[fen]) {
      this.scores[this.fens.length - 1] = this.fenScoresCache[fen];
      this.updateState({ scores: this.scores });
      return;
    }

    this.sf?.postMessage("position fen " + fen);
    this.sf?.postMessage(`go depth ${this.depth}`);
  }

}