import './BoardPlay.css';
import { useEffect, useState } from "react";
import { getPgnAtMove, HydratedChessComArchive } from "./ChessComArchive";
import { Line } from 'react-chartjs-2';
import { Chessboard, CustomSquareStyles } from "react-chessboard";
import { Button, Grid, IconButton, Tooltip } from "@mui/material";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { StockfishService, StockfishState } from "./stockfishService";
import { useKeyPress } from './ReactHelpers';
import { ArchiveMoveDescription } from './ArchiveMoveDescription';
import { VariantLine } from './VariantLine';
import { Chess, ChessInstance, Square } from './libs/chess.js';
import { Link } from "react-router-dom";

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
  const [gameSanListNoSpoiler, setGameSanListNoSpoiler] = useState<string[]>([]);
  const [interestMoves, setInterestMoves] = useState<{ gameId: number, moveId: number }[]>([]);
  const [interestMoveId, setInterestMoveId] = useState<number | null>();
  const [quizzMode, setQuizzMode] = useState<boolean>(true);
  const [customSquareStyles, setCustomSquareStyles] = useState<CustomSquareStyles>({});
  const [customArrows, setCustomArrows] = useState<Square[][]>([]);

  const [showTips, setShowTips] = useState<boolean>(false);
  const [showSolution, setShowSolution] = useState<boolean>(false);

  const [sf, setSf] = useState<StockfishService>(new StockfishService(sfDepth));

  const leftPress = useKeyPress("ArrowLeft");
  const rightPress = useKeyPress("ArrowRight");

  useEffect(() => {
    if (!props.hydratedArchives || props.hydratedArchives.length == 0) {
      return;
    }
    (async () => {
      await sf.setup();

      setArchive(props.hydratedArchives![0]);

      let interestMoves: { gameId: number, moveId: number }[] = [];
      for (const [i, archive] of Array.from(props.hydratedArchives!.entries()).reverse()) {
        for (let missedGain of archive.missedGainPlayer) {
          interestMoves.push({ gameId: i, moveId: missedGain - 2 });
        }
      }
      setInterestMoves(interestMoves);

      // Sey the interest move Id to 0 to start
      setInterestMoveId(0);
    })();
  }, []);

  useEffect(() => {
    if (interestMoves.length <= 0 || interestMoveId == undefined)
      return;

    const interestMove = interestMoves[interestMoveId];
    setArchive(props.hydratedArchives![interestMove.gameId]);
    setCurrMoveBoxed(interestMove.moveId);
  }, [interestMoveId]);

  useEffect(() => {
    if (archive && rightPress) {
      setCurrMoveBoxed(currMove + 1)
    }
  }, [rightPress]);

  useEffect(() => {
    if (archive && leftPress) {
      setCurrMoveBoxed(currMove - 1)
    }
  }, [leftPress]);

  useEffect(() => {
    // Main line analysis
    if (!archive) {
      return;
    }

    var boardCopy = new Chess(board.fen());

    let currMainLineSan = [];

    for (const move of currMainLine) {
      var res = boardCopy.move(move, { sloppy: true });
      if (!res) {
        console.error("this should not have happen !!", board.fen(), "|", move)
        break;
      }

      currMainLineSan.push(res.san);
    }

    setCurrMainLineSan(currMainLineSan);
  }, [currMainLine]);


  useEffect(() => {
    // Set board
    if (!archive) {
      return;
    }

    let board = new Chess();
    let gameSanList: string[] = [];

    for (const move of archive.moves) {
      var res = board.move(move, { sloppy: true });
      if (!res) {
        console.error("this should not have happen !!", board.fen(), "|", move)
        break;
      }

      gameSanList.push(res.san);
    }

    setGameSanList(gameSanList);
  }, [archive]);

  useEffect(() => {
    if (!gameSanList || gameSanList.length == 0) {
      setGameSanListNoSpoiler([]);
      return;
    }

    if (!interestMoves || interestMoves.length == 0 || interestMoveId == undefined) {
      setGameSanListNoSpoiler(gameSanList);
      return;
    }

    setGameSanListNoSpoiler(gameSanList.slice(0, interestMoves[interestMoveId].moveId + 1));

  }, [gameSanList, interestMoves, interestMoveId]);

  useEffect(() => {
    if (!archive)
      return

    // Reset the main line that we will compute again
    setCurrMainLine([]);
    setCurrScore(0);

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
      }, true);

      sf.computeFen(gameCopy.fen());
      setBoard(gameCopy);
    })();
  }, [archive, currMove]);

  useEffect(() => {
    if (!currMainLineSan || currMainLineSan.length == 0 || !showTips)
      return;

    const move = board.sloppy_move_to_move(currMainLineSan[0]);
    if (move)
      setCustomSquareStyles({ [move.from]: { backgroundColor: 'green' } });
  }, [showTips]);

  useEffect(() => {
    if (!currMainLineSan || currMainLineSan.length == 0 || !showSolution)
      return;

    const move = board.sloppy_move_to_move(currMainLineSan[0]);
    if (move)
      setCustomArrows([[move.from, move.to]])
  }, [showSolution]);

  function setCurrMoveBoxed(i: number) {
    if (!archive || (quizzMode && interestMoveId == undefined))
      return;

    setCustomSquareStyles({});
    setCustomArrows([]);
    setShowTips(false);
    setShowSolution(false);

    let newCurrMove = Math.max(0, Math.min(i, quizzMode ? interestMoves[interestMoveId!].moveId : archive.moves.length - 1))
    setCurrMove(newCurrMove);
  }

  function onDrop(sourceSquare: Square, targetSquare: Square) {
    const gameCopy = { ...board };
    const move = gameCopy.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return false;

    // Not the right move
    if (move.san != currMainLineSan[0]) {
      gameCopy.undo();
      setCustomSquareStyles({ [move.from]: { backgroundColor: 'red' }, [move.to]: { backgroundColor: 'red' } });
    } else {
      setCustomSquareStyles({ [move.from]: { backgroundColor: 'green' }, [move.to]: { backgroundColor: 'green' } });
      setQuizzMode(false);
    }

    setBoard(gameCopy);
    return true;
  }


  function getSanCellClass(scoreIndex: number) {
    let classes = []
    if (archive?.missedGainPlayer.includes(scoreIndex + 1)) {
      classes.push("san-cell-missed-gain");
    }
    else if (archive?.mistakesPlayer.includes(scoreIndex + 1)) {
      classes.push("san-cell-mistake")
    }

    if (currMove == scoreIndex) {
      classes.push("san-cell-current")
    }
    return classes.join(" ");
  }

  function getPointColor(scoreIndex: number, missedGainPlayer: number[], mistakesPlayer: number[], currMove: number) {
    if (missedGainPlayer.includes(scoreIndex + 1)) {
      return "#F2B14F"
    }
    if (mistakesPlayer.includes(scoreIndex + 1)) {
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
              display: true,
            },
            suggestedMin: -10,
            suggestedMax: 10,
          },
        },
        onClick: (evt: any, activeElements: any, chart: any) => {
          if (activeElements && activeElements.length) {
            setCurrMoveBoxed(activeElements[0].index);
          }
        }
      }
    };
  }

  return (
    <div>
      {props.hydratedArchives && props.hydratedArchives.length ? <>
        <Grid container direction="column" alignItems="center" justifyContent="space-around">
          {data ? <div style={{ width: "800px", height: "150px" }}>
            <Line
              datasetIdKey='id'
              data={data}
              options={data.options}
            />
          </div> : null}
          <Grid container direction="row" alignItems="start" justifyContent="start">
            <Grid container direction="column" alignItems="center" justifyContent="space-around" sx={{ width: 500 }}>
              <Chessboard
                position={board.fen()}
                onPieceDrop={onDrop}
                animationDuration={100}
                customArrowColor={'rgba(21, 120, 27)'}
                boardOrientation={archive?.playingWhite ? 'white' : 'black'}
                customSquareStyles={customSquareStyles}
                customArrows={customArrows}
                boardWidth={500}
              />
            </Grid>
            <Grid container direction="row" alignItems="start" justifyContent="start" sx={{ width: 300, height: 500 }}>
              <Grid>
                {!quizzMode ? <VariantLine currMainLineSan={currMainLineSan} currScore={currScore} currMove={currMove}></VariantLine> : <div className="quizz-indication">{archive?.playingWhite ? 'White' : 'Black'} to play, find the best move</div>}
              </Grid>
              <Grid container direction="row" alignItems="start" justifyContent="start" sx={{ height: 380, overflow: "hidden", overflowY: "auto" }}>
                <Grid container direction="row" alignItems="start" justifyContent="start">
                  {(quizzMode ? gameSanListNoSpoiler : gameSanList).map((x, i) =>
                    <Grid sx={{ width: 140, height: 30 }} className={"lichess-font san-cell " + getSanCellClass(i)} key={i} onClick={() => setCurrMoveBoxed(i)}>{x}</Grid>
                  )}
                </Grid>
              </Grid>
              <Grid container direction="row" alignItems="center" justifyContent="space-evenly" sx={{ height: 50 }}>
                <IconButton color="primary" aria-label="previous move" component="span" onClick={() => setCurrMoveBoxed(currMove - 1)} disabled={!archive || currMove == 0}>
                  <ArrowBackIosIcon />
                </IconButton>
                <IconButton color="primary" aria-label="play moves" component="span">
                  <PlayArrowIcon />
                </IconButton>
                <Tooltip title={quizzMode && currMove == interestMoves[interestMoveId!]?.moveId ? "Solve the problem to see the rest of the game" : ""} arrow>
                  <span>
                    <IconButton color="primary" aria-label="next move" component="span" onClick={() => setCurrMoveBoxed(currMove + 1)} disabled={!archive || currMove >= (quizzMode ? interestMoves[interestMoveId!].moveId : archive.moves.length - 1)}>
                      <ArrowForwardIosIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Grid>
            </Grid>
          </Grid>
          {archive ? <ArchiveMoveDescription archive={archive} moveId={currMove}></ArchiveMoveDescription> : null}
          <Grid container direction="row" alignItems="center" justifyContent="space-evenly" sx={{ height: 50 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Button variant="contained">Back to Analysis</Button>
            </Link>
            <Button aria-label="previous move" component="span" onClick={() => { setInterestMoveId(interestMoveId! - 1); setQuizzMode(true); }} disabled={interestMoveId == 0 || interestMoveId == undefined}>
              Previous
            </Button>
            <Button variant="contained" aria-label="next move" component="span" onClick={() => { setInterestMoveId(interestMoveId! + 1); setQuizzMode(true); setShowTips(false); setShowSolution(false); }} disabled={interestMoveId == interestMoves.length - 1 || interestMoveId == undefined}>
              Next
            </Button>
            {!showTips ? <IconButton color="primary" aria-label="tips" component="span" onClick={() => { setShowTips(true); }} disabled={!currMainLineSan || currMainLineSan.length == 0}>
              <TipsAndUpdatesIcon />
            </IconButton> : null}
            {showTips ? <IconButton color="primary" aria-label="tips" component="span" onClick={() => { setShowSolution(true) }} disabled={showSolution || !currMainLineSan || currMainLineSan.length == 0}>
              <QuestionMarkIcon />
            </IconButton> : null}
          </Grid>
        </Grid>
      </> : null}
    </div>
  )

}