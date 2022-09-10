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
  "accuracies": { // player's accuracies, if they were previously calculated
    "white": number,
    "black": number
  },
  "url": string, // URL of this game
  "fen": string, // final FEN
  "pgn": string, // final PGN
  "start_time": number, // timestamp of the game start (Daily Chess only)
  "time_class": TimeClass, // "blitz", "bullet"
  "end_time": number, // timestamp of the game end
  "time_control": string, // PGN-compliant time control
  "rules": string, // game variant information (e.g., "chess960")
  "tournament": string, //URL pointing to tournament (if available),
  "match": string, //URL pointing to team match (if available)
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
    case "abandoned": return 0;
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

export type HydratedChessComArchive = ChessComArchive & {
  opening: string,
  playingWhite: boolean,
  result: GameResultsCode,
  eco: string
  cleanedPgn: string;
  scoreOutOfOpening: number;
  whiteTimes: number[],
  blackTimes: number[],
}

export type TimeClass = "blitz" | "bullet" | "rapid"