import { Chess, PieceColor, PieceType, Square } from "chess.js";
import { useEffect } from "react";
import { getPgnAtMove, getResult, HydratedChessComArchive } from "./ChessComArchive"

type EndGameProps = { archives: HydratedChessComArchive[] | undefined }

export function EndGame(props: EndGameProps) {

  function getPiecesFromBoard(board: Array<Array<{ type: PieceType; color: PieceColor; square: Square } | null>>) {
    let whitePieces: PieceType[] = [];
    let blackPieces: PieceType[] = [];

    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[0].length; j++) {
        if (!board[i][j] || !board[i][j]?.type) {
          continue;
        }

        let pieces;
        if (board[i][j]?.color == 'w') {
          pieces = whitePieces;
        } else {
          pieces = blackPieces;
        }

        pieces.push(board[i][j]?.type as PieceType)
      }
    }

    return { whitePieces, blackPieces }
  }

  enum Final {
    NoFinal = 0,
    EvenPawnFinal = 1,
    RookFinal = 2,
    QueenFinal = 3,
    KingAndPawnVersusKing = 4,
    BishopFinal = 5,
    BishopKnightFinal = 6,
    KnightFinal = 7,
    KingAndRookVersusKing = 8,
    KingAndQueenVersusKing = 9,
  }

  function isWinningFinal(final: Final): boolean {

    return [Final.KingAndPawnVersusKing, Final.KingAndRookVersusKing, Final.KingAndQueenVersusKing].includes(final);
  }

  function getFinalName(final: Final): string {
    switch (final) {
      case Final.NoFinal: return "None";
      case Final.EvenPawnFinal: return "Pawn final";
      case Final.RookFinal: return "Rook final";
      case Final.QueenFinal: return "Queen final";
      case Final.BishopFinal: return "Bishop final";
      case Final.BishopKnightFinal: return "Bishop and knight final";
      case Final.KnightFinal: return "knight final";
      case Final.KingAndPawnVersusKing: return "King and pawn versus King final";
      case Final.KingAndRookVersusKing: return "King and rook versus King final";
      case Final.KingAndQueenVersusKing: return "King and queen versus King final";

    }
  }

  function getFinal(playerPieces: PieceType[], opponentPieces: PieceType[]) {
    let playerQueens = 0;
    let opponentQueens = 0;
    let playerRooks = 0;
    let opponentRooks = 0;
    let playerBishops = 0;
    let opponentBishops = 0;
    let playerKnights = 0;
    let opponentKnights = 0;
    let playerPawns = 0;
    let opponentPawns = 0;

    for (let piece of playerPieces) {
      if (piece === 'q')
        playerQueens++;
      if (piece === 'r')
        playerRooks++;
      if (piece === 'b')
        playerBishops++;
      if (piece === 'n')
        playerKnights++;
      if (piece === 'p')
        playerPawns++;
    }

    for (let piece of opponentPieces) {
      if (piece === 'q')
        opponentQueens++;
      if (piece === 'r')
        opponentRooks++;
      if (piece === 'b')
        opponentBishops++;
      if (piece === 'n')
        opponentKnights++;
      if (piece === 'p')
        opponentPawns++;
    }

    if (playerQueens === 0 && opponentQueens === 0 && playerRooks === 0 && opponentRooks === 0 && playerBishops === 0 && opponentBishops === 0 && playerKnights === 0 && opponentKnights === 0 && playerPawns >= 1 && opponentPawns === 0) {
      return Final.KingAndPawnVersusKing;
    }
    if (playerQueens === 0 && opponentQueens === 0 && playerRooks === 0 && opponentRooks === 0 && playerBishops === 0 && opponentBishops === 0 && playerKnights === 0 && opponentKnights === 0 && playerPawns === opponentPawns) {
      return Final.EvenPawnFinal;
    }
    if (playerQueens === 0 && opponentQueens === 0 && playerRooks === opponentRooks && playerBishops === 0 && opponentBishops === 0 && playerKnights === 0 && opponentKnights === 0 && playerPawns === opponentPawns) {
      return Final.RookFinal;
    }
    if (playerQueens === 1 && opponentQueens === 1 && playerRooks === 0 && opponentRooks === 0 && playerBishops === 0 && opponentBishops === 0 && playerKnights === 0 && opponentKnights === 0 && playerPawns === opponentPawns) {
      return Final.QueenFinal;
    }
    if (playerQueens === 0 && opponentQueens === 0 && playerRooks === 0 && opponentRooks === 0 && playerBishops === opponentBishops && playerKnights === 0 && opponentKnights === 0 && playerPawns === opponentPawns) {
      return Final.BishopFinal;
    }
    if (playerQueens === 0 && opponentQueens === 0 && playerRooks === 0 && opponentRooks === 0 && playerBishops === 0 && opponentBishops === 0 && playerKnights === opponentKnights && playerPawns === opponentPawns) {
      return Final.KnightFinal;
    }
    if (playerQueens === 0 && opponentQueens === 0 && playerRooks === 0 && opponentRooks === 0 && playerBishops === opponentBishops && playerKnights === opponentKnights && playerPawns === opponentPawns) {
      return Final.BishopKnightFinal;
    }
    if (playerQueens >= 1 && opponentQueens === 0 && playerRooks === 0 && opponentRooks === 0 && playerBishops === 0 && opponentBishops === 0 && playerKnights === 0 && opponentKnights === 0 && playerPawns === opponentPawns) {
      return Final.KingAndQueenVersusKing;
    }
    if (playerQueens === 0 && opponentQueens === 0 && playerRooks >= 1 && opponentRooks === 0 && playerBishops === 0 && opponentBishops === 0 && playerKnights === 0 && opponentKnights === 0 && playerPawns === opponentPawns) {
      return Final.KingAndRookVersusKing;
    }

    return Final.NoFinal;
  }

  useEffect(() => {
    if (!props.archives || props.archives.length === 0)
      return;
    const chess = new Chess();
    let final: Final = Final.NoFinal

    for (let archive of props.archives) {
      chess.load_pgn(archive.cleanedPgn);
      do {
        let board = chess.board();

        let { whitePieces, blackPieces } = getPiecesFromBoard(board);

        final = archive.playingWhite ? getFinal(whitePieces, blackPieces) : getFinal(blackPieces, whitePieces);
        if (final !== Final.NoFinal) {
          // We set this as a final if the score is either nulle or defeat if not we go further back
          if (!isWinningFinal(final) || [-1, 0].includes(getResult(archive.result)))
            break;
        }

      } while (chess.undo() != null)

      if (final != Final.NoFinal)
        console.log(getFinalName(final), archive.url);
    }

  }, [props.archives]);

  return (
    props.archives && props.archives.length > 0 ?
      <>
        <h2>End Game</h2>
        <div>WIP</div>
      </> : null
  )
}