import { TimeClass } from "./ChessComArchive";
import FlashOnIcon from '@mui/icons-material/FlashOn';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import ShutterSpeedOutlinedIcon from '@mui/icons-material/ShutterSpeedOutlined';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';

type GameTypeIconProps = { gameType: TimeClass, size: number }

export function GameTypeIcon(props: GameTypeIconProps) {
  function getGameTypeIcon(gameType: string, size: number = 24) {
    switch (gameType) {
      case 'rapid':
        return (<TimerOutlinedIcon sx={{ fontSize: size }} />);
      case 'blitz':
        return (<FlashOnIcon sx={{ fontSize: size }} />);
      case 'bullet':
        return (<ShutterSpeedOutlinedIcon sx={{ fontSize: size }} />);
      case 'standard':
        return (<LocalCafeIcon sx={{ fontSize: size }} />);
      default:
        return (<TimerOutlinedIcon sx={{ fontSize: size }} />);
    }
  }
  return (getGameTypeIcon(props.gameType, props.size))
}