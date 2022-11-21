import './Preparation.css'
import { useEffect, useState } from "react";
import { getPgnAtMove, HydratedChessComArchive } from "./ChessComArchive";
import { Line } from 'react-chartjs-2';
import { Chessboard, CustomSquareStyles } from "react-chessboard";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, CircularProgress, Grid, IconButton, List, ListItem, ListItemText, TextField, Tooltip, Typography } from "@mui/material";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { StockfishService, StockfishState } from "./stockfishService";
import { debounce, useAudio, useKeyPress } from './ReactHelpers';
import { ArchiveMoveDescription } from './ArchiveMoveDescription';
import { VariantLine } from './VariantLine';
import { Chess, ChessInstance, Move, Square } from './libs/chess.js';
import { Link } from "react-router-dom";
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { SuccessAnimationIcon } from './SuccessAnimationIcon';
import { PrepaGameResult, PreparationTable } from './PreparationTable';
import { GridFilterModel } from '@mui/x-data-grid';

declare const gtag: any;

type PreparationProps = { hydratedArchives: HydratedChessComArchive[] | undefined }

export function Preparation(props: PreparationProps) {

  const [chapterLines, setChapterLines] = useState<{ title: string | undefined, fen: string | undefined, lines: string[] }[]>([]);
  const chapterOrientationStored = JSON.parse(localStorage.getItem('chapterOrientation') || '[]'); // Stored in localstorage
  const [chapterOrientation, setChapterOrientation] = useState<{ orientation: "white" | "black" | null }[]>(chapterOrientationStored);
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
  const studyUrlStored = localStorage.getItem('studyUrl') || undefined;
  const [studyUrl, setStudyUrl] = useState<string | undefined>(studyUrlStored); // Stored in localstorage
  const [studyError, setStudyError] = useState<string | null>(null);
  const [studyLoading, setStudyLoading] = useState<boolean>(false);
  const [availableBlackStudy, setAvailableBlackStudy] = useState<boolean>(false);
  const [availableWhiteStudy, setAvailableWhiteStudy] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ height: window.innerHeight, width: window.innerWidth });
  const [prepaGameResult, setPrepaGameResult]= useState<PrepaGameResult[]>([]);

  const [moveSoundPlay, setMoveSoundPlay] = useAudio("./Move.ogg");
  const [captureSoundPlay, setCaptureSoundPlay] = useAudio("./Capture.ogg");


  useEffect(() => {
    const debouncedHandleResize = debounce(function handleResize() {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth
      })
    }, 500)

    window.addEventListener('resize', debouncedHandleResize)

    return () => {
      window.removeEventListener('resize', debouncedHandleResize)
    }
  })

  useEffect(() => {
    // If study was saved in the store fetch it again
    if (studyUrl)
      fetchStudy(studyUrl);

    const gameCopy = { ...board };
    gameCopy.clear();
    setBoard(gameCopy);

    gtag("event", "page_view", {
      page_title: 'Preparation',
      page_location: 'https://chess.jehanno.net/study',
    });
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
      // Already known from store, don't compute
    } else {
      const newChapterOrientation: { orientation: "white" | "black" | null }[] = chapterMoves.map(chapter => {
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

useEffect(() => {
  if (!props.hydratedArchives || props.hydratedArchives.length == 0 || !chapterFens || chapterFens.length == 0)
    return;

  compareToGames();
}, [props.hydratedArchives, chapterFens, chapterOrientation])

  async function fetchStudy(studyUrl: string | undefined, orientation?: 'white' | 'black') {
    if (!studyUrl)
      return;

    gtag("event", "fetch_study", {
      study: studyUrl,
    });

    setStudyError(null);
    setStudyLoading(true);
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
      setStudyUrl(undefined);
      setStudyLoading(false);

      localStorage.setItem('studyUrl', '');
      console.error("Could not fetch study with id", studyId);
      setStudyError("study fetching error");
      return;
    }
    if (txt.startsWith('{"error":')) {
      setStudyUrl(undefined);
      setStudyLoading(false);
      localStorage.setItem('studyUrl', '');
      console.error("Could not fetch study with id", studyId, txt);
      setStudyError(txt);
      return;
    }

    // Parse the study
    let chapters = txt.split("[Event ").map(x => "[Event " + x);
    chapters.shift();

    let allChapterLines = [];
    let studyTitle = "";
    for (let chapter of chapters) {
      let title = chapter.match(/\[Event\ \"(.*)\"\]/)?.[1];
      studyTitle = title?.split(":", 2)[0] || "Unamed";
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

            if (i != cleanedChaperParts.length - 1) {
              // Add the fen at the start the start position is not default one
              let pgnToLoad = chapterLines[chapterLines.length - 1];
              pgnToLoad = pgnToLoad.replaceAll(/[0-9]*\.\.\. /g, ''); // Remove the "6... " unecessary strings (them make load_pgn fails)
              // Remove the last move
              let res = chess.load_pgn(pgnToLoad);
              if (!res) console.error("Couldn't load png", pgnToLoad);
              chess.undo();
              let cleanPgn = chess.pgn();
              chapterLines[chapterLines.length - 1] = cleanPgn.substring(0, cleanPgn.length - 1);
            }
          } else {
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

      allChapterLines.push({ title: title?.split(":", 2)[1], lines: chapterLines, fen: fen });
    }

    // Save in store if valid

    if (localStorage.getItem('studyUrl') == studyUrl && chapterOrientation && chapterOrientation.length > 0) {

    } else if (!orientation) {
      setChapterOrientation([]);
      localStorage.setItem('chapterOrientation', '[]');
      localStorage.setItem('studyUrl', studyUrl);
    } else {
      const chapterOrientation = allChapterLines.map(() => ({ orientation: orientation }));
      setChapterOrientation(chapterOrientation);
      localStorage.setItem('chapterOrientation', JSON.stringify(chapterOrientation));
      localStorage.setItem('studyUrl', studyUrl);
    }

    setChapterLines(allChapterLines);
    setStudyTitle(studyTitle);
    setStudyLoading(false);

    resetBoard();

    return allChapterLines;
  }

  function resetBoard() {
    setCustomSquareStyles({});
    setCustomArrows([]);
    setShowTips(false);
    setShowSolution(false);
    setNextPlayerMove(null);

    const gameCopy = { ...board };
    gameCopy.clear();
    setBoard(gameCopy);
    setShowSuccess(null);
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
      //chapterMoves[iChapter].moves.splice(iLine, 1);
      //chapterFens[iChapter].fens.splice(iLine, 1);
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

    if (move.captured)
      setCaptureSoundPlay(true);
    else
      setMoveSoundPlay(true);

    let { iChapter, iLine, iFen } = result;

    let opponentMove = chapterMoves[iChapter].moves[iLine][iFen];
    let nextPlayerMove = chapterMoves[iChapter].moves[iLine][iFen + 1];

    if (opponentMove == null) {
      setShowSuccess(true);
      //chapterMoves[iChapter].moves.splice(iLine, 1);
      //chapterFens[iChapter].fens.splice(iLine, 1);
      return true;
    }

    board.move(opponentMove);

    if (nextPlayerMove == null) {
      setShowSuccess(true);
      //chapterMoves[iChapter].moves.splice(iLine, 1);
      //chapterFens[iChapter].fens.splice(iLine, 1);
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

    console.log(possibleLinesFiltered);
    if (possibleLinesFiltered.length > 0) {
      possibleLines = possibleLinesFiltered;
    }

    const randomElement = possibleLines[Math.floor(Math.random() * possibleLines.length)];
    return randomElement;
  }

  function toggleChapterOrientationItem(i: number) {
    let chapterOrientationCopy = Array.from(chapterOrientation);

    let newValue: 'white' | 'black' | null;
    if (chapterOrientationCopy[i].orientation == 'white')
      newValue = 'black';
    else if (chapterOrientationCopy[i].orientation == 'black')
      newValue = null;
    else
      newValue = 'white';

    chapterOrientationCopy[i].orientation = newValue;

    setChapterOrientation(chapterOrientationCopy);
    localStorage.setItem('chapterOrientation', JSON.stringify(chapterOrientationCopy));
  }

  async function setStudyPreset(preset: 'scotish' | 'caro-kann' | 'london-system' | 'stafford-gambit' | 'nimzo-bogo-indian' | 'catalan') {
    let url: string
    let orientation: 'white' | 'black'
    switch (preset) {
      case 'scotish': url = 'https://lichess.org/study/iGvRBCsI'; orientation = 'white'; break;
      case 'caro-kann': url = 'https://lichess.org/study/IZ2Z759V'; orientation = 'black'; break;
      case 'london-system': url = 'https://lichess.org/study/4sG72RkJ'; orientation = 'white'; break;
      case 'stafford-gambit': url = 'https://lichess.org/study/whCVdUeM'; orientation = 'black'; break; // Not on my account
      case 'nimzo-bogo-indian': url = 'https://lichess.org/study/82Wzzapz'; orientation = 'black'; break; // Not on my account
      case 'catalan': url = 'https://lichess.org/study/x75NW8ek'; orientation = 'white'; break; // Not on my account
    }

    let allChapterLines = await fetchStudy(url, orientation);
    if (!allChapterLines)
      return;

    setStudyUrl(url);
  }

  function deleteStudy() {
    setStudyUrl(undefined);
    setChapterLines([]);
    setChapterOrientation([]);
    setChapterFens([]);
    setChapterMoves([]);
    setStudyTitle("");

    localStorage.setItem('studyUrl', '');
    localStorage.setItem('chapterOrientation', '[]');

    resetBoard();
  }

  function compareToGames() {
    if (!props.hydratedArchives)
      return;

    console.log("compareToGames")
    let prepaGameResult = [];
    const chess = new Chess();
    for (const archive of props.hydratedArchives) {
      chess.reset()
      let i;
      let prepaSuccess = false;
      let lastChapterFoundIndex: number = -1;
      let lastLineFoundIndex: number = -1;

      for (i = 0; i < archive.moves.length; i++) {
        const move = archive.moves[i]

        chess.move(move);

        const fen = chess.fen();

        let lineFoundIndex = -1;
        let chapterFoundIndex = chapterFens.findIndex((c => {
          lineFoundIndex = c.fens.findIndex(line => line.includes(fen));
          return lineFoundIndex != -1;
        }));

        if (lineFoundIndex !== -1) {
          lastLineFoundIndex = lineFoundIndex;
        }

        if (chapterFoundIndex !== -1) {
          lastChapterFoundIndex = chapterFoundIndex;
        }

        if (chapterFoundIndex === -1) {
          // Check if move has been made by the player
          prepaSuccess = (archive.playingWhite && i % 2 === 1) || (!archive.playingWhite && i % 2 === 0);

          //TODO: break only if it's the last move of the line
          break;
        }
      }
      prepaGameResult.push({
        gameUrl: archive.url,
        failedMove: i,
        prepaSuccess: prepaSuccess,
        chapter: lastChapterFoundIndex,
        chapterName: lastChapterFoundIndex != -1 ? chapterLines[lastChapterFoundIndex].title : "",
        line: lastLineFoundIndex,
      });    
    }
    setPrepaGameResult(prepaGameResult);
  }

  return (
    <>
    <Grid direction="column" container className="preparation-container">
      {!studyTitle && !studyLoading ? <>
        <Grid container sx={{ mb: 0 }} direction="row" alignItems="center" justifyContent="space-between">
          <Tooltip title="Provide a lichess study to start the training. See: https://lichess.org/study">
            <TextField label="Lichess study"
              placeholder="https://lichess.org/study/XXXXXXXX"
              variant="outlined"
              size="small"
              value={studyUrl || ''}
              sx={{ width: 150, m: 1, flexGrow: 1 }}
              onChange={event => {
                setStudyUrl(event.target.value);
              }} />
          </Tooltip>
          <Button variant="contained" aria-label="Fetch Study" onClick={() => fetchStudy(studyUrl)} disabled={!studyUrl}>Fetch Study</Button>
        </Grid>
        {studyError ? <Alert sx={{ mb: 1 }} severity="error">Error fetching study. Make sure it's not private.</Alert> : null}
        <Grid container sx={{ mb: 2 }} direction="row" alignItems="center" justifyContent="start">
          <Button size="small" sx={{ mt: 1 }} variant="outlined" aria-label="Scotish" onClick={() => setStudyPreset("scotish")}>Scotish</Button>
          <Button size="small" sx={{ mt: 1, ml: 1 }} variant="outlined" aria-label="Caro-Kann" onClick={() => setStudyPreset("caro-kann")}>Caro-Kann</Button>
          <Button size="small" sx={{ mt: 1, ml: 1 }} variant="outlined" aria-label="London System" onClick={() => setStudyPreset("london-system")}>London System</Button>
          <Button size="small" sx={{ mt: 1, ml: 1 }} variant="outlined" aria-label="Stafford Gambit" onClick={() => setStudyPreset("stafford-gambit")}>Stafford Gambit</Button>
          <Button size="small" sx={{ mt: 1, ml: 1 }} variant="outlined" aria-label="Nimzo/Bogo Indian" onClick={() => setStudyPreset("nimzo-bogo-indian")}>Nimzo/Bogo Indian</Button>
          <Button size="small" sx={{ mt: 1, ml: 1 }} variant="outlined" aria-label="Catalan" onClick={() => setStudyPreset("catalan")}>Catalan</Button>

        </Grid>
      </> : null}
      {studyLoading ? <Grid container sx={{ mb: 2 }} direction="row" alignItems="center" justifyContent="center"><CircularProgress /></Grid> : null}
      {studyTitle ? <Grid container sx={{ mb: 2 }}>
        <Accordion sx={{ flexGrow: 1 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
          >
            <Tooltip title="We try to compute the side that is studied for each chapter but you should specify it manually if needed. The value will be stored for your next visit.">
              <Grid container direction="row" alignItems="center" justifyContent="space-between">
                <Typography>Study: {studyTitle}</Typography>
                <IconButton color="primary" aria-label="delete" component="span" onClick={() => { deleteStudy() }} disabled={showSolution}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Tooltip>
          </AccordionSummary>
          <AccordionDetails>
            <List dense={true}>
              {chapterLines.map((chapterLine, i) =>
                <ListItem key={i} secondaryAction={
                  <IconButton className="chapter-orientation-toggle" color="primary" aria-label="chapter orientation" disabled={!showSuccess && showSuccess !== null} onClick={() => toggleChapterOrientationItem(i)}>
                    {chapterOrientation[i]?.orientation == "white" && <Tooltip title="Train chapter as white"><img className="side-img" src="./white-king.svg"></img></Tooltip>}
                    {chapterOrientation[i]?.orientation == "black" && <Tooltip title="Train chapter as black"><img className="side-img" src="./black-king.svg"></img></Tooltip>}
                    {chapterOrientation[i]?.orientation == null && <Tooltip title="Chapter disabled"><img className="side-img" style={{ transform: 'rotate(170deg)', opacity: 0.5 }} src="./black-king.svg"></img></Tooltip>}
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

      <Grid className="chessboard-container" >
        <Chessboard
          position={board.fen()}
          onPieceDrop={onDrop}
          animationDuration={100}
          customArrowColor={'rgba(21, 120, 27)'}
          boardOrientation={boardOrientation}
          customSquareStyles={customSquareStyles}
          customArrows={customArrows}
          boardWidth={Math.min(600, dimensions.width - 30)}
        />
        <Grid container direction="column" alignItems="center" justifyContent="center" className={"success-check-icon-container " + (showSuccess || showSuccess == null ? "visible" : "")} style={{ width: Math.min(600, dimensions.width - 30), height: Math.min(600, dimensions.width - 30) }}>
          {showSuccess ? <SuccessAnimationIcon></SuccessAnimationIcon> : null}
          <Grid container direction="row" alignItems="center" justifyContent="space-around">
            <IconButton color="primary" aria-label="Start as black" onClick={startAsBlack} disabled={!chapterLines?.length || !availableBlackStudy}>
              <img className="start-side-img" src="./black-king.svg"></img>
            </IconButton>
            <IconButton color="primary" aria-label="Start as white" onClick={startAsWhite} disabled={!chapterLines?.length || !availableWhiteStudy}>
              <img className="start-side-img" src="./white-king.svg"></img>
            </IconButton>
          </Grid>
        </Grid>
      </Grid>
      <Grid container direction="row" alignItems="center" justifyContent="end" sx={{ my: 2 }}>
        <Tooltip enterDelay={500} title="Restart with a new line"><IconButton color="primary" aria-label="tips" component="span" onClick={() => { resetBoard(); }} disabled={!!showSuccess || showSuccess == null}>
          <RestartAltIcon fontSize="large" />
        </IconButton></Tooltip>
        {
          !showTips ? <Tooltip enterDelay={500} title="Show help"><IconButton color="primary" aria-label="tips" component="span" onClick={() => { setShowTips(true); }} disabled={!nextPlayerMove}>
            <TipsAndUpdatesIcon fontSize="large" />
          </IconButton></Tooltip> : null
        }
        {
          showTips ? <Tooltip enterDelay={500} title="Show solution"><IconButton color="primary" aria-label="tips" component="span" onClick={() => { setShowSolution(true) }} disabled={showSolution}>
            <QuestionMarkIcon fontSize="large" />
          </IconButton></Tooltip> : null
        }
      </Grid>
    </Grid>
    
    <div style={{ height: "100vh", width: "100%", maxWidth: 1200, marginTop: 30 }}>
      <PreparationTable prepaGameResult={prepaGameResult} chapterMoves={chapterMoves}></PreparationTable>
    </div>
    </>
  )

}