import { Card, Grid, Tooltip } from "@mui/material";
import { ChartData } from "chart.js";
import { PieceColor, PieceType, Square } from "chess.js";
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { getResult, HydratedChessComArchive } from "./ChessComArchive"
import InfoIcon from '@mui/icons-material/Info';
import { GridFilterModel } from "@mui/x-data-grid";
import FilterAltIcon from '@mui/icons-material/FilterAlt';


type EndGameProps = { archives: HydratedChessComArchive[] | undefined, setTableFilters: (filters: GridFilterModel) => void }

export function EndGame(props: EndGameProps) {
  const [wonOpenningDataChart, setWonOpenningDataChart] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);
  const [otherOpenningDataChart, setOtherOpenningDataChart] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);

  function setFinalFilter(final: string | undefined): any {
    if (!final)
      return;

    props.setTableFilters({
      items: [{ columnField: 'final', operatorValue: 'contains', value: final }],
    });

    // Scroll to the table
    const section = document.querySelector('#games-table');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setWinningFinalFilter(final: string | undefined): any {
    if (!final)
      return;

    props.setTableFilters({
      items: [{ columnField: 'winningFinal', operatorValue: 'contains', value: final }],
    });

    // Scroll to the table
    const section = document.querySelector('#games-table');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    if (!props.archives || props.archives.length === 0)
      return;


    // Winning finals
    let wonOpenningDataChart = [];

    let winningFinalResults: { [key: number]: { win: number, lose: number, draw: number } } = {};
    for (let archive of props.archives) {

      if (archive.winningFinal === Final.NoFinal || archive.winningFinal === undefined)
        continue;

      const result = getResult(archive.result);
      if (!winningFinalResults[archive.winningFinal])
        winningFinalResults[archive.winningFinal] = { win: 0, lose: 0, draw: 0 };

      if (result == 1) {
        winningFinalResults[archive.winningFinal].win++;
      } else if (result == -1) {
        winningFinalResults[archive.winningFinal].lose++;
      } else if (result == 0) {
        winningFinalResults[archive.winningFinal].draw++;
      }
    }

    for (var kvp of Object.entries(winningFinalResults)) {
      const openingResultData = getPieData(getFinalName(Number(kvp[0]) as Final), kvp[1].win, kvp[1].draw, kvp[1].lose, '#F2B14F');
      wonOpenningDataChart.push(openingResultData);
    }

    // Other finals
    let otherOpenningDataChart = [];
    let otherFinalResults: { [key: number]: { win: number, lose: number, draw: number } } = {};

    for (let archive of props.archives) {

      if (archive.final === Final.NoFinal || archive.final === undefined || isWinningFinal(archive.final))
        continue;

      const result = getResult(archive.result);
      if (!otherFinalResults[archive.final])
        otherFinalResults[archive.final] = { win: 0, lose: 0, draw: 0 };

      if (result == 1) {
        otherFinalResults[archive.final].win++;
      } else if (result == -1) {
        otherFinalResults[archive.final].lose++;
      } else if (result == 0) {
        otherFinalResults[archive.final].draw++;
      }
    }

    for (var kvp of Object.entries(otherFinalResults)) {
      const openingResultData = getPieData(getFinalName(Number(kvp[0]) as Final), kvp[1].win, kvp[1].draw, kvp[1].lose, "#DEDEDE");
      otherOpenningDataChart.push(openingResultData);
    }


    setWonOpenningDataChart(wonOpenningDataChart);
    setOtherOpenningDataChart(otherOpenningDataChart);
  }, [props.archives]);

  return (
    props.archives && props.archives.length > 0 ?
      <Card variant="outlined" sx={{ py: 3, width: "100%", maxWidth: 1200 }}>
        <h2 className="card-title">End Game</h2>
        <div>
          <h3>Winning finals <Tooltip title="These are finals that you were suppose to win" arrow><InfoIcon></InfoIcon></Tooltip></h3>
          <Grid container className="end-games-container">
            {wonOpenningDataChart.map(x =>
              <div
                className="filter-on-click"
                key={x.datasets[0].label}
                style={{ width: "180px", }}>
                <Tooltip title="Filter below table on the draw and loss for this type of final that you were suppose to win" arrow><FilterAltIcon className="pie-filter-button" onClick={() => setWinningFinalFilter(x.datasets[0].label)}></FilterAltIcon></Tooltip>
                <Pie data={x} options={x.options} />
              </div>
            )}
          </Grid>
          <h3>Standard finals <Tooltip title="These are standard finals that could have gone either way" arrow><InfoIcon></InfoIcon></Tooltip></h3>
          <Grid container className="end-games-container">
            {otherOpenningDataChart.map(x =>
              <div
                className="filter-on-click"
                key={x.datasets[0].label}
                style={{ width: "180px" }}>
                <Tooltip title="Filter below table on this type of final" arrow><FilterAltIcon className="pie-filter-button" onClick={() => setFinalFilter(x.datasets[0].label)}></FilterAltIcon></Tooltip>
                <Pie data={x} options={x.options} />
              </div>
            )}
          </Grid>
        </div>
      </Card> : null
  )
}

export enum Final {
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

export function isWinningFinal(final: Final): boolean {

  return [Final.KingAndPawnVersusKing, Final.KingAndRookVersusKing, Final.KingAndQueenVersusKing].includes(final);
}

export function getFinalName(final: Final): string {
  switch (final) {
    case Final.NoFinal: return "None";
    case Final.EvenPawnFinal: return "Pawn final";
    case Final.RookFinal: return "Rook final";
    case Final.QueenFinal: return "Queen final";
    case Final.BishopFinal: return "Bishop final";
    case Final.BishopKnightFinal: return "Bishop and knight";
    case Final.KnightFinal: return "knight final";
    case Final.KingAndPawnVersusKing: return "King and pawn versus King";
    case Final.KingAndRookVersusKing: return "King and rook versus King";
    case Final.KingAndQueenVersusKing: return "King and queen versus King";

  }
}

export function getFinal(playerPieces: PieceType[], opponentPieces: PieceType[]) {
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

export function getPiecesFromBoard(board: Array<Array<{ type: PieceType; color: PieceColor; square: Square } | null>>) {
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

function getPieData(label: string, win: number, draw: number, lose: number, drawColor: string) {
  return {
    labels: ['Win', 'Draw', 'Lose'],
    datasets: [
      {
        label: label,
        data: [win, draw, lose],
        backgroundColor: [
          '#7DCBBC',
          drawColor,
          '#D36446',
        ],
        borderWidth: 0,
      },
    ],
    options: {
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: label
        }
      },
      elements: {
        arc: {
          borderWidth: 0
        }
      }
    }
  }
}