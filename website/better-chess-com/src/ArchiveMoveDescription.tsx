import { HydratedChessComArchive } from "./ChessComArchive";

type ArchiveMoveDescriptionProps = { archive: HydratedChessComArchive, moveId?: number }

function description(archive: HydratedChessComArchive, moveId?: number) {
  let user = archive.playingWhite ? archive.white : archive.black;
  let opponent = archive.playingWhite ? archive.black : archive.white;

  let moveDescription = '';
  if (moveId != null) {
    const startTimeGame = archive.whiteTimes[0]; // TODO: THis is false but that's only for black first move so not a big deal
    let whiteTime = archive.whiteTimes[Math.floor(moveId / 2)]
    let blackTime = moveId == 0 ? startTimeGame : archive.blackTimes[Math.floor((moveId - 1) / 2)];

    moveDescription = `whiteTime: ${whiteTime} blackTime: ${blackTime}`
  }

  return `${user.username} (${user.rating}) as ${archive.playingWhite ? "white" : "black"} VS ${opponent.username} (${opponent.rating}) ${archive.playingWhite ? "black" : "white"} | ${moveDescription}`
}

export function ArchiveMoveDescription(props: ArchiveMoveDescriptionProps) {
  return (<div>
    <a href={props.archive.url} style={{ fontSize: 12 }}>{description(props.archive, props.moveId)}</a>
  </div>)
}