import { DataGrid, GridColDef, gridDateComparator, GridRowsProp, GridToolbar } from "@mui/x-data-grid";
import { renderLink } from "./renderLink";

type GamesTableProps = { gridRow: GridRowsProp }

export function GamesTable(props: GamesTableProps) {
  const columns: GridColDef[] = [
    { field: 'url', headerName: 'Link', width: 325, renderCell: renderLink },
    { field: 'color', headerName: 'Color' },
    { field: 'endTime', headerName: 'End Time', sortComparator: gridDateComparator, renderCell: params => params.value.toLocaleDateString() },
    { field: 'opening', headerName: 'Opening', flex: 1 },
  ];


  return (
    <DataGrid
      disableSelectionOnClick
      columns={columns}
      rows={props.gridRow}
      components={{ Toolbar: GridToolbar }} />
  )
}