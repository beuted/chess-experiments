import { ChartData } from "chart.js";
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { HydratedChessComArchive } from "./ChessComArchive";
import InfoIcon from '@mui/icons-material/Info';
import { Card, Grid, Tooltip } from "@mui/material";


type TimeManagementProps = { archives: HydratedChessComArchive[] | undefined }

// Idea: Peut etre qu'on pourrait repére rles coup ou l'utilisateur passe du temps et voir si c'etait des coups décisif ou pas ?

export function TimeManagement(props: TimeManagementProps) {
  const [timeManagementData, setTimeManagementData] = useState<(ChartData<"pie", number[], unknown> & { options: any })>();

  useEffect(() => {
    if (!props.archives || props.archives.length == 0)
      return;
    // Check time management
    // If the user is behind in time for more than 25% of the initial time at some point
    // in the game we set the game as bad timeManagement, same for the opposite
    let userBehindInTime = 0
    let opponentBehindInTime = 0;
    for (let archive of props.archives) {
      let userClickTimes = [];
      let opponentClickTimes = [];
      if (archive.playingWhite) {
        userClickTimes = archive.whiteTimes;
        opponentClickTimes = archive.blackTimes;
      } else {
        userClickTimes = archive.blackTimes;
        opponentClickTimes = archive.whiteTimes;
      }

      let startTime = archive.whiteTimes[0];
      for (let i = 0; i < userClickTimes.length; i++) {

        if (userClickTimes[i] < opponentClickTimes[i] - startTime / 4) {
          userBehindInTime++;
          break;
        } else if (opponentClickTimes[i] < userClickTimes[i] - startTime / 4) {
          opponentBehindInTime++;
          break;
        }
      }
    }

    setTimeManagementData(getPieData(opponentBehindInTime, props.archives.length - userBehindInTime - opponentBehindInTime, userBehindInTime))
  }, [props.archives]);

  function getPieData(userBehindInTime: number, draw: number, lose: number) {
    return {
      labels: ['Ahead in Time', 'Even', 'Behind in Time'],
      datasets: [
        {
          label: "Time management",
          data: [userBehindInTime, draw, lose],
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
            text: "Time management"
          },
          datalabels: {
            display: false
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

  return (
    timeManagementData ?
      (<Card variant="outlined" sx={{ py: 3, width: "100%", maxWidth: 1200, mb: 2 }}>
        <h2 className="card-title">Time Management <Tooltip title="If the user is behind in time for more than 25% of the initial time at some point in the game we consider a poor time management if above 25% a good time management." arrow><InfoIcon></InfoIcon></Tooltip></h2>
        <Grid className="end-games-container">
          <div style={{ width: "220px" }}>
            <Pie data={timeManagementData} options={timeManagementData.options} />
          </div>
        </Grid>
      </Card>) : null
  )
}