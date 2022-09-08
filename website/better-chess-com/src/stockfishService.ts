type Stockfish = {
  addMessageListener(fn: (line: string) => void): void;
  postMessage(msg: string): void;
  ready: Promise<any>;
}

declare const Stockfish: () => Stockfish;

export type StockfishState = {
  scores: number[];
}

export class StockfishService {

  private sf: Stockfish | null = null;
  private depth = 15;

  private computationRunning: number = 0;
  private scores: number[] = [];

  constructor(depth: number) {
    this.depth = depth;
  }

  async init(updateState: (state: StockfishState) => void): Promise<any> {
    this.sf = await Stockfish();

    this.sf.addMessageListener((line: string) => {
      var params = line.split(' ');

      if ((line.startsWith(`info depth ${this.depth} seldepth`) || line.startsWith(`info depth 0`)) && params[10] != 'upperbound' && params[10] != 'lowerbound') {
        //console.warn(line);

        this.computationRunning--;
        let score = 0;
        if (params.includes('cp')) {
          score = Number(params[9]);
        } else if (params.includes('mate')) {
          score = 2000; //TODO I think if the black mate this should be -2000 how do we know that ?
        } else {
          console.error("cannot parse line " + line);
        }
        this.scores.push(score);

        updateState({ scores: this.scores });
      }
    });

    // tell the engine to switch to UCI mode
    this.sf.postMessage("uci");
    // GUI: set hash to 32 MB
    this.sf.postMessage("setoption name Hash value 32");
    // GUI: waiting for the engine to finish initializing
    this.sf.postMessage("isready");
    // GUI: let the engine know if starting a new game
    this.sf.postMessage("ucinewgame");
  }

  reset() {
    this.scores = [];
  }

  get isReady() {
    return this.computationRunning === 0;
  }

  computeFen(fen: string): void {
    console.log("compute " + fen);
    this.computationRunning++;
    this.sf?.postMessage("position fen " + fen);
    this.sf?.postMessage(`go depth ${this.depth}`);
  }

}