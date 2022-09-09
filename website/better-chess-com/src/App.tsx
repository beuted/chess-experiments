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
import { Button, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { GamesTable } from './GamesTable';
import { Openings } from './Openings';

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
  const [userName, setUserName] = useState<string>("difiouzz");
  const [startDate, setStartDate] = useState<Date>(startDateDefault);
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [useEarlyAdvantageOverResult, setUseEarlyAdvantageOverResult] = useState<boolean>(false);


  const [data, setData] = useState(defaultData);

  const [board, setBoard] = useState<ChessInstance>(new Chess());
  const [archives, setArchives] = useState<ChessComArchive[]>([]);
  const [hydratedArchives, setHydratedArchives] = useState<HydratedChessComArchive[]>([]);
  const [gridRow, setGridRow] = useState<GridRowsProp>([]);




  useEffect(() => {
    (async () => {
      // Compute Stuff
      /*const chess = new Chess();

      sf.reset();
      console.log("sf has been reset");
      await sf.init((state: StockfishState) => {
        //Just compute things at the end it's fine

        //data.datasets[0].data = state.scoreEvolution;
        //data.labels = Array.from(Array(data.datasets[0].data.length).keys()).map(x => '' + x);
        //setData(JSON.parse(JSON.stringify(data)));
      });

      chess.load_pgn("1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 Bf5 5. Bg5 e6 6. e3 h6 7. Bh4 Be7 8. Bd3 Bxd3 9. Qxd3 Bb4 10. Bxf6 Qxf6 11. O-O Nd7 12. a3 Ba5 13. b4 Bc7 14. c5 O-O 15. e4 Qg6 16. exd5 Qxd3 17. dxe6 fxe6 18. Na2 Qxa3 19. Nh4 Qb2 20. Ng6 Rxf2 21. Rxf2 Qxa1+ 22. Rf1 Qxa2 23. Ne7+ Kh7 24. Rf2 Qb1+ 25. Rf1 Qc2 26. Rf2 Qd1+ 27. Rf1 Qxd4+ 28. Rf2 Bxh2+ 29. Kf1 Qd1# 0-1");

      let fen: string | undefined = chess.fen();
      while (fen != undefined) {
        // GUI: tell the engine the position to search
        //sf.computeFen("r4rk1/ppp1nppp/7b/4Pb2/8/3B4/PP4PP/RN3R1K w - - 0 16");

        var res = chess.undo();
        fen = res == null ? undefined : chess.fen();
        setBoard({ ...chess });
      }

      while (!sf.isReady) {
        await new Promise<void>((success) => { setTimeout(() => { success() }, 1000) })
      }

      let state = sf.computeExtraAnalytics();

      data.datasets[0].data = state.scoreEvolution;
      data.labels = Array.from(Array(data.datasets[0].data.length).keys()).map(x => '' + x);
      setData(JSON.parse(JSON.stringify(data)));*/
    })();
  }, []);

  useEffect(() => {
    const chess = new Chess();
    // compute what archive we filter on
    var filteredArchives = archives.filter(x => x.time_class == "rapid") as HydratedChessComArchive[];

    // opening stats
    for (var archive of filteredArchives) {
      // Remove description
      let cleanedPgn = archive.pgn.split('\n\n')[1];

      // Remove everything between "{[ ... ]}"
      cleanedPgn = cleanedPgn.replace(/\{\[[^\{\[\]\}]*\]\} /g, '');

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
        console.log(filteredArchives);
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

        console.log(pgnMove15)
        chess.load_pgn(pgnMove15);
        const fen = chess.fen();
        sf.computeFen(fen);
      }
    })();

  }, [archives]);

  useEffect(() => {
    // Set grid rows
    setGridRow(hydratedArchives.map((x, i) => ({
      id: i,
      url: x.url,
      color: x.playingWhite ? 'white' : 'black',
      result: getResultAsString(x.result),
      scoreAtMove15: (x.scoreOutOfOpening * (x.playingWhite ? 1 : -1) * 0.01).toFixed(2),
      endTime: new Date(x.end_time * 1000),
      opening: x.opening,
    })))
  }, [hydratedArchives]);

  async function fetchGames() {
    // Fetch player info
    const responsePlayer = await chessAPI.getPlayer(userName);
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
          <Button variant="contained" onClick={fetchGames} sx={{ m: 1 }}>Compute</Button>
        </Grid>

        <Button variant="contained" onClick={() => setUseEarlyAdvantageOverResult(!useEarlyAdvantageOverResult)} sx={{ m: 1 }}>{useEarlyAdvantageOverResult ? "Use result of the game" : "Use advantage out of opening (move 10)"}</Button>
        <Openings archives={hydratedArchives} useEarlyAdvantageOverResult={useEarlyAdvantageOverResult}></Openings>

        <h2>Games</h2>
        <div style={{ height: "100vh", width: "100%", maxWidth: 900, marginTop: 30 }}>
          <GamesTable gridRow={gridRow}></GamesTable>
        </div>
      </div>
    </div >
  );
}

export default App;
