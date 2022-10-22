import { Grid, Tooltip } from "@mui/material";
import { TimeClass, UserInfo } from "./ChessComArchive";
import { GameTypeIcon } from "./GameTypeIcon";

type ProfileLineProps = { userInfo: UserInfo }

export function ProfileLine(props: ProfileLineProps) {

  const timeClasses: TimeClass[] = ["standard", "rapid", "blitz", "bullet"];

  return (<Grid container direction="row" alignItems="center" justifyContent="space-evenly" sx={{ py: 1, width: "100%", maxWidth: 600 }}>
    <a href={props.userInfo.url} target="_blank">
      <div style={{ backgroundImage: `url(${props.userInfo.avatar})`, backgroundSize: "cover", height: 80, width: 80 }}>
        {!props.userInfo.country || <span className={`countryflag fi fi-${props.userInfo.country.toLowerCase()}`}></span>}
      </div>
    </a>
    {timeClasses.map(gameType =>
      props.userInfo[gameType].nbGames > 0 ?
        <Grid key={gameType} alignItems="center" justifyContent="center" className="stats-cell">
          <Tooltip title={`over ${props.userInfo[gameType].nbGames} ${gameType} games`}>
            <div><GameTypeIcon gameType={gameType} size={40}></GameTypeIcon></div>
          </Tooltip>
          <Tooltip title={`${gameType} elo`}><div className="elo">{props.userInfo[gameType].rating}</div></Tooltip>
          {props.userInfo[gameType].percentil > 0 ?
            <div>Top {(props.userInfo[gameType].percentil * 100).toFixed(2)}%</div> :
            <div>no rank yet</div>}
        </Grid> : null
    )}
  </Grid>);
}