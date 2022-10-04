import React, { useEffect, useState } from 'react';
import './App.css';
import { Chess, ChessInstance, ShortMove, Square } from 'chess.js'
import { Line, Pie } from 'react-chartjs-2';
import { Chessboard } from "react-chessboard";
import {
  Chart as ChartJS, CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { StockfishService, StockfishState } from './stockfishService';
import ChessWebAPI from 'chess-web-api';
import { ChessComArchive, fromLichessToChessComArchive, getPgnAtMove, getResult, getResultAsString, HydratedChessComArchive } from './ChessComArchive';
import { FullOpenings } from './FullOpening';
import {
  GridFilterModel,
  GridRowsProp,
} from '@mui/x-data-grid';
import { Alert, Button, CircularProgress, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { GamesTable } from './GamesTable';
import { Openings } from './Openings';
import { TimeManagement } from './TimeManagement';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { EndGame, Final, getFinal, getFinalName, getPiecesFromBoard, isWinningFinal } from './EndGame';
import { Tactics } from './Tactics';


enum ComputingState {
  NotLoading = 0,
  FetchingGames = 1,
  ComputingStats = 2,
  ErrorFetchingUser = 3,
  ErrorNoGamesFound = 4,
  StartDateMustBeBeforeEndDate = 5,
  AnalysingGames = 6,
}

const LoadingStates = [ComputingState.FetchingGames, ComputingState.ComputingStats, ComputingState.AnalysingGames]

ChartJS.register(CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ArcElement,
  Tooltip,
  Legend,
);

function App() {
  const sfDepth = 10;
  const sf = new StockfishService(sfDepth);

  var chessAPI = new ChessWebAPI();
  const defaultData = {
    labels: ['', '', ''],
    datasets: [
      {
        label: '',
        data: [5, 6, 7],
        backgroundColor: 'rgb(0, 99, 132)',
        borderColor: 'rgb(255, 99, 132)',
      }
    ],
  };

  var startDateDefault = new Date();
  startDateDefault.setMonth(startDateDefault.getMonth() - 3);


  let storedGameType = localStorage.getItem('gameType') || 'rapid';
  const [gameType, setGameType] = useState<string>(storedGameType);

  let storedPlatform = localStorage.getItem('platform') || 'chesscom';
  const [platform, setPlatform] = useState<string>(storedPlatform);

  let storedUserName = localStorage.getItem('userName') || '';
  const [userName, setUserName] = useState<string>(storedUserName);

  const [startDate, setStartDate] = useState<Date>(startDateDefault);
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [data, setData] = useState(defaultData);

  const [board, setBoard] = useState<ChessInstance>(new Chess());
  const [archives, setArchives] = useState<ChessComArchive[]>();
  const [hydratedArchives, setHydratedArchives] = useState<HydratedChessComArchive[]>();
  const [gridRow, setGridRow] = useState<GridRowsProp>();
  const [tableFilters, setTableFilters] = useState<GridFilterModel>({ items: [] });
  const [computingState, setComputingState] = useState<ComputingState>(ComputingState.NotLoading);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);


  async function fetchStudy() {
    const chess = new Chess();
    let studyId = "GtNC7kF0";
    var response = await fetch(`https://lichess.org/api/study/${studyId}.pgn`);
    var txt = await response.text();

    let chapters = txt.split("[Event ").map(x => "[Event " + x);
    chapters.shift();

    for (let chapter of chapters) {
      let cleanedChaper = '1.' + chapter.split("\n\n1.")[1]; // TODO: Careful this could blow up if there is commetn in one chapter with "1." in it...
      chess.load_pgn(cleanedChaper);
      let lastFen = chess.fen();
      let node = { fen: lastFen, next: [] as any[] }

      var pgn = cleanedChaper;
      while (true) {
        if (pgn.lastIndexOf(" ") === -1)
          break;

        pgn = pgn.substring(0, pgn.lastIndexOf(" "));
        chess.load_pgn(pgn);
        let fen = chess.fen();
        if (lastFen == fen) {
          continue;
        }

        node = { fen: chess.fen(), next: [node] }

        lastFen = fen;
      }
    }
  }

  useEffect(() => {
    //fetchStudy();

    const chess = new Chess();
    // Page just loaded
    if (!archives) {
      return;
    }

    // compute what archive we filter on
    var filteredArchives = archives.filter(x => x.time_class === gameType).splice(0, 5) as HydratedChessComArchive[];

    // No game were found after filtering
    if (filteredArchives.length == 0) {
      setComputingState(ComputingState.ErrorNoGamesFound);
      return;
    }

    // opening stats
    for (var archive of filteredArchives) {
      // Remove description
      let cleanedPgn = archive.pgn.split('\n\n')[1];

      let matches = cleanedPgn.match(/\{\s?\[%clk[^\{\[\]\}]*\]\s?\} /g);

      // Remove everything between "{[ ... ]}" or "{ [ ... ] }"
      cleanedPgn = cleanedPgn.replace(/\{\s?\[[^\{\[\]\}]*\]\s?\} /g, '');

      if (matches) {
        let clickTimes = matches.map(x => {
          let timeMatch = x.match(/\{\s?\[%clk\s?(.*)\]\s?\}/);
          let timeString = timeMatch && timeMatch[1] ? timeMatch[1] : "";
          let timeAsArray = timeString.split(":");
          return Number(timeAsArray[0]) * 60 * 60 + Number(timeAsArray[1]) * 60 + Number(timeAsArray[2]);
        });
        archive.whiteTimes = clickTimes.filter((_, i) => i % 2 === 0);
        archive.blackTimes = clickTimes.filter((_, i) => i % 2 === 1);
      }

      // Remove the number like so "2..." between each move
      cleanedPgn = cleanedPgn.replace(/[0-9]+\.\.\. /g, '');

      archive.cleanedPgn = cleanedPgn;
      let cleanedPgn2 = cleanedPgn.split('.');
      let doubleMoves = cleanedPgn2.map(x => x.slice(0, -2).trim()); // Remove last 2 chars for each moves
      doubleMoves = doubleMoves.slice(1); // Remove first element that is empty
      let lastMove = cleanedPgn2[cleanedPgn2.length - 1];
      if (lastMove.includes("\n"))
        lastMove = lastMove.substring(0, lastMove.length - 5).trim();

      doubleMoves[doubleMoves.length - 1] = lastMove; // We don't want to remove chars to the last element

      let moves: string[] = []
      for (const doubleMove of doubleMoves) {
        const moveArray = doubleMove.split(" ");
        moves = moves.concat(moveArray);
      }

      archive.moves = moves;

      for (var opening of FullOpenings) {
        if (cleanedPgn.startsWith(opening.pgn)) {
          archive.opening = opening.name;
          archive.eco = opening.eco;
          break;
        }
      }

      // Set the result of the game
      if (archive.white.username == userName)
        archive.playingWhite = true;
      else
        archive.playingWhite = false;

      const playerSide = archive.playingWhite ? archive.white : archive.black;

      archive.result = playerSide.result;

      if (!archive.opening) {
        console.error("what is this opening ?? " + archive.url);
        continue;
      }
    }

    // Compute finals
    let final: Final = Final.NoFinal
    let previousMoveFinal: Final = Final.NoFinal

    for (let archive of filteredArchives) {
      chess.load_pgn(archive.cleanedPgn);
      do {
        let board = chess.board();

        let { whitePieces, blackPieces } = getPiecesFromBoard(board);

        final = archive.playingWhite ? getFinal(whitePieces, blackPieces) : getFinal(blackPieces, whitePieces);
        if (final !== Final.NoFinal) {
          let winningFinal = isWinningFinal(final);
          if (winningFinal && previousMoveFinal === final) {
            archive.winningFinal = final;
          }

          // We set this not a winning final or if this winning final score is either nulle or defeat we have our final
          // We also make sure this situation stayed for 2 moves
          if (!winningFinal && previousMoveFinal === final)
            break;
        }

        previousMoveFinal = final;

      } while (chess.undo() != null)

      archive.final = final;
    }

    // Compute score at each move
    setComputingState(ComputingState.AnalysingGames);
    (async () => {
      await sf.setup();
      let i = 0;
      let start = performance.now();
      for (var archive of filteredArchives) {
        let scores = await computeScoreForArchive(archive);
        archive.scores = scores;
        archive.scoreOutOfOpening = scores.length > 20 ? scores[20] : scores[scores.length - 1];

        setLoadingProgress(100 * i / filteredArchives.length)
        i++;
      }
      console.log(`function took ${(performance.now() - start).toFixed(3)}ms`);

      setHydratedArchives(filteredArchives);
    })();

  }, [archives]);


  async function computeScoreForArchive(archive: HydratedChessComArchive) {
    return new Promise<number[]>(async (resolve) => {
      const chess = new Chess();

      await sf.init((state: StockfishState) => {
        // While we don't have computed everything move sf state don't use it
        if (state.scores.length !== archive.moves.length - 1 || state.scores.includes(undefined))
          return;

        var result = state.scores.map((x, i) => {
          // If it's black turn then we need to invert the number
          return (x as number) * ((i % 2 == 0) ? -1 : 1)
        });

        resolve(result);
      });

      for (let moveId = 1; moveId <= archive.moves.length; moveId++) {
        let pgn = getPgnAtMove(archive.moves, moveId);
        if (pgn == null)
          break;

        chess.load_pgn(pgn);
        const fen = chess.fen();
        sf.computeFen(fen);
      }
    });
  }

  useEffect(() => {
    if (!hydratedArchives || hydratedArchives.length == 0) {
      return;
    }
    // Set grid rows
    setGridRow(hydratedArchives.map((x, i) => ({
      id: i,
      url: x.url,
      color: x.playingWhite ? 'white' : 'black',
      result: getResultAsString(x.result),
      scoreAtMove10: (x.scoreOutOfOpening * (x.playingWhite ? 1 : -1) * 0.01).toFixed(2),
      endTime: new Date(x.end_time * 1000),
      opening: x.opening,
      final: getFinalName(x.final),
      winningFinal: getFinalName(x.winningFinal),
    })));
    setComputingState(ComputingState.NotLoading);
  }, [hydratedArchives]);

  async function fetchGames() {
    setComputingState(ComputingState.FetchingGames);
    // Fetch player info

    if (startDate.getTime() > endDate.getTime()) {
      setComputingState(ComputingState.StartDateMustBeBeforeEndDate);
      return;
    }

    // Save variables choosen in localstorage
    localStorage.setItem('userName', userName);
    localStorage.setItem('platform', platform);
    localStorage.setItem('gameType', gameType);

    if (platform == "chesscom") {
      let responsePlayer;
      try {
        responsePlayer = await chessAPI.getPlayer(userName);
      } catch {
        setComputingState(ComputingState.ErrorFetchingUser);
        return;
      }
      const userNameFixed = responsePlayer.body.url.slice(29); // Here we fix the potential capital cases that a username can have
      setUserName(userNameFixed);

      // Fetch all archives (for one month for now)
      let archiveTemp: ChessComArchive[] = []
      const startYear = startDate.getUTCFullYear();
      const endYear = endDate.getUTCFullYear();
      const startMonth = startDate.getUTCMonth() + 1;
      const endMonth = endDate.getUTCMonth() + 1;
      let y = startYear;
      let m = startMonth;

      while (y < endYear || m <= endMonth) {
        let response = await chessAPI.getPlayerCompleteMonthlyArchives(userNameFixed, y, m);
        archiveTemp = archiveTemp.concat(response.body.games)

        if (m == 12) {
          m = 1; y++;
        } else {
          m++;
        }
      }
      setComputingState(ComputingState.ComputingStats);
      setArchives(archiveTemp);
    } else if (platform == "lichess") {
      let startTime = startDate.getTime();
      let endDateCopy = new Date(endDate);
      endDateCopy.setMonth(endDateCopy.getMonth() + 1);
      let endTime = endDateCopy.getTime();
      let url = `https://lichess.org/api/games/user/${userName}?pgnInJson=true&clocks=true&opening=true&perfType=${gameType}&since=${startTime}&until=${endTime}`;
      let response = await fetch(url, {
        headers: {
          'Accept': 'application/x-ndjson'
        }
      });
      let res = await response.text();
      let lines = res.split("\n");
      let archiveTemp: ChessComArchive[] = []
      for (let line of lines) {
        if (!line)
          continue;
        let lichessArchive = JSON.parse(line);

        if (lichessArchive.variant == "standard" && !!lichessArchive.moves)
          archiveTemp.push(fromLichessToChessComArchive(lichessArchive));
      }

      if (archiveTemp.length == 0) {
        setComputingState(ComputingState.ErrorNoGamesFound);
        return;
      }
      setComputingState(ComputingState.ComputingStats);
      setArchives(archiveTemp);
    }
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

  return (
    <div className="App">
      <div className="app-container">
        {false ?? <div>
          <p>
            Game advantage evolution
          </p>

          <div style={{ width: "800px", height: "300px" }}>
            <Line
              datasetIdKey='id'
              data={data}
              options={{ maintainAspectRatio: false }}
            />
          </div>

          <Chessboard position={board.fen()} onPieceDrop={onDrop} />
        </div>}

        <Grid sx={{ m: 1 }}>
          <TextField label="Username"
            defaultValue={userName}
            variant="outlined"
            size="small"
            sx={{ width: 150, m: 1 }}
            onChange={event => {
              setUserName(event.target.value);
            }} />
          <FormControl sx={{ width: 130, m: 1 }} size="small">
            <InputLabel id="platform-label">Platform</InputLabel>
            <Select
              labelId="platform-label"
              value={platform}
              label="Platform"
              defaultValue={gameType}
              onChange={(event: SelectChangeEvent) => {
                setPlatform(event.target.value);
              }}
            >
              <MenuItem value={"chesscom"}>Chess.com</MenuItem>
              <MenuItem value={"lichess"}>Lichess</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ width: 120, m: 1 }} size="small">
            <InputLabel id="game-type-label">Game Type</InputLabel>
            <Select
              labelId="game-type-label"
              id="game-type"
              value={gameType}
              label="Game type"
              defaultValue={gameType}
              onChange={(event: SelectChangeEvent) => {
                setGameType(event.target.value);
              }}
            >
              <MenuItem value={"rapid"}>Rapid</MenuItem>
              <MenuItem value={"blitz"}>Blitz</MenuItem>
              <MenuItem value={"bullet"}>Bullet</MenuItem>
            </Select>
          </FormControl>
          <TextField
            id="startDate"
            label="Start Date"
            type="month"
            InputProps={{ inputProps: { max: new Date().toISOString().substring(0, 7) } }}
            defaultValue={startDate.toISOString().substring(0, 7)}
            size="small"
            sx={{ width: 150, m: 1 }}
            InputLabelProps={{
              shrink: true,
            }}
            onChange={event => {
              setStartDate(new Date(event.target.value));
            }}
          />
          <TextField
            id="endDate"
            label="End date"
            type="month"
            InputProps={{ inputProps: { max: new Date().toISOString().substring(0, 7) } }}
            defaultValue={endDate.toISOString().substring(0, 7)}
            size="small"
            sx={{ width: 150, m: 1 }}
            InputLabelProps={{
              shrink: true,
            }}
            onChange={event => {
              setEndDate([new Date(event.target.value), new Date()].sort((a, b) => a.getTime() - b.getTime())[0]);
            }}
          />
          <Button variant="contained" onClick={fetchGames} sx={{ m: 1 }} disabled={LoadingStates.includes(computingState)}>
            {LoadingStates.includes(computingState) ? "Computing..." : "Compute"}
          </Button>
        </Grid>
        {computingState == ComputingState.ErrorFetchingUser ? <Alert severity="error">Error fetching games for this user</Alert> : null}
        {computingState == ComputingState.ErrorNoGamesFound ? <Alert severity="warning">No games were found for the selected filters</Alert> : null}
        {computingState == ComputingState.StartDateMustBeBeforeEndDate ? <Alert severity="warning">selected start date must come before end date</Alert> : null}

        {(!hydratedArchives || hydratedArchives.length == 0) ? <div>
          {computingState == ComputingState.NotLoading ?
            (<PsychologyIcon sx={{ fontSize: 120, mt: 5 }} />) :
            (<CircularProgress variant="determinate" value={loadingProgress} size='25%' />)
          }

          {computingState == ComputingState.NotLoading ? <p>Enter your username and select a time range</p> : null}
          {computingState == ComputingState.FetchingGames ? <p>Fetching games</p> : null}
          {computingState == ComputingState.ComputingStats ? <p>Computing statistics</p> : null}
          {computingState == ComputingState.AnalysingGames ? <p>Analysing {archives?.filter(x => x.time_class === gameType).length} games with stockfish depth {sfDepth}</p> : null}
        </div> : null}

        <Openings archives={hydratedArchives} setTableFilters={setTableFilters}></Openings>
        <TimeManagement archives={hydratedArchives}></TimeManagement>
        <EndGame archives={hydratedArchives} setTableFilters={setTableFilters}></EndGame>
        <Tactics archives={hydratedArchives} setTableFilters={setTableFilters}></Tactics>

        <div id="games-table" style={{ height: "100vh", width: "100%", maxWidth: 1200, marginTop: 30 }}>
          <GamesTable gridRow={gridRow} filters={tableFilters} setTableFilters={setTableFilters}></GamesTable>
        </div>
      </div>
    </div >
  );
}

export default App;
