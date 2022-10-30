import { GridFilterModel, GridRowsProp } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { Advantage } from "./Advantage";
import { getResultAsString, HydratedChessComArchive } from "./ChessComArchive";
import { EndGame, getFinalName } from "./EndGame";
import { GamesTable } from "./GamesTable";
import { Openings } from "./Openings";
import { Tactics } from "./Tactics";
import { TimeManagement } from "./TimeManagement";

type StatisticsProps = { hydratedArchives: HydratedChessComArchive[] | undefined }

export function Statistics(props: StatisticsProps) {
  const [tableFilters, setTableFilters] = useState<GridFilterModel>({ items: [] });
  const [gridRow, setGridRow] = useState<GridRowsProp>();

  useEffect(() => {
    if (!props.hydratedArchives || props.hydratedArchives.length == 0) {
      return;
    }
    // Set grid rows
    setGridRow(props.hydratedArchives.map((x, i) => ({
      id: i,
      url: x.url,
      color: x.playingWhite ? 'white' : 'black',
      result: getResultAsString(x.result),
      scoreAtMove10: (x.scoreOutOfOpening * (x.playingWhite ? 1 : -1) * 0.01).toFixed(2),
      endTime: new Date(x.end_time * 1000),
      opening: x.opening,
      final: getFinalName(x.final),
      winningFinal: getFinalName(x.winningFinal),
      mistakesPlayer: x.mistakesPlayer.join(", "),
      missedGainsPlayer: x.missedGainPlayer.join(", "),
      goodMovesPlayer: x.goodMovePlayer.join(", "),
      mistakesOpponent: x.mistakesOpponent.join(", "),
      missedGainsOpponent: x.missedGainOpponent.join(", "),
      goodMovesOpponent: x.goodMoveOpponent.join(", "),
    })));
  }, [props.hydratedArchives]);


  return (<>
    {props.hydratedArchives && props.hydratedArchives.length ? <>
      <Openings archives={props.hydratedArchives} setTableFilters={setTableFilters}></Openings>
      <TimeManagement archives={props.hydratedArchives}></TimeManagement>
      <EndGame archives={props.hydratedArchives} setTableFilters={setTableFilters}></EndGame>
      <Tactics archives={props.hydratedArchives}></Tactics>
      <Advantage archives={props.hydratedArchives}></Advantage>

      <div id="games-table" style={{ height: "100vh", width: "100%", maxWidth: 1200, marginTop: 30 }}>
        <GamesTable gridRow={gridRow} filters={tableFilters} setTableFilters={setTableFilters}></GamesTable>
      </div>
    </> : null}
  </>);
}