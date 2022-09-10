import { useEffect } from "react";
import { HydratedChessComArchive } from "./ChessComArchive"

type EndGameProps = { archives: HydratedChessComArchive[] | undefined }

export function EndGame(props: EndGameProps) {

  useEffect(() => {
    if (!props.archives || props.archives.length == 0)
      return;


  }, [props.archives]);

  return (
    props.archives && props.archives.length > 0 ?
      <>
        <h2>End Game</h2>
        <div>WIP</div>
      </> : null
  )
}