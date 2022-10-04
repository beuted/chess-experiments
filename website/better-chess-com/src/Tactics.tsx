import { Box, Card, Grid, Tooltip } from "@mui/material";
import { ChartData } from "chart.js";
import { PieceColor, PieceType, Square } from "chess.js";
import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { getResult, HydratedChessComArchive } from "./ChessComArchive"
import InfoIcon from '@mui/icons-material/Info';
import { GridFilterModel } from "@mui/x-data-grid";
import FilterAltIcon from '@mui/icons-material/FilterAlt';


type TacticsProps = { archives: HydratedChessComArchive[] | undefined, setTableFilters: (filters: GridFilterModel) => void }

export function Tactics(props: TacticsProps) {
  const [tacticsBarChart, setTacticsBarChart] = useState<(ChartData<"bar", number[], unknown> & { options: any })>();

  useEffect(() => {
    if (!props.archives)
      return;

    let nbPlayerMistakes = 0;
    let nbOpponentMistakes = 0;
    let nbPlayerGoodMoves = 0;
    let nbOpponentGoodMoves = 0;

    for (var archive of props.archives) {
      console.log(archive.url, archive.scores, archive.moves);
      let prevScore = archive.scores[0];

      let i = 1;
      for (let score of archive.scores) {
        let whiteToPlay = i % 2 == 1;
        if (score - prevScore > 360) {
          if (archive.playingWhite) {
            if (whiteToPlay) {
              console.log("Bon coup joueur", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbPlayerGoodMoves++;
            } else {
              console.log("Mistake adversaire", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbOpponentMistakes++;
            }
          } else {
            if (whiteToPlay) {
              console.log("Bon coup adversaire", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbOpponentGoodMoves++;
            } else {
              console.log("Mistake joueur", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbPlayerMistakes++;
            }
          }
        } else if (score - prevScore < -360) {
          if (archive.playingWhite) {
            if (whiteToPlay) {
              console.log("Mistake joueur", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbPlayerMistakes++;
            } else {
              console.log("Bon coup adversaire", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbOpponentGoodMoves++;
            }
          } else {
            if (whiteToPlay) {
              console.log("Mistake adversaire", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbOpponentMistakes++;
            } else {
              console.log("Bon coup joueur", i, score - prevScore, archive.playingWhite, whiteToPlay);
              nbPlayerGoodMoves++;
            }
          }
        }
        prevScore = score;
        i++;
      }
    }

    let mistakesBarChart = getBarData("mistakes", { blunders: nbPlayerMistakes, mistakes: nbPlayerGoodMoves, inaccuracies: 0 }, { blunders: nbOpponentMistakes, mistakes: nbOpponentGoodMoves, inaccuracies: 0 });
    setTacticsBarChart(mistakesBarChart)
  }, [props.archives]);

  function getBarData(label: string, you: { blunders: number, mistakes: number, inaccuracies: number }, opponent: { blunders: number, mistakes: number, inaccuracies: number }) {
    return {
      labels: ['You', 'Opponents'],
      datasets: [
        {
          label: 'Blunder',
          data: [you.blunders, opponent.blunders],
          backgroundColor: '#D36446',
          borderWidth: 0,
        },
        {
          label: 'Mistakes',
          data: [you.mistakes, opponent.mistakes],
          backgroundColor: '#F2B14F',
          borderWidth: 0,
        },
        {
          label: 'Inaccuracies',
          data: [you.inaccuracies, opponent.inaccuracies],
          backgroundColor: '#F2E24F',
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
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      }
    }
  }

  function cpWinningChances(cp: number): number {
    return 2 / (1 + Math.exp(-0.004 * cp)) - 1;
  }

  return (
    props.archives && props.archives.length > 0 && !!tacticsBarChart ?
      <Card variant="outlined" sx={{ py: 3, width: "100%", maxWidth: 1200 }}>
        <h2 className="card-title">Tactics</h2>
        <Grid container direction="column" alignItems="center" justifyContent="center">
          <h3>Mistakes <Tooltip title="Compare your mistakes with the ones of your opponents" arrow><InfoIcon></InfoIcon></Tooltip></h3>
          <Box sx={{ width: 0.5 }} >
            <Bar data={tacticsBarChart} options={tacticsBarChart.options} />
          </Box>

        </Grid>
      </Card> : null
  )
}
