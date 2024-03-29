import { Box, Card, Grid, Tooltip, Button, Typography } from "@mui/material";
import { ChartData } from "chart.js";
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { HydratedChessComArchive } from "./ChessComArchive"
import InfoIcon from '@mui/icons-material/Info';
import Badge from '@mui/material/Badge';
import { Link } from "react-router-dom";
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

type TacticsProps = { archives: HydratedChessComArchive[] | undefined }

export function Tactics(props: TacticsProps) {
  const [tacticsBarChart, setTacticsBarChart] = useState<(ChartData<"bar", number[], unknown> & { options: any })>();
  const [tacticsBarChartEarly, setTacticsBarChartEarly] = useState<(ChartData<"bar", number[], unknown> & { options: any })>();
  const [tacticsBarChartMid, setTacticsBarChartMid] = useState<(ChartData<"bar", number[], unknown> & { options: any })>();
  const [tacticsBarChartLate, setTacticsBarChartLate] = useState<(ChartData<"bar", number[], unknown> & { options: any })>();
  const [showMistakesPerStage, setShowMistakesPerStage] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<number>(0);

  useEffect(() => {
    if (!props.archives)
      return;

    let nbPlayerMistakes = 0;
    let nbPlayerMissedGain = 0;
    let nbPlayerGoodMoves = 0;
    let nbOpponentMistakes = 0;
    let nbOpponentMissedGain = 0;
    let nbOpponentGoodMoves = 0;


    let nbPlayerMistakesEarly = 0;
    let nbPlayerMissedGainEarly = 0;
    let nbPlayerGoodMovesEarly = 0;
    let nbOpponentMistakesEarly = 0;
    let nbOpponentMissedGainEarly = 0;
    let nbOpponentGoodMovesEarly = 0;

    let nbPlayerMistakesMid = 0;
    let nbPlayerMissedGainMid = 0;
    let nbPlayerGoodMovesMid = 0;
    let nbOpponentMistakesMid = 0;
    let nbOpponentMissedGainMid = 0;
    let nbOpponentGoodMovesMid = 0;

    let nbPlayerMistakesLate = 0;
    let nbPlayerMissedGainLate = 0;
    let nbPlayerGoodMovesLate = 0;
    let nbOpponentMistakesLate = 0;
    let nbOpponentMissedGainLate = 0;
    let nbOpponentGoodMovesLate = 0;

    let totalMoves = 0;
    let diff = 0;
    for (var archive of props.archives) {
      let start = archive.playingWhite ? 0 : 1;
      for (let scoreIndex = start; scoreIndex < archive.scores.length - 1; scoreIndex += 2) {
        diff += Math.max(0, (archive.scores[scoreIndex + 1] - archive.scores[scoreIndex]) * (archive.playingWhite ? -1 : 1));
        totalMoves++;
      }

      // Main chart
      nbPlayerMistakes += archive.mistakesPlayer.length;
      nbPlayerMissedGain += archive.missedGainPlayer.length;
      nbPlayerGoodMoves += archive.goodMovePlayer.length;
      nbOpponentMistakes += archive.mistakesOpponent.length;
      nbOpponentMissedGain += archive.missedGainOpponent.length;
      nbOpponentGoodMoves += archive.goodMoveOpponent.length;

      // Early Game Chart
      nbPlayerMistakesEarly += archive.mistakesPlayer.filter(x => x <= 15).length;
      nbPlayerMissedGainEarly += archive.missedGainPlayer.filter(x => x <= 15).length;
      nbPlayerGoodMovesEarly += archive.goodMovePlayer.filter(x => x <= 15).length;
      nbOpponentMistakesEarly += archive.mistakesOpponent.filter(x => x <= 15).length;
      nbOpponentMissedGainEarly += archive.missedGainOpponent.filter(x => x <= 15).length;
      nbOpponentGoodMovesEarly += archive.goodMoveOpponent.filter(x => x <= 15).length;

      // Mid game Chart
      nbPlayerMistakesMid += archive.mistakesPlayer.filter(x => x > 15 && x < 30).length;
      nbPlayerMissedGainMid += archive.missedGainPlayer.filter(x => x > 15 && x < 30).length;
      nbPlayerGoodMovesMid += archive.goodMovePlayer.filter(x => x > 15 && x < 30).length;
      nbOpponentMistakesMid += archive.mistakesOpponent.filter(x => x > 15 && x < 30).length;
      nbOpponentMissedGainMid += archive.missedGainOpponent.filter(x => x > 15 && x < 30).length;
      nbOpponentGoodMovesMid += archive.goodMoveOpponent.filter(x => x > 15 && x < 30).length;

      // Late chart // TODO maybe we could determine the move when to start the "endgame" aka Final
      nbPlayerMistakesLate += archive.mistakesPlayer.filter(x => x > 15 && x >= 30).length;
      nbPlayerMissedGainLate += archive.missedGainPlayer.filter(x => x > 15 && x >= 30).length;
      nbPlayerGoodMovesLate += archive.goodMovePlayer.filter(x => x > 15 && x >= 30).length;
      nbOpponentMistakesLate += archive.mistakesOpponent.filter(x => x > 15 && x >= 30).length;
      nbOpponentMissedGainLate += archive.missedGainOpponent.filter(x => x > 15 && x >= 30).length;
      nbOpponentGoodMovesLate += archive.goodMoveOpponent.filter(x => x > 15 && x >= 30).length;
    }

    setAccuracy(diff / totalMoves / 100);

    let mistakesBarChart = getBarData("Mistakes", { blunders: nbPlayerMistakes, missedGain: nbPlayerMissedGain }, { blunders: nbOpponentMistakes, missedGain: nbOpponentMissedGain });
    setTacticsBarChart(mistakesBarChart)

    let mistakesBarChartEarly = getBarData("Mistakes opening", { blunders: nbPlayerMistakesEarly, missedGain: nbPlayerMissedGainEarly }, { blunders: nbOpponentMistakesEarly, missedGain: nbOpponentMissedGainEarly });
    setTacticsBarChartEarly(mistakesBarChartEarly)

    let mistakesBarChartMid = getBarData("Mistakes mid game", { blunders: nbPlayerMistakesMid, missedGain: nbPlayerMissedGainMid }, { blunders: nbOpponentMistakesMid, missedGain: nbOpponentMissedGainMid });
    setTacticsBarChartMid(mistakesBarChartMid)

    let mistakesBarChartLate = getBarData("Mistakes late game", { blunders: nbPlayerMistakesLate, missedGain: nbPlayerMissedGainLate }, { blunders: nbOpponentMistakesLate, missedGain: nbOpponentMissedGainLate });
    setTacticsBarChartLate(mistakesBarChartLate)

  }, [props.archives]);

  function getBarData(label: string, you: { blunders: number, missedGain: number }, opponent: { blunders: number, missedGain: number }) {
    return {
      labels: ['You', 'Opponents'],
      datasets: [
        {
          label: 'Blunder',
          data: [you.blunders, opponent.blunders],
          backgroundColor: '#D36446', //ca3431
          borderWidth: 0,
        },
        {
          label: 'Missed gain',
          data: [you.missedGain, opponent.missedGain],
          backgroundColor: '#F2B14F', //f7c045
          borderWidth: 0,
        },
        /*        {
                  label: 'Good moves',
                  data: [you.goodMoves, opponent.goodMoves],
                  backgroundColor: '#5f9bbc',
                  borderWidth: 0,
                },*/
      ],
      options: {
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: label
          },
          tooltip: {
            callbacks: {
              label: (item: any) => `${item.dataset.label}: ${Number(item.raw)} / ${props.archives?.length || 1}`,
            },
          },
          datalabels: {
            display: true,
            align: 'center',
            anchor: 'center',
            formatter: (item: any) => item == 0 ? '' : `${(item / (props.archives?.length || 1)).toFixed(1)}`,
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
        }
      }
    }
  }

  return (
    props.archives && props.archives.length > 0 && !!tacticsBarChart && !!tacticsBarChartEarly && !!tacticsBarChartMid && !!tacticsBarChartLate ?
      <Card variant="outlined" sx={{ py: 3, width: "100%", maxWidth: 1200, mb: 2 }}>
        <h2 className="card-title">Tactics</h2>
        <Tooltip title="Average pawn loss per move, the closer you are to zero the more accurate you are" arrow>
          <Grid container direction="row" alignItems="center" justifyContent="center" sx={{ color: accuracy > 3 ? '#d36446' : accuracy > 1.5 ? '#f2b14f' : '#7dcbbc' }}>
            <TrackChangesIcon fontSize="large" sx={{ mr: 1 }} />
            <Typography variant="h5" >{accuracy.toFixed(2)} pawns</Typography>
          </Grid>
        </Tooltip>
        <Grid container direction="column" alignItems="center" justifyContent="center">
          <h3>Mistakes <Tooltip title="Average mistakes you and your opponents are doing per game" arrow><InfoIcon></InfoIcon></Tooltip></h3>

          <Box sx={{ maxWidth: 500, width: '100%' }} >
            <Bar data={tacticsBarChart} options={tacticsBarChart.options} onClick={() => setShowMistakesPerStage(!showMistakesPerStage)} className="cursorPointer" />
          </Box>
          {showMistakesPerStage ? (<><h3>Mistakes by game stage</h3>
            <Grid container direction="row" alignItems="center" justifyContent="space-evenly">
              <Box sx={{ maxWidth: 300, width: '100%' }} >
                <Bar data={tacticsBarChartEarly} options={tacticsBarChartEarly.options} />
              </Box>
              <Box sx={{ maxWidth: 300, width: '100%' }} >
                <Bar data={tacticsBarChartMid} options={tacticsBarChartMid.options} />
              </Box>
              <Box sx={{ maxWidth: 300, width: '100%' }} >
                <Bar data={tacticsBarChartLate} options={tacticsBarChartLate.options} />
              </Box>
            </Grid>
          </>) : null}
          <Box sx={{ typography: 'body1', mt: 1, fontStyle: 'italic' }}>Click the charts for more details</Box>
          <Badge color="secondary" badgeContent={"bêta"} sx={{ mt: 8 }}>
            <Button variant="contained" component={Link} to={'/board'}> <TrackChangesIcon sx={{ mr: 1 }} />Replay missed gains</Button>
          </Badge>
        </Grid>
      </Card > : null
  )
}
