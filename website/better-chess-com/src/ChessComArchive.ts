import { Final } from "./EndGame";

export type GameResultsCode = "win" |
  "checkmated" |
  "agreed" |
  "repetition" |
  "timeout" |
  "resigned" |
  "stalemate" |
  "lose" |
  "insufficient" |
  "50move" |
  "abandoned" |
  "kingofthehill" |
  "threecheck" |
  "timevsinsufficient" |
  "bughousepartnerlose";

export type LichessPlayer = {
  provisional: boolean,
  rating: number
  user: {
    id: string,
    name: string
  }
}

export type LichessArchive = {
  clock: { initial: number, increment: number, totalTime: number }, // seconds
  createdAt: number, // timestamp
  id: string,
  lastMoveAt: number, // timestamp
  moves: string, // "e4 c6 d4 d5 e5 a6 Nf3 Bg4 h3 Bh5 g4..."
  opening: {
    eco: string
    name: string
    ply: number
  },
  perf: TimeClass,
  pgn: string,
  players: {
    white: LichessPlayer,
    black: LichessPlayer,
  },
  rated: boolean,
  speed: TimeClass
  status: "created" | "started" | "aborted" | "mate" | "resign" | "stalemate" | "timeout" | "draw" | "outoftime" | "cheat" | "noStart" | "unknownFinish" | "variantEnd",
  variant: string,
  winner: "black" | "white"
}

export type ChessComArchive = {
  "white": { // details of the white-piece player:
    "username": string, // the username
    "rating": number, // the player's rating after the game finished
    "result": GameResultsCode, // see "Game results codes" section
    "@id": string // URL of this player's profile
  },
  "black": { // details of the black-piece player:
    "username": string, // the username
    "rating": number, // the player's rating after the game finished
    "result": GameResultsCode, // see "Game results codes" section
    "@id": string // URL of this player's profile
  },
  // "accuracies": { // player's accuracies, if they were previously calculated
  //   "white": number,
  //   "black": number
  // },
  "url": string, // URL of this game
  //"fen": string, // final FEN
  "pgn": string, // final PGN
  "start_time": number, // timestamp of the game start (Daily Chess only)
  "time_class": TimeClass, // "blitz", "bullet"
  "end_time": number, // timestamp of the game end
  //"time_control": string, // PGN-compliant time control
  "rules": string, // game variant information (e.g., "chess960")
  //"tournament": string, //URL pointing to tournament (if available),
  //"match": string, //URL pointing to team match (if available)
}

export function fromLichessToChessComArchive(lichess: LichessArchive): ChessComArchive {
  return {
    white: {
      username: lichess.players.white.user.name,
      rating: lichess.players.white.rating,
      result: !lichess.winner ? "stalemate" : (lichess.winner == "white" ? "win" : "lose"), // TODO lichess.status could give more details if we need
      "@id": lichess.players.white.user.id,
    },
    black: {
      username: lichess.players.black.user.name,
      rating: lichess.players.black.rating,
      result: !lichess.winner ? "stalemate" : (lichess.winner == "black" ? "win" : "lose"), // TODO lichess.status could give more details if we need
      "@id": lichess.players.black.user.id,
    },
    url: "https://lichess.org/" + lichess.id,
    pgn: lichess.pgn,
    start_time: lichess.createdAt,
    time_class: lichess.speed,
    end_time: lichess.lastMoveAt,
    rules: lichess.variant
  }
}

export function getResult(code: GameResultsCode): -1 | 0 | 1 {
  switch (code) {
    case "win": return 1;
    case "checkmated": return -1;
    case "agreed": return 0;
    case "repetition": return 0;
    case "timeout": return -1;
    case "resigned": return -1;
    case "stalemate": return 0;
    case "lose": return -1;
    case "insufficient": return 0;
    case "50move": return 0;
    case "abandoned": return 0; // Maybe wrong ?
    case "kingofthehill": return -1;
    case "timevsinsufficient": return 0;
    case "threecheck": return 0;
    case "bughousepartnerlose": return -1;
  }
}

export function getResultAsString(code: GameResultsCode) {
  switch (getResult(code)) {
    case 1: return "Victory";
    case -1: return "Loss";
    case 0: return "Draw";
  }
}

export function getPgnAtMove(cleanedPgn: string, move: number) {
  // Load the score on move 15
  var pgnArray = cleanedPgn.split('.');
  let pgnMove15 = null;
  if (pgnArray.length <= 10)
    pgnMove15 = cleanedPgn;
  else
    pgnMove15 = pgnArray.slice(0, 10).join(".").slice(0, -3);
  return pgnMove15;
}

export type HydratedChessComArchive = ChessComArchive & {
  opening: string,
  playingWhite: boolean,
  result: GameResultsCode,
  eco: string
  cleanedPgn: string;
  scoreOutOfOpening: number;
  whiteTimes: number[],
  blackTimes: number[],
  final: Final,
  winningFinal: Final,
}

export type TimeClass = "blitz" | "bullet" | "rapid"