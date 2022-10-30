
type ComputingStateInfoProps = { computingState: ComputingState, archivesLength: number | undefined, sfDepth: number }

export enum ComputingState {
  NotLoading = 0,
  FetchingGames = 1,
  ComputingStats = 2,
  ErrorFetchingUser = 3,
  ErrorNoGamesFound = 4,
  AnalysingGames = 5,
  InitStockfish = 6,
  ErrorFetchingGames = 7,
}

export function ComputingStateInfo(props: ComputingStateInfoProps) {

  return (<div>

    {props.computingState == ComputingState.NotLoading ? <p>Enter your username and select a time range</p> : null}
    {props.computingState == ComputingState.FetchingGames ? <p>Fetching games</p> : null}
    {props.computingState == ComputingState.InitStockfish ? <p>Initializing stockfish web workers</p> : null}
    {props.computingState == ComputingState.ComputingStats ? <p>Computing statistics</p> : null}
    {props.computingState == ComputingState.AnalysingGames ? <p>Analysing {props.archivesLength} games with stockfish nnue depth {props.sfDepth}</p> : null}
  </div>)
}