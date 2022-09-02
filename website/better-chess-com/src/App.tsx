import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Chess } from 'chess.js'
import { Line, Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { StockfishService, StockfishState } from './stockfishService';

ChartJS.register(CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const sf = new StockfishService(9);

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

  useEffect(() => {
    (async () => {
      const chess = new Chess();

      sf.reset();
      await sf.init((state: StockfishState) => {
        //Just compute things at the end it's fine

        //data.datasets[0].data = state.scoreEvolution;
        //data.labels = Array.from(Array(data.datasets[0].data.length).keys()).map(x => '' + x);
        //setData(JSON.parse(JSON.stringify(data)));
      });

      chess.load_pgn("1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 Bf5 5. Bg5 e6 6. e3 h6 7. Bh4 Be7 8. Bd3 Bxd3 9. Qxd3 Bb4 10. Bxf6 Qxf6 11. O-O Nd7 12. a3 Ba5 13. b4 Bc7 14. c5 O-O 15. e4 Qg6 16. exd5 Qxd3 17. dxe6 fxe6 18. Na2 Qxa3 19. Nh4 Qb2 20. Ng6 Rxf2 21. Rxf2 Qxa1+ 22. Rf1 Qxa2 23. Ne7+ Kh7 24. Rf2 Qb1+ 25. Rf1 Qc2 26. Rf2 Qd1+ 27. Rf1 Qxd4+ 28. Rf2 Bxh2+ 29. Kf1 Qd1# 0-1");

      let fen: string | null = chess.fen();
      while (fen != null) {
        // GUI: tell the engine the position to search
        sf.computeFen(fen);

        var res = chess.undo();
        fen = res == null ? null : chess.fen();
      }

      while (!sf.isReady) {
        await new Promise<void>((success) => { setTimeout(() => { success() }, 1000) })
      }


      let state = sf.computeExtraAnalytics();

      data.datasets[0].data = state.scoreEvolution;
      data.labels = Array.from(Array(data.datasets[0].data.length).keys()).map(x => '' + x);
      setData(JSON.parse(JSON.stringify(data)));

      console.log(state)
    })();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
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
      </header>
    </div>
  );
}

export default App;
