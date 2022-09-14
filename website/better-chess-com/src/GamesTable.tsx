import { DataGrid, GridColDef, gridDateComparator, GridFilterModel, GridRowsProp, GridToolbar } from "@mui/x-data-grid";
import { renderLink } from "./renderLink";

type GamesTableProps = { gridRow: GridRowsProp | undefined, filters: GridFilterModel }

export function GamesTable(props: GamesTableProps) {
  const columns: GridColDef[] = [
    { field: 'url', headerName: 'Link', width: 245, renderCell: renderLink },
    { field: 'color', headerName: 'Color', width: 60 },
    { field: 'scoreAtMove15', headerName: 'Score at move 15', width: 60 },
    { field: 'final', headerName: 'Final type', width: 210 },
    { field: 'result', headerName: 'Result', width: 65 },
    { field: 'endTime', headerName: 'End Time', sortComparator: gridDateComparator, renderCell: params => params.value.toLocaleDateString(), width: 90 },
    { field: 'opening', headerName: 'Opening', flex: 1 }
  ];

  // { columnField: 'rating', operatorValue: '>', value: '2.5' }

  return (
    props.gridRow ?
      <>
        <h2>Games</h2>
        <DataGrid
          disableSelectionOnClick
          columns={columns}
          rows={props.gridRow}
          components={{ Toolbar: GridToolbar }}
          filterModel={props.filters} />
      </> : null
  )
}