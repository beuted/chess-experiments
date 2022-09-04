type Stockfish = {
  addMessageListener(fn: (line: string) => void): void;
  postMessage(msg: string): void;
  ready: Promise<any>;
}

declare const Stockfish: () => Stockfish;

export type StockfishState = {
  scoreEvolution: number[];
  blunderMoves: { white: number[], back: number[] };
  criticalMoves: { white: number[], back: number[] };
}

export class StockfishService {

  private sf: Stockfish | null = null;
  private depth = 15;
  private whiteToPlay = true;

  private scoreEvolution: number[] = [];
  private blunderMoves: { white: number[], back: number[] } = { white: [], back: [] };
  private criticalMoves: { white: number[], back: number[] } = { white: [], back: [] };
  private computationRunning: number = 0;

  constructor(depth: number) {
    this.scoreEvolution = [];
    this.depth = depth;
  }

  async init(updateState: (state: StockfishState) => void): Promise<any> {
    this.sf = await Stockfish();

    this.sf.addMessageListener((line: string) => {
      var params = line.split(' ');

      if ((line.startsWith(`info depth ${this.depth} seldepth`) || line.startsWith(`info depth 0`)) && params[10] != 'upperbound' && params[10] != 'lowerbound') {
        this.computationRunning--;

        if (params.includes('cp')) {
          this.scoreEvolution.unshift(Number(params[9]) * (this.whiteToPlay ? 1 : -1));
        } else if (params.includes('mate')) {
          this.scoreEvolution.unshift(2000 * Math.sign(Number(params[9])) * (this.whiteToPlay ? 1 : -1));
        } else {
          console.error("cannot parse line " + line);
        }
        updateState({ scoreEvolution: this.scoreEvolution, blunderMoves: this.blunderMoves, criticalMoves: this.criticalMoves });

        this.whiteToPlay = !this.whiteToPlay;
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
    this.scoreEvolution = [];
  }

  get isReady() {
    return this.computationRunning === 0;
  }

  computeFen(fen: string): void {
    this.computationRunning++;
    this.sf?.postMessage("position fen " + fen);
    this.sf?.postMessage(`go depth ${this.depth}`);
  }

  computeExtraAnalytics(): StockfishState {
    let whiteToPlay = true;
    let lastMoveScore = this.scoreEvolution[0];
    for (let i = 0; i < this.scoreEvolution.length; i++) {
      // Detect Blunders only when this is the player's turn
      if (whiteToPlay && lastMoveScore > this.scoreEvolution[i] + 100) {
        this.blunderMoves.white.push(i);
      } else if (!whiteToPlay && lastMoveScore < this.scoreEvolution[i] + 100) {
        this.blunderMoves.back.push(i);
      } else if (whiteToPlay && lastMoveScore < this.scoreEvolution[i] + 100) {
        this.criticalMoves.white.push(i);
      } else if (!whiteToPlay && lastMoveScore > this.scoreEvolution[i] + 100) {
        this.criticalMoves.back.push(i);
      }
      lastMoveScore = this.scoreEvolution[i];

      whiteToPlay = !whiteToPlay;
    }

    return { scoreEvolution: this.scoreEvolution, blunderMoves: this.blunderMoves, criticalMoves: this.criticalMoves };

  }
}