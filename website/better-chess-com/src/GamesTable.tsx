import { DataGrid, GridColDef, gridDateComparator, GridFilterModel, GridRowsProp, GridToolbar } from "@mui/x-data-grid";
import { renderLink } from "./renderLink";

type GamesTableProps = { gridRow: GridRowsProp | undefined, filters: GridFilterModel, setTableFilters: (filters: GridFilterModel) => void }

export function GamesTable(props: GamesTableProps) {
  const columns: GridColDef[] = [
    { field: 'url', headerName: 'Link', width: 245, renderCell: renderLink },
    { field: 'color', headerName: 'Color', width: 60 },
    { field: 'scoreAtMove10', headerName: 'Score at move 10', width: 60 },
    { field: 'final', headerName: 'Final type', width: 210 },
    { field: 'result', headerName: 'Result', width: 65 },
    { field: 'endTime', headerName: 'End Time', sortComparator: gridDateComparator, renderCell: params => params.value.toLocaleDateString(), width: 90 },
    { field: 'opening', headerName: 'Opening', flex: 1 },
    { field: 'winningFinal', headerName: 'Winning Final', width: 210, hide: true },
  ];

  const onFilterModelChange = (newFilters: GridFilterModel) => {
    if (
      newFilters.items[0]?.columnField === props.filters.items[0]?.columnField &&
      newFilters.items[0]?.operatorValue === props.filters.items[0]?.operatorValue &&
      props.filters.items[0]?.value === newFilters.items[0]?.value
    ) {
      props.setTableFilters({ items: [] });
    } else {
      props.setTableFilters(newFilters);
    }
  };

  return (
    props.gridRow ?
      <>
        <h2>Games</h2>
        <DataGrid
          disableSelectionOnClick
          columns={columns}
          rows={props.gridRow}
          components={{ Toolbar: GridToolbar }}
          filterModel={props.filters}
          onFilterModelChange={onFilterModelChange} />
      </> : null
  )
}