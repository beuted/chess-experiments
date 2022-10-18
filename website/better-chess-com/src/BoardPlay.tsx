import './BoardPlay.css';
import { useEffect, useState } from "react";
import { getPgnAtMove, HydratedChessComArchive } from "./ChessComArchive";
import { Line } from 'react-chartjs-2';
import { Chessboard } from "react-chessboard";
import { Chess, ChessInstance, ShortMove, Square } from "chess.js";
import { Grid, IconButton } from "@mui/material";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { StockfishService, StockfishState } from "./stockfishService";

type BoardPlayProps = { hydratedArchives: HydratedChessComArchive[] | undefined }

const sfDepth = 18;

export function BoardPlay(props: BoardPlayProps) {
  const [data, setData] = useState<any & { options: any }>();
  const [board, setBoard] = useState<ChessInstance>(new Chess());
  const [archive, setArchive] = useState<HydratedChessComArchive>();
  const [currMove, setCurrMove] = useState<number>(0);
  const [currScore, setCurrScore] = useState<number>(0);
  const [currMainLine, setCurrMainLine] = useState<string[]>([]);
  const [currMainLineSan, setCurrMainLineSan] = useState<string[]>([]);
  const [gameSanList, setGameSanList] = useState<string[]>([]);

  const [sf, setSf] = useState<StockfishService>(new StockfishService(sfDepth));

  useEffect(() => {
    if (!props.hydratedArchives || props.hydratedArchives.length == 0) {
      return;
    }
    (async () => {
      await sf.setup(true);

      setArchive(props.hydratedArchives![0]);
    })();
  }, []);


  useEffect(() => {
    if (!archive) {
      return;
    }

    var boardCopy = new Chess(board.fen());

    let currMainLineSan = [];
    var moveNumber = currMove + 4;

    if (currMainLine.length > 0 && moveNumber % 2 == 1) {
      currMainLineSan.push(`${(moveNumber - 1) / 2}.`);
    } else if (currMainLine.length > 0) {
      currMainLineSan.push(`${(moveNumber - 2) / 2}...`);
    }

    for (const move of currMainLine) {
      var res = boardCopy.move(move, { sloppy: true });
      if (!res) {
        console.error("this should not have happen !!", board.fen(), move)
        break;
      }

      currMainLineSan.push(res.san);

      if (moveNumber % 2 == 0) {
        currMainLineSan.push(`${moveNumber / 2}.`);
      }
      moveNumber++;
    }

    setCurrMainLineSan(currMainLineSan);
  }, [currMainLine]);


  useEffect(() => {
    if (!archive) {
      return;
    }

    let board = new Chess();
    let gameSanList: string[] = [];


    for (const move of archive.moves) {
      var res = board.move(move, { sloppy: true });
      if (!res) {
        console.error("this should not have happen !!", board.fen(), move)
        break;
      }

      gameSanList.push(res.san);
    }

    setGameSanList(gameSanList);
  }, [archive]);

  useEffect(() => {
    if (!archive)
      return

    // Set graph
    setData(getGraphData(archive.scores, archive.missedGainPlayer, archive.mistakesPlayer, currMove));

    // Set board
    const gameCopy = { ...board };
    let pgn = getPgnAtMove(archive.moves, currMove + 1);
    if (pgn == null)
      return;

    gameCopy.load_pgn(pgn);

    (async () => {
      await sf.init((state: StockfishState) => {
        // While we don't have computed everything move sf state don't use it
        if (state.scores.length <= 0)
          return;

        const result = state.scores[state.scores.length - 1] || 0;

        const signedResult = result * ((currMove % 2 == 0) ? -1 : 1)
        setCurrScore(signedResult);

        const mainLine = state?.mainLines?.[state.mainLines.length - 1] || [];
        setCurrMainLine(mainLine);
      });

      sf.computeFen(gameCopy.fen());
      setBoard(gameCopy);
    })();
  }, [archive, currMove]);

  function setCurrMoveBoxed(i: number) {
    if (!archive)
      return;
    let newCurrMove = Math.max(0, Math.min(i, archive.moves.length - 1))
    setCurrMove(newCurrMove);
  }

  function makeAMove(move: ShortMove) {
    const gameCopy = { ...board };
    const result = gameCopy.move(move);
    setBoard(gameCopy);
    return result; // null if the move was illegal, the move object if the move was legal
  }

  function onDrop(sourceSquare: Square, targetSquare: Square) {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return false;

    return true;
  }


  function getSanCellClass(scoreIndex: number) {
    if (archive?.missedGainPlayer.includes(scoreIndex)) {
      return "san-cell-missed-gain"
    }
    if (archive?.mistakesPlayer.includes(scoreIndex)) {
      return "san-cell-mistake"
    }
    if (currMove == scoreIndex) {
      return "san-cell-current"
    }
    return null;
  }

  function getPointColor(scoreIndex: number, missedGainPlayer: number[], mistakesPlayer: number[], currMove: number) {
    if (missedGainPlayer.includes(scoreIndex)) {
      return "#F2B14F"
    }
    if (mistakesPlayer.includes(scoreIndex)) {
      return "#D36446"
    }
    if (currMove == scoreIndex) {
      return "#7DCBBC"
    }
    return null;
  }

  function getGraphData(scores: number[], missedGainPlayer: number[], mistakesPlayer: number[], currMove: number) {
    return {
      labels: scores.map(x => ''),
      datasets: [
        {
          label: '',
          data: scores.map(x => Math.max(Math.min(x, 1000), -1000)).map(x => Number(x / 100)),
          backgroundColor: ({ dataIndex }: { dataIndex: number }) => getPointColor(dataIndex, missedGainPlayer, mistakesPlayer, currMove) || 'rgba(0, 0, 0, 0)', // Dot color
          pointBorderColor: ({ dataIndex }: { dataIndex: number }) => getPointColor(dataIndex, missedGainPlayer, mistakesPlayer, currMove) || 'rgba(0, 0, 0, 0)', // Border dot color
          borderColor: '#5f9bbc',
          tension: 0.3,
          pointRadius: ({ dataIndex }: { dataIndex: number }) => dataIndex === currMove ? 7 : 4,
          pointHoverBackgroundColor: 'green',
          pointHoverBorderColor: 'green',
        }
      ],
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (item: any) => `${Number(item.raw).toFixed(1)} `,
            },
            displayColors: false,
            bodyFont: { size: 14 },
            padding: 8,
            xAlign: 'center',
            yAlign: 'bottom'
          },
          datalabels: {
            display: false,
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
            }
          },
          y: {
            display: true,
            grid: {
              display: true
            }
          },
        },
        onClick: (evt: any, activeElements: any, chart: any) => {
          if (activeElements && activeElements.length) {
            setCurrMove(activeElements[0].index);
          }
        }
      }
    };
  }

  return (
    <div>
      <Grid container direction="column" alignItems="center" justifyContent="space-around">
        {data ? <div style={{ width: "800px", height: "150px" }}>
          <Line
            datasetIdKey='id'
            data={data}
            options={data.options}
          />
        </div> : null}
        <Grid container direction="row" alignItems="start" justifyContent="start">
          <Grid container direction="column" alignItems="center" justifyContent="space-around" sx={{ width: 600 }}>
            <Chessboard position={board.fen()} onPieceDrop={onDrop} animationDuration={100} customArrowColor={'rgba(21, 120, 27)'} />
          </Grid>
          <Grid container direction="column" alignItems="center" justifyContent="start" sx={{ width: 400, height: 600 }}>
            <Grid sx={{ my: 1, height: 50 }} className="variant-line"><b>{(currScore / 100).toFixed(2)}</b> <span className="lichess-font">{currMainLineSan.join(" ")}</span></Grid>
            <Grid container direction="row" alignItems="center" justifyContent="start" sx={{ height: 460, overflow: "hidden", overflowY: "scroll" }}>
              {gameSanList.map((x, i) =>
                <Grid sx={{ width: 190, height: 30 }} className={"lichess-font san-cell " + getSanCellClass(i)} key={i} onClick={() => setCurrMove(i)}>{x}</Grid>
              )}
            </Grid>
            <Grid container direction="row" alignItems="center" justifyContent="space-evenly" sx={{ height: 50 }}>
              <IconButton color="primary" aria-label="previous move" component="span" onClick={() => setCurrMoveBoxed(currMove - 1)} disabled={!archive || currMove == 0}>
                <ArrowBackIosIcon />
              </IconButton>
              <IconButton color="primary" aria-label="play moves" component="span">
                <PlayArrowIcon />
              </IconButton>
              <IconButton color="primary" aria-label="next move" component="span" onClick={() => setCurrMoveBoxed(currMove + 1)} disabled={!archive || currMove == archive.moves.length - 1}>
                <ArrowForwardIosIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Grid>

      </Grid>
    </div>
  )

}