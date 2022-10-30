import './Preparation.css'
import { useEffect, useState } from "react";
import { getPgnAtMove, HydratedChessComArchive } from "./ChessComArchive";
import { Line } from 'react-chartjs-2';
import { Chessboard, CustomSquareStyles } from "react-chessboard";
import { Accordion, AccordionDetails, AccordionSummary, Button, Grid, IconButton, List, ListItem, ListItemText, TextField, Tooltip, Typography } from "@mui/material";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { StockfishService, StockfishState } from "./stockfishService";
import { useKeyPress } from './ReactHelpers';
import { ArchiveMoveDescription } from './ArchiveMoveDescription';
import { VariantLine } from './VariantLine';
import { Chess, ChessInstance, Move, Square } from './libs/chess.js';
import { Link } from "react-router-dom";
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SuccessAnimationIcon } from './SuccessAnimationIcon';


type PreparationProps = {}

export function Preparation(props: PreparationProps) {

  const [chapterLines, setChapterLines] = useState<{ title: string | undefined, fen: string | undefined, lines: string[] }[]>([]);
  const chapterOrientationStored = JSON.parse(localStorage.getItem('chapterOrientation') || '[]'); // Stored in localstorage
  const [chapterOrientation, setChapterOrientation] = useState<{ orientation: string }[]>(chapterOrientationStored);
  const [chapterFens, setChapterFens] = useState<{ fens: string[][] }[]>([]);
  const [chapterMoves, setChapterMoves] = useState<{ moves: Move[][] }[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [board, setBoard] = useState<ChessInstance>(new Chess());
  const [customSquareStyles, setCustomSquareStyles] = useState<CustomSquareStyles>({});
  const [customArrows, setCustomArrows] = useState<Square[][]>([]);
  const [studyTitle, setStudyTitle] = useState<string | undefined>();
  const [showTips, setShowTips] = useState<boolean>(false);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean | null>(null);
  const [nextPlayerMove, setNextPlayerMove] = useState<Move | null>();
  const studyUrlStored = localStorage.getItem('studyUrl') || null;
  const [studyUrl, setStudyUrl] = useState<string | null>(studyUrlStored); // Stored in localstorage
  const [availableBlackStudy, setAvailableBlackStudy] = useState<boolean>(false);
  const [availableWhiteStudy, setAvailableWhiteStudy] = useState<boolean>(false);

  useEffect(() => {
    // If study was saved in the store fetch it again
    if (studyUrl)
      fetchStudy();

    const gameCopy = { ...board };
    gameCopy.clear();
    setBoard(gameCopy);
  }, []);

  useEffect(() => {
    if (chapterLines.length <= 0)
      return;

    const chess = new Chess();
    let chapterFens = [];
    let chapterMoves = [];
    for (let chapterLine of chapterLines) {
      let fens: string[][] = [];
      let moves: Move[][] = [];
      for (let line of chapterLine.lines) {
        let fensOfLine: string[] = [];
        let movesOfLine: Move[] = [];
        chess.load_pgn(line);
        let move: Move | null;
        do {
          fensOfLine.unshift(chess.fen());
          move = chess.undo()
          if (move != null) movesOfLine.unshift(move);
        } while (move != null)
        fens.push(fensOfLine);
        moves.push(movesOfLine);
      }
      chapterFens.push({ fens: fens });
      chapterMoves.push({ moves: moves });
    }
    setChapterFens(chapterFens);
    setChapterMoves(chapterMoves);

    // Try to Determine board orientation based of the lines and where they fork
    if (chapterOrientation && chapterOrientation.length > 0) {
      //nono
    } else {
      const newChapterOrientation = chapterMoves.map(chapter => {
        let moveIndex = 0;
        while (true) {
          let move = chapter.moves[0][moveIndex];
          if (move == undefined)
            return { orientation: moveIndex % 2 == 0 ? "black" : "white" };

          for (let moves of chapter.moves) {
            if (moves[moveIndex]?.san != move.san) {
              return { orientation: moveIndex % 2 == 0 ? "black" : "white" };
            }
          }
          moveIndex++;
        }
      });
      setChapterOrientation(newChapterOrientation);
      localStorage.setItem('chapterOrientation', JSON.stringify(newChapterOrientation));
    }


  }, [chapterLines]);

  useEffect(() => {
    if (!nextPlayerMove || !showTips)
      return;

    setCustomSquareStyles({ [nextPlayerMove.from]: { backgroundColor: 'green' } });
  }, [showTips]);

  useEffect(() => {
    if (!nextPlayerMove || !showSolution)
      return;

    setCustomArrows([[nextPlayerMove.from, nextPlayerMove.to]])
  }, [showSolution]);

  useEffect(() => {
    if (chapterOrientation.length == 0)
      return;

    setAvailableBlackStudy(!!chapterOrientation.find(x => x.orientation == "black"));
    setAvailableWhiteStudy(!!chapterOrientation.find(x => x.orientation == "white"));
  }, [chapterOrientation]);


  async function fetchStudy() {
    if (!studyUrl)
      return;

    // Parse the studyId from the input
    let studyId: string;
    let splittedStudyUrl = studyUrl.split('/study/');
    if (splittedStudyUrl.length === 1) {
      studyId = splittedStudyUrl[0];
    } else {
      studyId = splittedStudyUrl[splittedStudyUrl.length - 1].substring(0, 8);
    }

    // Fetch the study
    const chess = new Chess();
    let txt: string;
    try {
      let response = await fetch(`https://lichess.org/api/study/${studyId}.pgn?comments=false&clocks=false`);
      txt = await response.text();
    } catch (e) {
      console.error("Could not fetch study with id", studyId);
      return;
    }

    // Parse the study
    let chapters = txt.split("[Event ").map(x => "[Event " + x);
    chapters.shift();

    let allChapterLines = [];
    for (let chapter of chapters) {
      let title = chapter.match(/\[Event\ \"(.*)\"\]/)?.[1];
      let fen = chapter.match(/\[FEN\ \"(.*)\"\]/)?.[1];

      let chapterSplit = chapter
        .replace(/\{[^\{\}]*}/g, '') // Remove comments
        .split('\n\n');
      let cleanedChaperParts = chapterSplit[1]
        .split('('); // Split on "("

      cleanedChaperParts[0] = chapterSplit[0].replaceAll('(', '').replaceAll(')', '') + '\n\n' + cleanedChaperParts[0];

      let chapterLines = [];
      while (true) {
        chapterLines.push("");
        let i = 0
        for (; i < cleanedChaperParts.length; i++) {
          if (!cleanedChaperParts[i].includes(')')) {
            chapterLines[chapterLines.length - 1] += cleanedChaperParts[i];
          } else {
            // Add the fen at the start the start position is not default one
            let pgnToLoad = chapterLines[chapterLines.length - 1];

            // Remove the last move
            chess.load_pgn(pgnToLoad);
            chess.undo();
            chapterLines[chapterLines.length - 1] = chess.pgn() + " ";

            let cleanedChaperPartParts = cleanedChaperParts[i].split(')');
            chapterLines[chapterLines.length - 1] += cleanedChaperPartParts.shift(); // Add the end of the line to chapterLines
            // Merge the curr element with the previous one
            cleanedChaperParts[i - 1] += cleanedChaperPartParts.join(')');
            cleanedChaperParts.splice(i, 1);
            break;
          }
        }
        if (cleanedChaperParts.length == 1) // We reduced the array to a single element
        {
          if (chapterLines.length > 1)
            chapterLines.push(cleanedChaperParts[0]);
          break;
        }
      }

      allChapterLines.push({ title: title, lines: chapterLines, fen: fen });
    }

    // Save in store if valid
    localStorage.setItem('studyUrl', studyUrl);
    localStorage.setItem('chapterOrientation', '[]');
    setChapterOrientation([]);

    console.log(allChapterLines);
    setChapterLines(allChapterLines);
    const studyTitle = allChapterLines[0].title?.split(":")[0];
    setStudyTitle(studyTitle);

    // Reset Board
    const gameCopy = { ...board };
    gameCopy.clear();
    setBoard(gameCopy);
    setShowSuccess(null)
  }

  function startAsWhite() {
    setBoardOrientation("white")

    setShowSuccess(false);
    setCustomSquareStyles({});
    setCustomArrows([]);
    setShowTips(false);
    setShowSolution(false);
    setNextPlayerMove(null);

    let whiteChapters = chapterLines.filter((x, i) => chapterOrientation[i].orientation == 'white')
    let rndChapter = whiteChapters[Math.floor(Math.random() * whiteChapters.length)];
    if (rndChapter.fen) {
      board.load(rndChapter.fen);
    } else {
      board.reset();
    }

    // Compute next player move
    let currFen = board.fen();
    let result = findFen(currFen, "white");
    if (result) {
      let { iChapter, iLine, iFen } = result;
      let nextPlayerMove = chapterMoves[iChapter].moves[iLine][iFen];
      if (nextPlayerMove)
        setNextPlayerMove(nextPlayerMove);
    }
  }

  function startAsBlack() {
    setBoardOrientation("black");

    setShowSuccess(false);
    setCustomSquareStyles({});
    setCustomArrows([]);
    setShowTips(false);
    setShowSolution(false);
    setNextPlayerMove(null);

    let blackChapters = chapterLines.filter((x, i) => chapterOrientation[i].orientation == 'black')
    let rndChapter = blackChapters[Math.floor(Math.random() * blackChapters.length)];
    if (rndChapter.fen) {
      board.load(rndChapter.fen);

      // Compute next player move
      let currFen = board.fen();
      let result = findFen(currFen, "black");
      let { iChapter, iLine, iFen } = result;
      if (result) {
        let nextPlayerMove = chapterMoves[iChapter].moves[iLine][iFen];
        if (nextPlayerMove)
          setNextPlayerMove(nextPlayerMove);
      }
    } else {
      board.reset();
    }

    let currFen = board.fen();

    let result = findFen(currFen, "black");
    if (result == null) {
      board.undo();

      console.error("This should never happen ??!")
      return true;
      //TODO:  should never happen ???
    }
    let { iChapter, iLine, iFen } = result;
    let opponentMove = chapterMoves[iChapter].moves[iLine][iFen];
    let nextPlayerMove = chapterMoves[iChapter].moves[iLine][iFen + 1];
    board.move(opponentMove);

    if (nextPlayerMove == null) {
      setShowSuccess(true);
      return true;
    }

    const gameCopy = { ...board };
    setBoard(gameCopy);
    setNextPlayerMove(nextPlayerMove);
    return true;
  }

  function onDrop(sourceSquare: Square, targetSquare: Square) {
    setCustomSquareStyles({});
    setCustomArrows([]);
    setShowTips(false);
    setShowSolution(false);

    const move = board.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return false;

    let currFen = board.fen();

    let result = findFen(currFen, boardOrientation);
    if (result == null) {
      board.undo();
      setCustomSquareStyles({ [move.from]: { backgroundColor: 'red' }, [move.to]: { backgroundColor: 'red' } });
      return true;
    }
    let { iChapter, iLine, iFen } = result;
    console.log(iChapter, iLine, iFen);

    let opponentMove = chapterMoves[iChapter].moves[iLine][iFen];
    let nextPlayerMove = chapterMoves[iChapter].moves[iLine][iFen + 1];

    if (opponentMove == null) {
      setShowSuccess(true);
      return true;
    }

    board.move(opponentMove);

    if (nextPlayerMove == null) {
      setShowSuccess(true);
      return true;
    }

    const gameCopy = { ...board };
    setBoard(gameCopy);
    setNextPlayerMove(nextPlayerMove);
    return true;
  }

  function findFen(currFen: string, boardOrientation: "white" | "black") {
    let possibleLines = [];
    for (let iChapter = 0; iChapter < chapterFens.length; iChapter++) {
      // We filter out chapters on the wrong side
      if (chapterOrientation[iChapter].orientation != boardOrientation)
        continue;

      let chapter = chapterFens[iChapter];
      for (let iLine = 0; iLine < chapter.fens.length; iLine++) {
        let line = chapter.fens[iLine];
        for (let iFen = 0; iFen < line.length; iFen++) {
          let fen = line[iFen]
          if (fen == currFen) {
            possibleLines.push({ iChapter, iLine, iFen });
          }
        }
      }
    }

    // If we have the choice we filter out lines that don't have a next move
    let possibleLinesFiltered = possibleLines.filter(({ iChapter, iLine, iFen }) => chapterFens[iChapter].fens[iLine][iFen + 1]);
    if (possibleLinesFiltered.length > 1) {
      possibleLines = possibleLinesFiltered;
    }

    const randomElement = possibleLines[Math.floor(Math.random() * possibleLines.length)];
    return randomElement;
  }

  function toggleChapterOrientationItem(i: number) {
    let chapterOrientationCopy = Array.from(chapterOrientation);
    chapterOrientationCopy[i].orientation = chapterOrientationCopy[i].orientation == "white" ? "black" : "white";
    setChapterOrientation(chapterOrientationCopy);
    localStorage.setItem('chapterOrientation', JSON.stringify(chapterOrientationCopy));
  }

  return (
    <div>
      <Grid container sx={{ mb: 2 }} direction="row" alignItems="center" justifyContent="space-between">
        <Tooltip title="Provide a lichess study to start the training. See: https://lichess.org/study">
          <TextField label="Lichess study"
            defaultValue={''} //
            placeholder="https://lichess.org/study/XXXXXXXX"
            variant="outlined"
            size="small"
            sx={{ width: 150, m: 1, flexGrow: 1 }}
            onChange={event => {
              setStudyUrl(event.target.value);
            }} />
        </Tooltip>
        <Button variant="contained" aria-label="Fetch Study" onClick={fetchStudy} disabled={!studyUrl}>Fetch Study</Button>
      </Grid>
      {studyTitle ? <Grid sx={{ mb: 2, width: 600 }}>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
          >
            <Tooltip title="We try to compute the side that is studied for each chapter but you should specify it manually if needed. The value will be stored for your next visit.">
              <Typography>Study: {studyTitle}</Typography>
            </Tooltip>
          </AccordionSummary>
          <AccordionDetails>
            <List dense={true}>
              {chapterLines.map((chapterLine, i) =>
                <ListItem key={i} secondaryAction={
                  <IconButton color="primary" aria-label="chapter orientation" component="div" onClick={() => toggleChapterOrientationItem(i)}>
                    {chapterOrientation[i]?.orientation == "white" ? <img className="side-img" src="./white-king.svg"></img> : <img className="side-img" src="./black-king.svg"></img>}
                  </IconButton>
                }>
                  <ListItemText primary={chapterLine.title}></ListItemText>
                </ListItem>
              )}
            </List>
          </AccordionDetails>
        </Accordion>
      </Grid> : null
      }

      <div className="chessboard-container" >
        <Chessboard
          position={board.fen()}
          onPieceDrop={onDrop}
          animationDuration={100}
          customArrowColor={'rgba(21, 120, 27)'}
          boardOrientation={boardOrientation}
          customSquareStyles={customSquareStyles}
          customArrows={customArrows}
          boardWidth={600}
        />
        <Grid container direction="row" alignItems="center" justifyContent="center" className={"success-check-icon-container " + (showSuccess ? "visible" : "")}>
          {showSuccess ? <SuccessAnimationIcon></SuccessAnimationIcon> : null}
        </Grid>
      </div>
      <Grid container direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 2 }}>
        <Button variant="contained" aria-label="Start as black" onClick={startAsBlack} disabled={!chapterLines?.length || !availableBlackStudy}>Start as black</Button>
        <Button variant="contained" aria-label="Start as white" onClick={startAsWhite} disabled={!chapterLines?.length || !availableWhiteStudy}>Start as white</Button>
        {
          !showTips ? <IconButton color="primary" aria-label="tips" component="span" onClick={() => { setShowTips(true); }} disabled={!nextPlayerMove}>
            <TipsAndUpdatesIcon />
          </IconButton> : null
        }
        {
          showTips ? <IconButton color="primary" aria-label="tips" component="span" onClick={() => { setShowSolution(true) }} disabled={showSolution}>
            <QuestionMarkIcon />
          </IconButton> : null
        }
      </Grid>
    </div>
  )

}