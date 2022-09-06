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

ChartJS.register(CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ArcElement,
  Tooltip,
  Legend,
);

const userName = "dekajoo";

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

  const [data, setData] = useState(defaultData);
  const [openingResultPiesWhite, setOpeningResultPiesWhite] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);
  const [openingResultPiesBlack, setOpeningResultPiesBlack] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);

  const [board, setBoard] = useState<ChessInstance>(new Chess());
  const [archives, setArchives] = useState<ChessComArchive[]>([]);
  const [filteredArchives, setFilteredArchives] = useState<HydratedChessComArchive[]>([]);
  const [resultPerOpening, setResultPerOpening] = useState<{ [opening: string]: { win: number, lose: number, draw: number } }>({});
  const [resultPerOpeningSimplifiedWhite, setResultPerOpeningSimplifiedWhite] = useState<{ [opening: string]: { win: number, lose: number, draw: number } }>({});
  const [resultPerOpeningSimplifiedBlack, setResultPerOpeningSimplifiedBlack] = useState<{ [opening: string]: { win: number, lose: number, draw: number } }>({});

  useEffect(() => {
    (async () => {
      // Fetch all archives (for one month for now)
      chessAPI.getPlayerCompleteMonthlyArchives('dekajoo', 2022, 8)
        .then(function (response: any) {
          console.log('Player Profile', response.body);
          setArchives(response.body.games);
        }, function (err: any) {
          console.error(err);
        });

      // COmpute Stuff
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
          console.log(`${archive.url} => ${opening.name}, ${opening.eco}`);
          break;
        }
      }

      // Set the result
      if (archive.white.username == userName)
        archive.playingWhite = true;
      else
        archive.playingWhite = false;

      const playerSide = archive.playingWhite ? archive.white : archive.black;

      archive.result = playerSide.result;

      // Set the results per opening
      if (!resultPerOpening[archive.opening])
        resultPerOpening[archive.opening] = { win: 0, lose: 0, draw: 0 };

      const result = getResult(archive.result);
      if (result == 1) resultPerOpening[archive.opening].win++;
      if (result == -1) resultPerOpening[archive.opening].lose++;
      if (result == 0) resultPerOpening[archive.opening].draw++;
      setResultPerOpening(Object.assign({}, resultPerOpening));


      const openingSimplified = archive.opening.split(":")[0];

      if (archive.playingWhite) {
        if (!resultPerOpeningSimplifiedWhite[openingSimplified])
          resultPerOpeningSimplifiedWhite[openingSimplified] = { win: 0, lose: 0, draw: 0 };

        if (result == 1) resultPerOpeningSimplifiedWhite[openingSimplified].win++;
        if (result == -1) resultPerOpeningSimplifiedWhite[openingSimplified].lose++;
        if (result == 0) resultPerOpeningSimplifiedWhite[openingSimplified].draw++;
        setResultPerOpeningSimplifiedWhite(Object.assign({}, resultPerOpeningSimplifiedWhite));
      } else {
        if (!resultPerOpeningSimplifiedBlack[openingSimplified])
          resultPerOpeningSimplifiedBlack[openingSimplified] = { win: 0, lose: 0, draw: 0 };

        if (result == 1) resultPerOpeningSimplifiedBlack[openingSimplified].win++;
        if (result == -1) resultPerOpeningSimplifiedBlack[openingSimplified].lose++;
        if (result == 0) resultPerOpeningSimplifiedBlack[openingSimplified].draw++;
        setResultPerOpeningSimplifiedBlack(Object.assign({}, resultPerOpeningSimplifiedBlack));
      }
    }


    // Setup pie chart
    var chartsWhite = [];
    for (var kvp of Object.entries(resultPerOpeningSimplifiedWhite).sort((a, b) => sortByGames(a[1], b[1])).slice(0, 5)) {
      const openingResultData = getPieData(kvp[0], kvp[1].win, kvp[1].draw, kvp[1].lose);
      chartsWhite.push(openingResultData)
    }
    setOpeningResultPiesWhite(chartsWhite);

    var chartsBlack = [];
    for (var kvp of Object.entries(resultPerOpeningSimplifiedBlack).sort((a, b) => sortByGames(a[1], b[1])).slice(0, 5)) {
      const openingResultData = getPieData(kvp[0], kvp[1].win, kvp[1].draw, kvp[1].lose);
      chartsBlack.push(openingResultData)
    }
    setOpeningResultPiesBlack(chartsBlack);

  }, [filteredArchives]);

  function sortByGames(a: {win: number, draw: number, lose: number}, b: {win: number, draw: number, lose: number}) {
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

  return (
    <div className="App">
      <header className="app-container">
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

        {false ?? <ul>
          {filteredArchives.map(x =>
            (<li key={x.url}><a href={x.url}>{x.url}</a></li>)
          )}
        </ul>}

        <h2>As white</h2>
        <div className="opening-container">
          {openingResultPiesWhite.map(x =>
            <div key={x.datasets[0].label} style={{ width: "220px", }}>
              <Pie data={x} options={x.options} />
            </div>
          )}
        </div>

        <h2>As black</h2>
        <div className="opening-container">
          {openingResultPiesBlack.map(x =>
            <div key={x.datasets[0].label} style={{ width: "220px", }}>
              <Pie data={x} options={x.options} />
            </div>
          )}
        </div>
      </header >
    </div >
  );
}

export default App;
