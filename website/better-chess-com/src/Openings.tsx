import { Button, Grid } from "@mui/material";
import { ChartData } from "chart.js";
import { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { getResult, HydratedChessComArchive } from "./ChessComArchive";

type OpeningsProps = { archives: HydratedChessComArchive[], useEarlyAdvantageOverResult: boolean }

export function Openings(props: OpeningsProps) {
  const [openingOpenWhite, setOpeningOpenWhite] = useState<boolean>(false);
  const [openingOpenBlack, setOpeningOpenBlack] = useState<boolean>(false);
  const [openingDetailsVariant, setOpeningDetailsVariant] = useState<string | null>(null);
  const [showMore, setShowMore] = useState<boolean>(false);
  const [showMoreDetailed, setShowMoreDetailed] = useState<boolean>(false)

  const [openingResultPiesWhite, setOpeningResultPiesWhite] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);
  const [openingResultPiesWhiteAll, setOpeningResultPiesWhiteAll] = useState<(ChartData<"pie", number[], unknown> & { options: any })>();
  const [openingResultPiesBlack, setOpeningResultPiesBlack] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>([]);
  const [openingResultPiesBlackAll, setOpeningResultPiesBlackAll] = useState<(ChartData<"pie", number[], unknown> & { options: any })>();
  const [openingResultPiesWhiteDetailed, setOpeningResultPiesWhiteDetailed] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>();
  const [openingResultPiesBlackDetailed, setOpeningResultPiesBlackDetailed] = useState<(ChartData<"pie", number[], unknown> & { options: any })[]>();

  function sortByGames(a: { win: number, draw: number, lose: number }, b: { win: number, draw: number, lose: number }) {
    return b.win + b.lose + b.draw - a.win - a.lose - a.draw
  }

  function getPieData(label: string, win: number, draw: number, lose: number) {
    return {
      labels: props.useEarlyAdvantageOverResult ? ['Advantage', 'Even', 'Disadvantage'] : ['Win', 'Draw', 'Lose'],
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

  function getAdvantage(scoreOutOfOpening: number) {
    return scoreOutOfOpening < -1.5 ? -1 : (scoreOutOfOpening > 1.5 ? 1 : 0)
  }

  useEffect(() => {
    if (props.archives.length == 0)
      return;

    let resultPerOpeningWhite: { [opening: string]: { win: number, lose: number, draw: number } } = {}
    let resultPerOpeningBlack: { [opening: string]: { win: number, lose: number, draw: number } } = {}
    let resultPerOpeningSimplifiedWhite: { [opening: string]: { win: number, lose: number, draw: number } } = {}
    let resultPerOpeningSimplifiedBlack: { [opening: string]: { win: number, lose: number, draw: number } } = {}

    for (var archive of props.archives) {
      // Set the results per opening dic
      const result = props.useEarlyAdvantageOverResult ? getAdvantage(archive.scoreOutOfOpening) : getResult(archive.result);
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
  }, [props.archives, props.useEarlyAdvantageOverResult])

  return (<>
    {(!!openingResultPiesWhiteAll && !!openingResultPiesBlackAll) ? (
      <>
        <h2>Openings</h2>
        <Grid container className="openings">
          <div onClick={() => { setOpeningOpenWhite(!openingOpenWhite); setOpeningOpenBlack(false); setOpeningDetailsVariant(null); }}>
            <h3>As white</h3>
            <div style={{ width: "220px" }} className={"clickable " + (openingOpenWhite || !openingOpenBlack ? "selected" : "")}>
              <Pie data={openingResultPiesWhiteAll} options={openingResultPiesWhiteAll.options} />
            </div>
          </div>

          <div onClick={() => { setOpeningOpenWhite(false); setOpeningOpenBlack(!openingOpenBlack); setOpeningDetailsVariant(null); }}>
            <h3>As black</h3>
            <div style={{ width: "220px" }} className={"clickable " + (openingOpenBlack || !openingOpenWhite ? "selected" : "")}>
              <Pie data={openingResultPiesBlackAll} options={openingResultPiesBlackAll.options} />
            </div>
          </div>
        </Grid>

        <div>
          {(openingOpenWhite || openingOpenBlack) ? (<h3>Main variants</h3>) : null}
          {openingOpenWhite ? (<div>
            <Grid container className="opening-container">
              {openingResultPiesWhite.slice(0, showMore ? openingResultPiesBlack.length : 5).map(x =>
                <div
                  key={x.datasets[0].label}
                  className={"clickable " + (openingDetailsVariant == x.datasets[0].label || !openingDetailsVariant ? "selected" : "")}
                  style={{ width: "180px", }}
                  onClick={() => setOpeningDetailsVariant(x.datasets[0].label || null)}>
                  <Pie data={x} options={x.options} />
                </div>
              )}
            </Grid>
            {
              (openingResultPiesWhite.length > 5) ?
                <Button size="small" variant="text" sx={{ mt: 1 }} onClick={() => setShowMore(!showMore)}>{showMore ? "See less" : "See more"}</Button>
                : null
            }
          </div>) : null}

          {openingOpenBlack ? (<div>
            <Grid container className="opening-container">
              {openingResultPiesBlack.slice(0, showMore ? openingResultPiesBlack.length : 5).map(x =>
                <div
                  key={x.datasets[0].label}
                  className={"clickable " + (openingDetailsVariant == x.datasets[0].label || !openingDetailsVariant ? "selected" : "")}
                  style={{ width: "180px", }}
                  onClick={() => setOpeningDetailsVariant(x.datasets[0].label || null)}>
                  <Pie data={x} options={x.options} />
                </div>
              )}
            </Grid>
            {
              (openingResultPiesBlack.length > 5) ?
                <Button size="small" variant="text" sx={{ mt: 1 }} onClick={() => setShowMore(!showMore)}>{showMore ? "See less" : "See more"}</Button>
                : null
            }
          </div>) : null}
        </div>

        <div>
          {openingDetailsVariant ? (<h3>Detailed variants</h3>) : null}

          {openingOpenWhite && openingDetailsVariant && openingResultPiesWhiteDetailed ? (<div>
            <Grid container className="opening-container">
              {openingResultPiesWhiteDetailed.filter(x => x.options.plugins.title.text?.startsWith(openingDetailsVariant)).slice(0, showMoreDetailed ? openingResultPiesBlack.length : 5).map(x =>
                <div key={x.datasets[0].label} style={{ width: "180px", }}>
                  <Pie data={x} options={x.options} />
                </div>
              )}
            </Grid>
            {
              (openingResultPiesWhiteDetailed.filter(x => x.options.plugins.title.text?.startsWith(openingDetailsVariant)).length > 5) ?
                <Button size="small" variant="text" sx={{ mt: 1 }} onClick={() => setShowMoreDetailed(!showMoreDetailed)}>{showMoreDetailed ? "See less" : "See more"}</Button>
                : null
            }
          </div>) : null}

          {openingOpenBlack && openingDetailsVariant && openingResultPiesBlackDetailed ? (<div>
            <Grid container className="opening-container">
              {openingResultPiesBlackDetailed.filter(x => x.options.plugins.title.text?.startsWith(openingDetailsVariant)).slice(0, showMoreDetailed ? openingResultPiesBlack.length : 5).map(x =>
                <div key={x.datasets[0].label} style={{ width: "180px", }}>
                  <Pie data={x} options={x.options} />
                </div>
              )}
            </Grid>
            {
              (openingResultPiesBlackDetailed.filter(x => x.options.plugins.title.text?.startsWith(openingDetailsVariant)).length > 5) ?
                <Button size="small" variant="text" sx={{ mt: 1 }} onClick={() => setShowMoreDetailed(!showMoreDetailed)}>{showMoreDetailed ? "See less" : "See more"}</Button>
                : null
            }
          </div>) : null}
        </div>
      </>) : null}
  </>);
}