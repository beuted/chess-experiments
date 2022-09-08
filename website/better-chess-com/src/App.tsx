import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Chess, ChessInstance, ShortMove, Square } from 'chess.js'
import { Line, Chart, Pie } from 'react-chartjs-2';
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
import { ChessComArchive, getResult, HydratedChessComArchive } from './ChessComArchive';
import { FullOpenings } from './FullOpening';
import {
  DataGrid,
  GridSelectionModel,
  GridFilterModel,
  GridFilterItem,
  GridRowId,
  GridFilterOperator,
  GridStateColDef,
  GridCellParams,
  getGridDefaultColumnTypes,
  DEFAULT_GRID_COL_TYPE_KEY,
  GridToolbar,
  GridRowsProp,
  GridColDef,
  gridDateComparator,
  GridComparatorFn,
} from '@mui/x-data-grid';
import { url } from 'inspector';
import { renderLink } from './renderLink';
import { Box, Button, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';

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
  const [userName, setUserName] = useState<string>("nicolas-t");
  const [startDate, setStartDate] = useState<Date>(startDateDefault);
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [data, setData] = useState(defaultData);
  const [openingResultPiesWhite, setOpeningResultPiesWhite] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);
  const [openingResultPiesWhiteAll, setOpeningResultPiesWhiteAll] = useState<(ChartData<"pie", number[], unknown> & { options: any })>();
  const [openingResultPiesBlack, setOpeningResultPiesBlack] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);
  const [openingResultPiesBlackAll, setOpeningResultPiesBlackAll] = useState<(ChartData<"pie", number[], unknown> & { options: any })>();
  const [openingResultPiesWhiteDetailed, setOpeningResultPiesWhiteDetailed] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>();
  const [openingResultPiesBlackDetailed, setOpeningResultPiesBlackDetailed] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>();
  const [openingOpenWhite, setOpeningOpenWhite] = useState<boolean>(false);
  const [openingOpenBlack, setOpeningOpenBlack] = useState<boolean>(false);
  const [openingDetailsVariant, setOpeningDetailsVariant] = useState<string | null>(null);

  const [board, setBoard] = useState<ChessInstance>(new Chess());
  const [archives, setArchives] = useState<ChessComArchive[]>([]);
  const [filteredArchives, setFilteredArchives] = useState<HydratedChessComArchive[]>([]);
  const [gridRow, setGridRow] = useState<GridRowsProp>([]);

  useEffect(() => {
    (async () => {
      // Compute Stuff
      const chess = new Chess();

      sf.reset();
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
        sf.computeFen(fen);

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
      setData(JSON.parse(JSON.stringify(data)));
    })();
  }, []);

  useEffect(() => {
    // compute what archive we filter on
    setFilteredArchives(archives.filter(x => x.time_class == "rapid") as HydratedChessComArchive[]);
  }, [archives]);

  useEffect(() => {
    // opening stats
    let resultPerOpeningWhite: { [opening: string]: { win: number, lose: number, draw: number } } = {}
    let resultPerOpeningBlack: { [opening: string]: { win: number, lose: number, draw: number } } = {}
    let resultPerOpeningSimplifiedWhite: { [opening: string]: { win: number, lose: number, draw: number } } = {}
    let resultPerOpeningSimplifiedBlack: { [opening: string]: { win: number, lose: number, draw: number } } = {}

    for (var archive of filteredArchives) {

      // Remove description
      let cleanedPgn = archive.pgn.split('\n\n')[1];

      // Remove everything between "{[ ... ]}"
      cleanedPgn = cleanedPgn.replace(/\{\[[^\{\[\]\}]*\]\} /g, '');

      // Remove the number like so "2..." between each move
      cleanedPgn = cleanedPgn.replace(/[0-9]+\.\.\. /g, '');

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

      // Set the results per opening dic
      const result = getResult(archive.result);
      const openingSimplified = archive.opening.split(":")[0];

      if (archive.playingWhite) {
        // Full opening
        if (!resultPerOpeningWhite[archive.opening])
          resultPerOpeningWhite[archive.opening] = { win: 0, lose: 0, draw: 0 };

        // Simplified opening
        if (!resultPerOpeningSimplifiedWhite[openingSimplified])
          resultPerOpeningSimplifiedWhite[openingSimplified] = { win: 0, lose: 0, draw: 0 };

        if (result == 1) {
          resultPerOpeningSimplifiedWhite[openingSimplified].win++;
          resultPerOpeningWhite[archive.opening].win++;
        } else if (result == -1) {
          resultPerOpeningSimplifiedWhite[openingSimplified].lose++;
          resultPerOpeningWhite[archive.opening].lose++;
        } else if (result == 0) {
          resultPerOpeningSimplifiedWhite[openingSimplified].draw++;
          resultPerOpeningWhite[archive.opening].draw++;
        }
      } else {
        // Full opening
        if (!resultPerOpeningBlack[archive.opening])
          resultPerOpeningBlack[archive.opening] = { win: 0, lose: 0, draw: 0 };

        // Simplified opening
        if (!resultPerOpeningSimplifiedBlack[openingSimplified])
          resultPerOpeningSimplifiedBlack[openingSimplified] = { win: 0, lose: 0, draw: 0 };

        if (result == 1) {
          resultPerOpeningSimplifiedBlack[openingSimplified].win++;
          resultPerOpeningBlack[archive.opening].win++;
        } else if (result == -1) {
          resultPerOpeningSimplifiedBlack[openingSimplified].lose++;
          resultPerOpeningBlack[archive.opening].lose++;
        } else if (result == 0) {
          resultPerOpeningSimplifiedBlack[openingSimplified].draw++;
          resultPerOpeningBlack[archive.opening].draw++;
        }
      }
    }

    // Setup pie chart
    // * White
    const chartsWhite = [];
    for (var kvp of Object.entries(resultPerOpeningSimplifiedWhite).sort((a, b) => sortByGames(a[1], b[1]))) {
      const openingResultData = getPieData(kvp[0], kvp[1].win, kvp[1].draw, kvp[1].lose);
      chartsWhite.push(openingResultData);
    }
    const valuesWhite = Object.values(resultPerOpeningSimplifiedWhite).reduce((prev, curr) => ({ win: prev.win + curr.win, draw: prev.draw + curr.draw, lose: prev.lose + curr.lose }), { win: 0, draw: 0, lose: 0 });
    setOpeningResultPiesWhiteAll(getPieData("white", valuesWhite.win, valuesWhite.draw, valuesWhite.lose));
    setOpeningResultPiesWhite(chartsWhite);

    // * Black
    const chartsBlack = [];
    for (var kvp of Object.entries(resultPerOpeningSimplifiedBlack).sort((a, b) => sortByGames(a[1], b[1]))) {
      const openingResultData = getPieData(kvp[0], kvp[1].win, kvp[1].draw, kvp[1].lose);
      chartsBlack.push(openingResultData);
    }
    const valuesBlack = Object.values(resultPerOpeningSimplifiedBlack).reduce((prev, curr) => ({ win: prev.win + curr.win, draw: prev.draw + curr.draw, lose: prev.lose + curr.lose }), { win: 0, draw: 0, lose: 0 });
    setOpeningResultPiesBlackAll(getPieData("black", valuesBlack.win, valuesBlack.draw, valuesBlack.lose));
    setOpeningResultPiesBlack(chartsBlack);

    // * All White
    const chartsDetailedWhite = [];
    for (var kvp of Object.entries(resultPerOpeningWhite).sort((a, b) => sortByGames(a[1], b[1]))) {
      const openingResultData = getPieData(kvp[0], kvp[1].win, kvp[1].draw, kvp[1].lose);
      chartsDetailedWhite.push(openingResultData);
    }
    setOpeningResultPiesWhiteDetailed(chartsDetailedWhite);

    // * All Black
    const chartsDetailedBlack = [];
    for (var kvp of Object.entries(resultPerOpeningBlack).sort((a, b) => sortByGames(a[1], b[1]))) {
      const openingResultData = getPieData(kvp[0], kvp[1].win, kvp[1].draw, kvp[1].lose);
      chartsDetailedBlack.push(openingResultData);
    }
    setOpeningResultPiesBlackDetailed(chartsDetailedBlack);

    // Set gird rows

    setGridRow(filteredArchives.map((x, i) => ({
      id: i,
      url: x.url,
      color: x.playingWhite ? 'white' : 'black',
      endTime: new Date(x.end_time * 1000),
      opening: x.opening,
    })))

    const rows: GridRowsProp = [
      { id: 1, url: 'Hello', color: 'World' },
      { id: 2, url: 'DataGridPro', color: 'is Awesome' },
      { id: 3, url: 'MUI', color: 'is Amazing' },
    ];


  }, [filteredArchives]);

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
      console.log(y, m)
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

  function sortByGames(a: { win: number, draw: number, lose: number }, b: { win: number, draw: number, lose: number }) {
    return b.win + b.lose + b.draw - a.win - a.lose - a.draw
  }

  function getPieData(label: string, win: number, draw: number, lose: number) {
    return {
      labels: ['Win', 'Draw', 'Lose'],
      datasets: [
        {
          label: label,
          data: [win, draw, lose],
          backgroundColor: [
            '#7DCBBC',
            '#E4E4E4',
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

  const columns: GridColDef[] = [
    { field: 'url', headerName: 'Link', width: 325, renderCell: renderLink },
    { field: 'color', headerName: 'Color' },
    { field: 'endTime', headerName: 'End Time', sortComparator: gridDateComparator, renderCell: params => params.value.toLocaleDateString() },
    { field: 'opening', headerName: 'Opening', flex: 1 },
  ];

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
            type="date"
            defaultValue={startDate.toISOString().substring(0, 10)}
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
            type="date"
            InputProps={{ inputProps: { max: new Date().toISOString().substring(0, 10) } }}
            defaultValue={endDate.toISOString().substring(0, 10)}
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

        <Grid container className="openings">
          <div onClick={() => { setOpeningOpenWhite(!openingOpenWhite); setOpeningOpenBlack(false); setOpeningDetailsVariant(null); }}>
            <h2>As white</h2>
            {openingResultPiesWhiteAll ? (<div style={{ width: "220px" }} className={"clickable " + (openingOpenWhite || !openingOpenBlack ? "selected" : "")}>
              <Pie data={openingResultPiesWhiteAll} options={openingResultPiesWhiteAll.options} />
            </div>) : null}
          </div>

          <div onClick={() => { setOpeningOpenWhite(false); setOpeningOpenBlack(!openingOpenBlack); setOpeningDetailsVariant(null); }}>
            <h2>As black</h2>
            {openingResultPiesBlackAll ? (<div style={{ width: "220px" }} className={"clickable " + (openingOpenBlack || !openingOpenWhite ? "selected" : "")}>
              <Pie data={openingResultPiesBlackAll} options={openingResultPiesBlackAll.options} />
            </div>) : null}
          </div>
        </Grid>

        <div>
          {(openingOpenWhite || openingOpenBlack) ? (<h2>Main variants</h2>) : null}
          {openingOpenWhite ? (<Grid container className="opening-container">
            {openingResultPiesWhite.map(x =>
              <div
                key={x.datasets[0].label}
                className={"clickable " + (openingDetailsVariant == x.datasets[0].label || !openingDetailsVariant ? "selected" : "")}
                style={{ width: "180px", }}
                onClick={() => setOpeningDetailsVariant(x.datasets[0].label || null)}>
                <Pie data={x} options={x.options} />
              </div>
            )}
          </Grid>) : null}

          {openingOpenBlack ? (<Grid container className="opening-container">
            {openingResultPiesBlack.map(x =>
              <div
                key={x.datasets[0].label}
                className={"clickable " + (openingDetailsVariant == x.datasets[0].label || !openingDetailsVariant ? "selected" : "")}
                style={{ width: "180px", }}
                onClick={() => setOpeningDetailsVariant(x.datasets[0].label || null)}>
                <Pie data={x} options={x.options} />
              </div>
            )}
          </Grid>) : null}
        </div>

        <div>
          {openingDetailsVariant ? (<h2>Detailed variants</h2>) : null}

          {openingOpenWhite && openingResultPiesWhiteDetailed ? (<Grid container className="opening-container">
            {openingResultPiesWhiteDetailed.filter(x => x.options.plugins.title.text?.startsWith(openingDetailsVariant)).map(x =>
              <div key={x.datasets[0].label} style={{ width: "180px", }}>
                <Pie data={x} options={x.options} />
              </div>
            )}
          </Grid>) : null}

          {openingOpenBlack && openingResultPiesBlackDetailed ? (<Grid container className="opening-container">
            {openingResultPiesBlackDetailed.filter(x => x.options.plugins.title.text?.startsWith(openingDetailsVariant)).map(x =>
              <div key={x.datasets[0].label} style={{ width: "180px", }}>
                <Pie data={x} options={x.options} />
              </div>
            )}
          </Grid>) : null}
        </div>

        <h2>Games</h2>
        <div style={{ height: "100vh", width: "100%", maxWidth: 900, marginTop: 30 }}>
          <DataGrid
            disableSelectionOnClick
            columns={columns}
            rows={gridRow}
            {...data}
            components={{ Toolbar: GridToolbar }} />
        </div>


      </div>
    </div >
  );
}

export default App;
