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
    let plus2Win = 0;
    let plus2Total = 0;
    let plus3Win = 0;
    let plus3Total = 0;
    let plus4Win = 0;
    let plus4Total = 0;

    let opponentPlus1point5Win = 0;
    let opponentPlus1point5Total = 0;
    let opponentPlus2Win = 0;
    let opponentPlus2Total = 0;
    let opponentPlus3Win = 0;
    let opponentPlus3Total = 0;
    let opponentPlus4Win = 0;
    let opponentPlus4Total = 0;

    let minus1point5Win = 0;
    let minus1point5Total = 0;
    let minus2Win = 0;
    let minus2Total = 0;
    let minus3Win = 0;
    let minus3Total = 0;
    let minus4Win = 0;
    let minus4Total = 0;

    let opponentMinus1point5Win = 0;
    let opponentMinus1point5Total = 0;
    let opponentMinus2Win = 0;
    let opponentMinus2Total = 0;
    let opponentMinus3Win = 0;
    let opponentMinus3Total = 0;
    let opponentMinus4Win = 0;
    let opponentMinus4Total = 0;

    for (let archive of props.archives) {
      const scores = archive.scores.slice(0, -3);

      console.log(archive.url, getResult(archive.result), scores);
      // Advantage player
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 4000)) {
        if (getResult(archive.result) == 1)
          plus4Win += 1;
        plus4Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 3000)) {
        if (getResult(archive.result) == 1)
          plus3Win += 1;
        plus3Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 2000)) {
        if (getResult(archive.result) == 1)
          plus2Win += 1;
        plus2Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) > 1500)) {
        if (getResult(archive.result) == 1)
          plus1point5Win += 1;
        plus1point5Total += 1;
      }

      // Advantage opponent
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 4000)) {
        if (getResult(archive.result) == -1)
          opponentPlus4Win += 1;
        opponentPlus4Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 3000)) {
        if (getResult(archive.result) == -1)
          opponentPlus3Win += 1;
        opponentPlus3Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 2000)) {
        if (getResult(archive.result) == -1)
          opponentPlus2Win += 1;
        opponentPlus2Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) > 1500)) {
        if (getResult(archive.result) == -1)
          opponentPlus1point5Win += 1;
        opponentPlus1point5Total += 1;
      }

      // Resourcefulness player
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -4000)) {
        if (getResult(archive.result) == 1)
          minus4Win += 1;
        minus4Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -3000)) {
        if (getResult(archive.result) == 1)
          minus3Win += 1;
        minus3Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -2000)) {
        if (getResult(archive.result) == 1)
          minus2Win += 1;
        minus2Total += 1;
      }
      if (scores.find(x => x * (archive.playingWhite ? 1 : -1) < -1500)) {
        if (getResult(archive.result) == 1)
          minus1point5Win += 1;
        minus1point5Total += 1;
      }

      // Resourcefulness opponent
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -4000)) {
        if (getResult(archive.result) == -1)
          opponentMinus4Win += 1;
        opponentMinus4Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -3000)) {
        if (getResult(archive.result) == -1)
          opponentMinus3Win += 1;
        opponentMinus3Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -2000)) {
        if (getResult(archive.result) == -1)
          opponentMinus2Win += 1;
        opponentMinus2Total += 1;
      }
      if (scores.find(x => x * (!archive.playingWhite ? 1 : -1) < -1500)) {
        if (getResult(archive.result) == -1)
          opponentMinus1point5Win += 1;
        opponentMinus1point5Total += 1;
      }
    }
    console.log(
      opponentMinus1point5Win,
      opponentMinus1point5Total,
      props.archives.length
    );

    let mistakesBarChart = getBarData("Conversion",
      { plus1point5: plus1point5Win / plus1point5Total, plus2: plus2Win / plus2Total, plus3: plus3Win / plus3Total, plus4: plus4Win / plus4Total },
      { plus1point5: opponentPlus1point5Win / opponentPlus1point5Total, plus2: opponentPlus2Win / opponentPlus2Total, plus3: opponentPlus3Win / opponentPlus3Total, plus4: opponentPlus4Win / opponentPlus4Total });
    setTacticsBarChart(mistakesBarChart)

    let resourcefulnessBarChart = getBarData("Resourcefulness",
      { plus1point5: minus1point5Win / minus1point5Total, plus2: minus2Win / minus2Total, plus3: minus3Win / minus3Total, plus4: minus4Win / minus4Total },
      { plus1point5: opponentMinus1point5Win / opponentMinus1point5Total, plus2: opponentMinus2Win / opponentMinus2Total, plus3: opponentMinus3Win / opponentMinus3Total, plus4: opponentMinus4Win / opponentMinus4Total }, true);
    setResourcefulnessBarChart(resourcefulnessBarChart)

  }, [props.archives]);


  function getBarData(label: string, you: { plus1point5: number, plus2: number, plus3: number, plus4: number }, opponent: { plus1point5: number, plus2: number, plus3: number, plus4: number }, neg = false) {
    const sign = neg ? '-' : '+';
    return {
      labels: ['You', 'Opponents'],
      datasets: [
        {
          label: `${sign}1.5`,
          data: [you.plus1point5 * 100, opponent.plus1point5 * 100],
          backgroundColor: '#bfd7e4',
          borderWidth: 0,
        },
        {
          label: `${sign}2`,
          data: [you.plus2 * 100, opponent.plus2 * 100],
          backgroundColor: '#9fc3d6',
          borderWidth: 0,
        },
        {
          label: `${sign}3`,
          data: [you.plus3 * 100, opponent.plus3 * 100],
          backgroundColor: '#7eafc9',
          borderWidth: 0,
        },
        {
          label: `${sign}4`,
          data: [you.plus4 * 100, opponent.plus4 * 100],
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
        <Grid container direction="column" alignItems="center" justifyContent="center">
          <h3>Conversion of advantage <Tooltip title="The % of games you or your opponent manage to win after taking given advantage" arrow><InfoIcon></InfoIcon></Tooltip></h3>
          <Box sx={{ width: 0.5 }} >
            <Bar data={tacticsBarChart} options={tacticsBarChart.options} />
          </Box>
        </Grid>

        <Grid container direction="column" alignItems="center" justifyContent="center">
          <h3>Resourcefulness <Tooltip title="The % of games you or your opponent manage to win after being in disadvantage" arrow><InfoIcon></InfoIcon></Tooltip></h3>
          <Box sx={{ width: 0.5 }} >
            <Bar data={resourcefulnessBarChart} options={resourcefulnessBarChart.options} />
          </Box>
        </Grid>
      </Card> : null
  );
}