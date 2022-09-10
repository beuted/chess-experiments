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
  ChartData
} from 'chart.js';
import { StockfishService, StockfishState } from './stockfishService';
import ChessWebAPI from 'chess-web-api';
import { ChessComArchive, getResult, getResultAsString, HydratedChessComArchive } from './ChessComArchive';
import { FullOpenings } from './FullOpening';
import {
  GridRowsProp,
} from '@mui/x-data-grid';
import { Alert, Button, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { GamesTable } from './GamesTable';
import { Openings } from './Openings';
import { TimeManagement } from './TimeManagement';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { EndGame } from './EndGame';


enum LoadingState {
  NotLoading = 0,
  FetchingGames = 1,
  ComputingStats = 2,
  ErrorFetchingUser = 3
}

ChartJS.register(CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ArcElement,
  Tooltip,
  Legend,
);

function App() {
  const sf = new StockfishService(9);

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
  const [gameType, setGameType] = useState<string>("rapid");
  let storedUserName = localStorage.getItem('userName') || '';
  const [userName, setUserName] = useState<string>(storedUserName);
  const [startDate, setStartDate] = useState<Date>(startDateDefault);
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [data, setData] = useState(defaultData);

  const [board, setBoard] = useState<ChessInstance>(new Chess());
  const [archives, setArchives] = useState<ChessComArchive[]>([]);
  const [hydratedArchives, setHydratedArchives] = useState<HydratedChessComArchive[]>();
  const [gridRow, setGridRow] = useState<GridRowsProp>();
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.NotLoading);

  useEffect(() => {
    const chess = new Chess();
    // compute what archive we filter on
    var filteredArchives = archives.filter(x => x.time_class == "rapid") as HydratedChessComArchive[];

    // opening stats
    for (var archive of filteredArchives) {
      // Remove description
      let cleanedPgn = archive.pgn.split('\n\n')[1];

      let matches = cleanedPgn.match(/\{\[%clk[^\{\[\]\}]*\]\} /g);

      // Remove everything between "{[ ... ]}"
      cleanedPgn = cleanedPgn.replace(/\{\[[^\{\[\]\}]*\]\} /g, '');

      if (matches) {
        let clickTimes = matches.map(x => {
          let timeString = x.substring(7, x.length - 3);
          let timeAsArray = timeString.split(":");
          return Number(timeAsArray[0]) * 60 * 60 + Number(timeAsArray[1]) * 60 + Number(timeAsArray[2]);
        });
        archive.whiteTimes = clickTimes.filter((_, i) => i % 2 === 0);
        archive.blackTimes = clickTimes.filter((_, i) => i % 2 === 1);
      }

      // Remove the number like so "2..." between each move
      cleanedPgn = cleanedPgn.replace(/[0-9]+\.\.\. /g, '');

      archive.cleanedPgn = cleanedPgn;

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
        console.log("what is this opening " + archive.url);
        continue;
      }
    }

    //setHydratedArchives(filteredArchives);

    // Compute score at move 15
    (async () => {
      await sf.init((state: StockfishState) => {
        console.log(state.scores.length + "/" + filteredArchives.length);
        // While we don't have computed everything into sf state don't use it
        if (filteredArchives.length !== state.scores.length)
          return;

        // Updat ethe hydrated archives
        let i = 0;
        for (var archive of filteredArchives) {
          archive.scoreOutOfOpening = state.scores[i];
          i++;
        }
        setHydratedArchives(filteredArchives);
      });

      for (var archive of filteredArchives) {
        // Load the score on move 15
        var pgnArray = archive.cleanedPgn.split('.');
        let pgnMove15 = null;
        if (pgnArray.length <= 10)
          pgnMove15 = archive.cleanedPgn;
        else
          pgnMove15 = pgnArray.slice(0, 10).join(".").slice(0, -3);

        chess.load_pgn(pgnMove15);
        const fen = chess.fen();
        sf.computeFen(fen);
      }
    })();

  }, [archives]);

  useEffect(() => {
    if (!hydratedArchives || hydratedArchives.length == 0)
      return;
    // Set grid rows
    setGridRow(hydratedArchives.map((x, i) => ({
      id: i,
      url: x.url,
      color: x.playingWhite ? 'white' : 'black',
      result: getResultAsString(x.result),
      scoreAtMove15: (x.scoreOutOfOpening * (x.playingWhite ? 1 : -1) * 0.01).toFixed(2),
      endTime: new Date(x.end_time * 1000),
      opening: x.opening,
    })));
    setLoadingState(LoadingState.NotLoading);
  }, [hydratedArchives]);

  async function fetchGames() {
    setLoadingState(LoadingState.FetchingGames);
    // Fetch player info

    let responsePlayer;
    try {
      responsePlayer = await chessAPI.getPlayer(userName);
    } catch {
      setLoadingState(LoadingState.ErrorFetchingUser);
    }
    const userNameFixed = responsePlayer.body.url.slice(29); // Here we fix the potential capital cases that a username can have
    setUserName(userNameFixed);

    // Store name in localstorage to load it next time
    localStorage.setItem('userName', userNameFixed);

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
    setLoadingState(LoadingState.ComputingStats);
    setArchives(archiveTemp);
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
          <Button variant="contained" onClick={fetchGames} sx={{ m: 1 }} disabled={[LoadingState.FetchingGames, LoadingState.ComputingStats].includes(loadingState)}>
            {[LoadingState.FetchingGames, LoadingState.ComputingStats].includes(loadingState) ? "Computing..." : "Compute"}
          </Button>
        </Grid>
        {loadingState == LoadingState.ErrorFetchingUser ? <Alert severity="error">Error fetching games for this user</Alert> : null}


        {(!archives || archives.length == 0) ? <div>
          <PsychologyIcon sx={{ fontSize: 120, mt: 5 }} />
          {loadingState == LoadingState.NotLoading ? <p>Enter your username and select a time range</p> : null}
          {loadingState == LoadingState.FetchingGames ? <p>Fetching games from chess.com...</p> : null}
          {loadingState == LoadingState.ComputingStats ? <p>Computing statistics...</p> : null}
        </div> : null}

        <Openings archives={hydratedArchives}></Openings>
        <TimeManagement archives={hydratedArchives}></TimeManagement>
        <EndGame archives={hydratedArchives}></EndGame>

        <div style={{ height: "100vh", width: "100%", maxWidth: 900, marginTop: 30 }}>
          <GamesTable gridRow={gridRow}></GamesTable>
        </div>
      </div>
    </div >
  );
}

export default App;
