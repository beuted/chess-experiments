import { DataGrid, GridColDef, gridDateComparator, GridFilterModel, GridRowsProp, GridToolbar } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { Move } from "./libs/chess.js";
import { renderLink } from "./renderLink";

export type PrepaGameResult = { gameUrl: string, failedMove: number, prepaSuccess: boolean, chapter: number, line: number, chapterName: string | undefined}

type PreparationTableProps = {
  prepaGameResult: PrepaGameResult[] | undefined,
  chapterMoves: { moves: Move[][] }[],
}

export function PreparationTable(props: PreparationTableProps) {
  const [gridRow, setGridRow] = useState<GridRowsProp>([]);
  
  const columns: GridColDef[] = [
    { field: 'gameUrl', headerName: 'Link', width: 245, renderCell: renderLink },
    { field: 'prepaSuccess', headerName: 'Prepa', width: 100 },
    { field: 'failedMove', headerName: 'Fail #', width: 50 },
    { field: 'chapterName', headerName: 'Chapter', width: 200 },
    { field: 'lineString', headerName: 'Line', flex: 1 },
  ];

  useEffect(() => {
    if (!props.prepaGameResult || props.prepaGameResult.length == 0) {
      return;
    }
    // Set grid rows
    setGridRow(props.prepaGameResult.map((x, i) => ({
      id: i,
      gameUrl: x.gameUrl,
      failedMove: x.failedMove,
      prepaSuccess: x.prepaSuccess ? 'success' : 'fail',
      chapterName: x.chapterName,
      lineString: x.chapter != -1 ? props.chapterMoves[x.chapter].moves[x.line].map(x=>x.san).join(" ") : ""
    })));
  }, [props.prepaGameResult]);

  return (
    gridRow ?
      <>
        <h2>Preparations</h2>
        <DataGrid
          disableSelectionOnClick
          columns={columns}
          rows={gridRow}
          components={{ Toolbar: GridToolbar }}
          initialState={{
            filter: {
              filterModel:{ items: [{ columnField: 'prepaSuccess', operatorValue: 'equals', value: 'fail' }] }
            }
          }}
          sortModel={[{field: 'lineString', sort: 'asc'}]}
        />
      </> : null
  )
}