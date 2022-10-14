import { Box, Card, Grid, Tooltip } from "@mui/material";
import { ChartData } from "chart.js";
import { PieceColor, PieceType, Square } from "chess.js";
import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { getResult, HydratedChessComArchive } from "./ChessComArchive"
import InfoIcon from '@mui/icons-material/Info';
import { GridFilterModel } from "@mui/x-data-grid";
import FilterAltIcon from '@mui/icons-material/FilterAlt';


type AdvantageProps = { archives: HydratedChessComArchive[] | undefined }

export function Advantage(props: AdvantageProps) {
  const [tacticsBarChart, setTacticsBarChart] = useState<(ChartData<"bar", number[], unknown> & { options: any })>();
  const [resourcefulnessBarChart, setResourcefulnessBarChart] = useState<(ChartData<"bar", number[], unknown> & { options: any })>();

  useEffect(() => {
    if (!props.archives || props.archives.length === 0)
      return;

    let plus1point5Win = 0;
    let plus1point5Total = 0;
    let plus3Win = 0;
    let plus3Total = 0;
    let plus5Win = 0;
    let plus5Total = 0;
    let plus7Win = 0;
    let plus7Total = 0;

    let opponentPlus1point5Win = 0;
    let opponentPlus1point5Total = 0;
    let opponentPlus3Win = 0;
    let opponentPlus3Total = 0;
    let opponentPlus5Win = 0;
    let opponentPlus5Total = 0;
    let opponentPlus7Win = 0;
    let opponentPlus7Total = 0;

    let minus1point5Win = 0;
    let minus1point5Total = 0;
    let minus3Win = 0;
    let minus3Total = 0;
    let minus5Win = 0;
    let minus5Total = 0;
    let minus7Win = 0;
    let minus7Total = 0;

    let opponentMinus1point5Win = 0;
    let opponentMinus1point5Total = 0;
    let opponentMinus3Win = 0;
    let opponentMinus3Total = 0;
    let opponentMinus5Win = 0;
    let opponentMinus5Total = 0;
    let opponentMinus7Win = 0;
    let opponentMinus7Total = 0;

    for (let archive of props.archives) {
      const scores = archive.scores.slice(0, -3);

      // Advantage player
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 700)) {
        if (getResult(archive.result) == 1)
          plus7Win += 1;
        plus7Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 500)) {
        if (getResult(archive.result) == 1)
          plus5Win += 1;
        plus5Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 300)) {
        if (getResult(archive.result) == 1)
          plus3Win += 1;
        plus3Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 150)) {
        if (getResult(archive.result) == 1)
          plus1point5Win += 1;
        plus1point5Total += 1;
      }

      // Advantage opponent
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 700)) {
        if (getResult(archive.result) == -1)
          opponentPlus7Win += 1;
        opponentPlus7Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 500)) {
        if (getResult(archive.result) == -1)
          opponentPlus5Win += 1;
        opponentPlus5Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 300)) {
        if (getResult(archive.result) == -1)
          opponentPlus3Win += 1;
        opponentPlus3Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 150)) {
        if (getResult(archive.result) == -1)
          opponentPlus1point5Win += 1;
        opponentPlus1point5Total += 1;
      }

      // Resourcefulness player
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -700)) {
        if (getResult(archive.result) == 1)
          minus7Win += 1;
        minus7Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -500)) {
        if (getResult(archive.result) == 1)
          minus5Win += 1;
        minus5Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -300)) {
        if (getResult(archive.result) == 1)
          minus3Win += 1;
        minus3Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -150)) {
        if (getResult(archive.result) == 1)
          minus1point5Win += 1;
        minus1point5Total += 1;
      }

      // Resourcefulness opponent
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -700)) {
        if (getResult(archive.result) == -1)
          opponentMinus7Win += 1;
        opponentMinus7Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -500)) {
        if (getResult(archive.result) == -1)
          opponentMinus5Win += 1;
        opponentMinus5Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -300)) {
        if (getResult(archive.result) == -1)
          opponentMinus3Win += 1;
        opponentMinus3Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -150)) {
        if (getResult(archive.result) == -1)
          opponentMinus1point5Win += 1;
        opponentMinus1point5Total += 1;
      }
    }

    let mistakesBarChart = getBarData("Conversion",
      { plus1point5: plus1point5Win / plus1point5Total, plus3: plus3Win / plus3Total, plus5: plus5Win / plus5Total, plus7: plus7Win / plus7Total },
      { plus1point5: opponentPlus1point5Win / opponentPlus1point5Total, plus3: opponentPlus3Win / opponentPlus3Total, plus5: opponentPlus5Win / opponentPlus5Total, plus7: opponentPlus7Win / opponentPlus7Total });
    setTacticsBarChart(mistakesBarChart)

    let resourcefulnessBarChart = getBarData("Resourcefulness",
      { plus1point5: minus1point5Win / minus1point5Total, plus3: minus3Win / minus3Total, plus5: minus5Win / minus5Total, plus7: minus7Win / minus7Total },
      { plus1point5: opponentMinus1point5Win / opponentMinus1point5Total, plus3: opponentMinus3Win / opponentMinus3Total, plus5: opponentMinus5Win / opponentMinus5Total, plus7: opponentMinus7Win / opponentMinus7Total }, true);
    setResourcefulnessBarChart(resourcefulnessBarChart)

  }, [props.archives]);


  function getBarData(label: string, you: { plus1point5: number, plus3: number, plus5: number, plus7: number }, opponent: { plus1point5: number, plus3: number, plus5: number, plus7: number }, neg = false) {
    const sign = neg ? '-' : '+';
    return {
      labels: ['You', 'Opponents'],
      datasets: [
        {
          label: `${sign}2.0`,
          data: [you.plus1point5 * 100, opponent.plus1point5 * 100],
          backgroundColor: '#bfd7e4',
          borderWidth: 0,
        },
        {
          label: `${sign}3.0`,
          data: [you.plus3 * 100, opponent.plus3 * 100],
          backgroundColor: '#9fc3d6',
          borderWidth: 0,
        },
        {
          label: `${sign}5.0`,
          data: [you.plus5 * 100, opponent.plus5 * 100],
          backgroundColor: '#7eafc9',
          borderWidth: 0,
        },
        {
          label: `${sign}7.0`,
          data: [you.plus7 * 100, opponent.plus7 * 100],
          backgroundColor: '#5f9bbc',
          borderWidth: 0,
        },
      ],
      options: {
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: false,
            text: label
          },
          tooltip: {
            callbacks: {
              label: (item: any) => `After ${item.dataset.label}: ${Number(item.raw).toFixed(1)}% `,
            },
          },
          datalabels: {
            display: true,
            align: 'center',
            anchor: 'center',
            formatter: (item: any) => item == 0 ? '' : `${Number(item).toFixed(1)}% `,
            color: '#ffffffcc',
            font: {
              weight: 'bold'
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false,
            }
          },
          y: {
            stacked: true,
            display: false,
            grid: {
              display: false
            }
          },
        },
      }
    }
  }

  return (
    props.archives && props.archives.length > 0 && !!tacticsBarChart && !!resourcefulnessBarChart ?
      <Card variant="outlined" sx={{ py: 3, width: "100%", maxWidth: 1200, mb: 2 }}>
        <h2 className="card-title">Advantage & disadvantage</h2>
        <Grid container direction="row" alignItems="center" justifyContent="space-around">
          <Grid container direction="column" alignItems="center" justifyContent="center" sx={{ width: 0.4, minWidth: 500 }}>
            <h3>Conversion of advantage <Tooltip title="The % of games you or your opponent manage to win after taking given advantage" arrow><InfoIcon></InfoIcon></Tooltip></h3>
            <Box sx={{ width: 500 }}>
              <Bar data={tacticsBarChart} options={tacticsBarChart.options} />
            </Box>
          </Grid>

          <Grid container direction="column" alignItems="center" justifyContent="center" sx={{ width: 0.4, minWidth: 500 }}>
            <h3>Resourcefulness <Tooltip title="The % of games you or your opponent manage to win after being in disadvantage" arrow><InfoIcon></InfoIcon></Tooltip></h3>
            <Box sx={{ width: 500 }}>
              <Bar data={resourcefulnessBarChart} options={resourcefulnessBarChart.options} />
            </Box>
          </Grid>
        </Grid>
      </Card> : null
  );
}