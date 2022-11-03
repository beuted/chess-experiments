import { useEffect, useState } from 'react';
import './App.css';
import {
  Chart as ChartJS, CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as TooltipChartJS,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { StockfishService, StockfishState } from './stockfishService';
import { ChessComArchive, getPgnAtMove, HydratedChessComArchive, TimeClass, UserInfo } from './ChessComArchive';
import { FullOpenings } from './FullOpening';
import { Alert, Box, Button, Divider, Drawer, FormControl, Grid, IconButton, InputLabel, LinearProgress, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Select, SelectChangeEvent, TextField, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import ShutterSpeedOutlinedIcon from '@mui/icons-material/ShutterSpeedOutlined';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import HomeIcon from '@mui/icons-material/Home';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import MenuIcon from '@mui/icons-material/Menu';
import { Final, getFinal, getPiecesFromBoard, isWinningFinal } from './EndGame';
import { getLocalCache, setLocalCache } from './CacheUtils';
import { Statistics } from './Statistics';
import { BoardPlay } from './BoardPlay';
import { Link, Route, Routes } from 'react-router-dom';
import { Chess } from './libs/chess.js';
import { LichessClient } from './LichessClient';
import { ChesscomClient } from './ChesscomClient';
import { ProfileLine } from './ProfileLine';
import { Preparation } from './Preparation';
import { ComputingState, ComputingStateInfo } from './ComputingStateInfo';

declare const gtag: any;

const LoadingStates = [ComputingState.FetchingGames, ComputingState.InitStockfish, ComputingState.ComputingStats, ComputingState.AnalysingGames]

ChartJS.register(CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ArcElement,
  TooltipChartJS,
  Legend,
  ChartDataLabels
);

function App() {
  const algoVersion = 3;

  let chesscomClient = new ChesscomClient();
  let lichessClient = new LichessClient();

  let storedGameType = localStorage.getItem('gameType') || 'rapid';
  const [gameType, setGameType] = useState<TimeClass>(storedGameType as TimeClass);

  let storedPlatform = localStorage.getItem('platform') || 'chesscom';
  const [platform, setPlatform] = useState<string>(storedPlatform);

  let storedUserName = localStorage.getItem('userName') || '';
  const [userName, setUserName] = useState<string>(storedUserName);

  let storedSfDepth = localStorage.getItem('sfDepth') || '10';
  const [sfDepth, setSfDepth] = useState<number>(Number(storedSfDepth));

  let storedMaxNbFetchedGame = localStorage.getItem('maxNbFetchedGame') || '50';
  const [maxNbFetchedGame, setMaxNbFetchedGame] = useState<number>(Number(storedMaxNbFetchedGame));

  let storedNumberOfThreadsX2 = localStorage.getItem('numberOfThreadsX2') || '2';
  const [numberOfThreadsX2, setNumberOfThreadsX2] = useState<number>(Number(storedNumberOfThreadsX2));

  const [startDate, setStartDate] = useState<Date>(new Date());

  let storedUserInfo = localStorage.getItem('userInfo') || '{}';
  const [userInfo, setUserInfo] = useState<UserInfo>(JSON.parse(storedUserInfo));

  const [archives, setArchives] = useState<ChessComArchive[]>();
  const [hydratedArchives, setHydratedArchives] = useState<HydratedChessComArchive[]>();
  const [computingState, setComputingState] = useState<ComputingState>(ComputingState.NotLoading);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [monthsInfo, setMonthsInfo] = useState<{ [month: string]: { nbGames: number, sfDepth: number } }>({});
  const [stockfishServices, setStockfishServices] = useState<StockfishService[]>([]);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

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


  function deleteMonth(monthAndType: string) {
    let monthsString = localStorage.getItem('months');
    let months: string[] = monthsString ? JSON.parse(monthsString) : [];
    let updatedMonths = Array.from(months);

    let monthGamesString = localStorage.getItem(monthAndType);
    let monthGames: { games: HydratedChessComArchive[], sfDepth: number, algoVersion: number } = monthGamesString ? JSON.parse(monthGamesString) : {};

    // Clean cache
    localStorage.removeItem(monthAndType);
    let index = updatedMonths.indexOf(monthAndType);
    if (index > -1) {
      updatedMonths.splice(index, 1);
      localStorage.setItem('months', JSON.stringify(updatedMonths));
    }
    delete monthsInfo[monthAndType];
    setMonthsInfo(Object.assign({}, monthsInfo));

    // Clean local games
    for (const game of monthGames.games) {
      let index = hydratedArchives!.findIndex(x => x.url == game.url);
      if (index != -1)
        hydratedArchives!.splice(index, 1);
    }

    setHydratedArchives(Array.from(hydratedArchives!));
  }

  useEffect(() => {
    // Read cache logic when loading the page
    let algoVersionStorage = localStorage.getItem('algoVersion');
    let monthsString = localStorage.getItem('months');
    let months: string[] = monthsString ? JSON.parse(monthsString) : [];
    let hydratedArchives: HydratedChessComArchive[] = [];
    let monthsInfo: { [month: string]: { nbGames: number, sfDepth: number } } = {};

    // If the algo version has changed clean all the cache
    if (algoVersionStorage && Number(algoVersionStorage) != algoVersion) {
      for (let monthAndType of months) {
        localStorage.removeItem(monthAndType);
      }
      localStorage.removeItem('months');
      months = [];
    }

    // Se the algo version to its hardcoded value in the store
    localStorage.setItem('algoVersion', String(algoVersion));

    // Fill hydratedArchives and monthInfo
    for (let monthAndType of months) {
      let monthGamesString = localStorage.getItem(monthAndType);
      let monthGames: { games: HydratedChessComArchive[], sfDepth: number } = monthGamesString ? JSON.parse(monthGamesString) : {};
      monthsInfo[monthAndType] = { nbGames: monthGames.games.length, sfDepth: monthGames.sfDepth }
      hydratedArchives = hydratedArchives.concat(monthGames.games);
    }

    setMonthsInfo(monthsInfo);
    setHydratedArchives(hydratedArchives);
  }, []);

  useEffect(() => {
    const chess = new Chess();
    // Page just loaded
    if (!archives) {
      return;
    }

    // compute what archive we filter on
    var filteredArchives = archives as HydratedChessComArchive[];

    // No game were found after filtering
    if (filteredArchives.length == 0) {
      setComputingState(ComputingState.NotLoading);
      return;
    }

    // opening stats
    for (var archive of filteredArchives) {
      // Remove description
      let cleanedPgn = archive.pgn.split('\n\n')[1];

      let matches = cleanedPgn.match(/\{\s?\[%clk[^\{\[\]\}]*\]\s?\} /g);

      // Remove everything between "{[ ... ]}" or "{ [ ... ] }"
      cleanedPgn = cleanedPgn.replace(/\{\s?\[[^\{\[\]\}]*\]\s?\} /g, '');

      if (matches) {
        let clickTimes = matches.map(x => {
          let timeMatch = x.match(/\{\s?\[%clk\s?(.*)\]\s?\}/);
          let timeString = timeMatch && timeMatch[1] ? timeMatch[1] : "";
          let timeAsArray = timeString.split(":");
          return Number(timeAsArray[0]) * 60 * 60 + Number(timeAsArray[1]) * 60 + Number(timeAsArray[2]);
        });
        archive.whiteTimes = clickTimes.filter((_, i) => i % 2 === 0);
        archive.blackTimes = clickTimes.filter((_, i) => i % 2 === 1);
      }

      // Remove the number like so "2..." between each move
      cleanedPgn = cleanedPgn.replace(/[0-9]+\.\.\. /g, '');

      archive.cleanedPgn = cleanedPgn;
      let cleanedPgn2 = cleanedPgn.split('.');
      let doubleMoves = cleanedPgn2.map(x => x.slice(0, -2).trim()); // Remove last 2 chars for each moves
      doubleMoves = doubleMoves.slice(1); // Remove first element that is empty
      let lastMove = cleanedPgn2[cleanedPgn2.length - 1];
      if (lastMove.includes("\n"))
        lastMove = lastMove.replace('1-0', '').replace('0-1', '').replace('1/2-1/2', '').trim();

      doubleMoves[doubleMoves.length - 1] = lastMove; // We don't want to remove chars to the last element

      let moves: string[] = []
      for (const doubleMove of doubleMoves) {
        const moveArray = doubleMove.split(" ");
        moves = moves.concat(moveArray);
      }

      archive.moves = moves;

      for (var opening of FullOpenings) {
        if (cleanedPgn.startsWith(opening.pgn)) {
          archive.opening = opening.name;
          archive.eco = opening.eco;
          break;
        }
      }

      // Set the result of the game
      if (archive.white.username == userName)
        archive.playingWhite = true;
      else
        archive.playingWhite = false;

      const playerSide = archive.playingWhite ? archive.white : archive.black;

      archive.result = playerSide.result;

      if (!archive.opening) {
        console.error("what is this opening ?? " + archive.url);
        continue;
      }
    }

    // Compute score at each move
    setComputingState(ComputingState.AnalysingGames);

    (async () => { //TODO: This is not optimal as when 1 thread has stopped it will wait for the others, also we seems to load several stockfish.worker.js when lichess doesn't (just the stockfish.js part) ther eis pbbly an optim here
      for (let threadId = 0; threadId < numberOfThreadsX2; threadId++) {
        await stockfishServices[threadId].setup();
      }

      let start = performance.now();
      for (let archiveId = 0; archiveId < filteredArchives.length; archiveId = archiveId + numberOfThreadsX2) {
        setLoadingProgress(100 * archiveId / filteredArchives.length);

        let numberOfThreadNeeded = Math.min(numberOfThreadsX2, filteredArchives.length - archiveId);

        let scoresPromises = [];
        for (let threadId = 0; threadId < numberOfThreadNeeded; threadId++) {
          scoresPromises.push(computeScoreForArchive(filteredArchives[archiveId + threadId], stockfishServices[threadId]));
        }

        let scores = await Promise.all(scoresPromises);

        for (let threadId = 0; threadId < numberOfThreadNeeded; threadId++) {
          filteredArchives[archiveId + threadId].scores = scores[threadId];
          filteredArchives[archiveId + threadId].scoreOutOfOpening = scores[threadId].length > 20 ? scores[threadId][20] : scores[threadId][scores[threadId].length - 1];
          filteredArchives[archiveId + threadId].sfDepth = sfDepth;
        }
      }
      const timeSpent = (performance.now() - start).toFixed(3);
      console.log(`function took ${timeSpent}ms`);

      gtag!("event", "search_end", {
        userName: userName,
        platform: platform,
        gameType: gameType,
        sfDepth: sfDepth,
        maxNbFetchedGame: maxNbFetchedGame,
        numberOfThreadsX2: numberOfThreadsX2,
        timeSpent: timeSpent
      });

      // Computaing mistakes and missed gains
      for (let archive of filteredArchives) {
        // TODO check if mate created and score was "not so bad"
        let mistakesPlayer: number[] = [];
        let missedGainPlayer: number[] = [];
        let goodMovePlayer: number[] = [];
        let mistakesOpponent: number[] = [];
        let missedGainOpponent: number[] = [];
        let goodMoveOpponent: number[] = [];

        let prevScore = archive.scores[0];

        let i = 1;
        for (let score of archive.scores) {
          let whiteToPlay = i % 2 == 1;
          if (score - prevScore > 360 && score <= 1000) {
            if (archive.playingWhite) {
              if (whiteToPlay) {
                goodMovePlayer.push(i);
              } else {
                if (mistakesPlayer.includes(i - 1)) {
                  missedGainOpponent.push(i);
                } else {
                  mistakesOpponent.push(i);
                }
              }
            } else {
              if (whiteToPlay) {
                goodMoveOpponent.push(i);
              } else {
                if (mistakesOpponent.includes(i - 1)) {
                  missedGainPlayer.push(i);
                } else {
                  mistakesPlayer.push(i);
                }
              }
            }
          } else if (score - prevScore < -360 && score >= -1000) {
            if (archive.playingWhite) {
              if (whiteToPlay) {
                if (mistakesOpponent.includes(i - 1)) {
                  missedGainPlayer.push(i);
                } else {
                  mistakesPlayer.push(i);

                }
              } else {
                goodMoveOpponent.push(i);
              }
            } else {
              if (whiteToPlay) {
                if (mistakesPlayer.includes(i - 1)) {
                  missedGainOpponent.push(i);
                } else {
                  mistakesOpponent.push(i);
                }
              } else {
                goodMovePlayer.push(i);
              }
            }
          }
          prevScore = score;
          i++;
        }

        archive.mistakesPlayer = mistakesPlayer;
        archive.missedGainPlayer = missedGainPlayer;
        archive.goodMovePlayer = goodMovePlayer;
        archive.mistakesOpponent = mistakesOpponent;
        archive.missedGainOpponent = missedGainOpponent;
        archive.goodMoveOpponent = goodMoveOpponent;
      }

      // Compute finals
      let final: Final = Final.NoFinal
      let previousMoveFinal: Final = Final.NoFinal

      for (let archive of filteredArchives) {
        chess.load_pgn(archive.cleanedPgn);
        let i = archive.scores.length - 1;
        do {
          let score = archive.scores[i];
          let board = chess.board();

          let { whitePieces, blackPieces } = getPiecesFromBoard(board);

          final = archive.playingWhite ? getFinal(whitePieces, blackPieces) : getFinal(blackPieces, whitePieces);
          if (final !== Final.NoFinal) {
            let winningFinal = isWinningFinal(final);
            if (winningFinal && previousMoveFinal === final && (score > 50 || score < -50)) {
              archive.winningFinal = final;
            }

            // We set this not a winning final or if this winning final score is either nulle or defeat we have our final
            // We also make sure this situation stayed for 2 moves
            if (!winningFinal && previousMoveFinal === final)
              break;
          }

          previousMoveFinal = final;
          i--;
        } while (chess.undo() != null)

        archive.final = final;
      }

      // Add the previous games to the list of hydratedArchives // TODO could be more opti
      if (hydratedArchives) {
        const hydratedArchivesFiltered = hydratedArchives.filter(a => filteredArchives.findIndex(h => h.url == a.url) == -1); // Remove the games that have been updated before the new sfDepth is greater
        filteredArchives = filteredArchives.concat(hydratedArchivesFiltered);
      }

      // Caching logic
      let monthInfo = setLocalCache(filteredArchives, userName);
      setMonthsInfo(monthInfo);

      setHydratedArchives(filteredArchives);
      setComputingState(ComputingState.NotLoading);
      setLoadingProgress(0);
    })();

  }, [archives]);


  async function computeScoreForArchive(archive: HydratedChessComArchive, stockfishService: StockfishService) {
    console.info(`computing ${archive.url} with ${archive.moves.length} moves`);
    return new Promise<number[]>(async (resolve) => {
      const chess = new Chess();

      await stockfishService.init((state: StockfishState) => {
        // While we don't have computed everything move sf state don't use it
        if (state.scores.length < archive.moves.length || state.scores.includes(undefined))
          return;

        var result = state.scores.map((x, i) => {
          // If it's black turn then we need to invert the number
          return (x as number) * ((i % 2 == 0) ? -1 : 1)
        });

        resolve(result);
      });

      for (let moveId = 1; moveId <= archive.moves.length; moveId++) {
        let pgn = getPgnAtMove(archive.moves, moveId);
        if (pgn == null)
          break;

        chess.load_pgn(pgn);
        const fen = chess.fen();
        stockfishService.computeFen(fen);
      }
    });
  }

  async function fetchGames() {
    setComputingState(ComputingState.InitStockfish);
    // Save variables choosen in localstorage
    localStorage.setItem('userName', userName);
    localStorage.setItem('platform', platform);
    localStorage.setItem('gameType', gameType);
    localStorage.setItem('sfDepth', String(sfDepth));
    localStorage.setItem('maxNbFetchedGame', String(maxNbFetchedGame));
    localStorage.setItem('numberOfThreadsX2', String(numberOfThreadsX2));

    gtag!("event", "search_start", {
      userName: userName,
      platform: platform,
      gameType: gameType,
      sfDepth: sfDepth,
      maxNbFetchedGame: maxNbFetchedGame,
      numberOfThreadsX2: numberOfThreadsX2
    });

    let archiveTemp: ChessComArchive[] = [];

    // Init additionnal sfServices needed
    while (stockfishServices.length < numberOfThreadsX2) {
      stockfishServices.push(new StockfishService(sfDepth));
    }
    setStockfishServices(stockfishServices);

    setComputingState(ComputingState.FetchingGames);

    if (platform == "chesscom") {
      let userNameFixed: string;
      try {
        // Fetch player info
        let userInfo: UserInfo = await chesscomClient.fetchUserInfo(userName);
        setUserInfo(userInfo);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        userNameFixed = userInfo.username; // Here we fix the potential capital cases that a username can have
        setUserName(userNameFixed);
      } catch (error) {
        console.error(error);
        setComputingState(ComputingState.ErrorFetchingUser);
        return;
      }

      // Fetch all archives
      try {
        archiveTemp = await chesscomClient.fetchAllArchives(userNameFixed, startDate, gameType, maxNbFetchedGame);
      } catch (e) {
        console.error(e);
        setComputingState(ComputingState.ErrorFetchingGames);
        return;
      }

    } else if (platform == "lichess") {
      try {
        let userInfo = await lichessClient.fetchUserInfo(userName);
        setUserInfo(userInfo);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      } catch (e) {
        console.error(e);
        setComputingState(ComputingState.ErrorFetchingUser);
        return;
      }

      // Fetch all archives
      try {
        archiveTemp = await lichessClient.fetchAllArchives(userName, startDate, gameType, maxNbFetchedGame);
      } catch (e) {
        console.error(e);
        setComputingState(ComputingState.ErrorFetchingGames);
        return;
      }
    }

    // If there si no game to compute at this point show a little message
    if (archiveTemp.length == 0) {
      setComputingState(ComputingState.ErrorNoGamesFound);
      return;
    }

    // Filter out games that have already been computed
    let localCache = getLocalCache(userName);
    archiveTemp = archiveTemp.filter(archive => {
      let monthAndType: string = new Date(archive.end_time * 1000).toISOString().substring(0, 7) + "%" + gameType + "%" + userName;
      if (!localCache[monthAndType] || localCache[monthAndType].sfDepth < sfDepth) {
        return true;
      }
      return !localCache[monthAndType].games.find(x => x.url === archive.url);
    });

    setComputingState(ComputingState.ComputingStats);
    setArchives(archiveTemp);
  }

  return (
    <div className="App">
      <div className="app-container">
        <IconButton aria-label="menu" onClick={() => setDrawerOpen(!drawerOpen)} sx={{ position: 'absolute', left: 5, top: 5 }}>
          <MenuIcon fontSize="large" />
        </IconButton>
        {(computingState != ComputingState.NotLoading) ?
          <LinearProgress style={{ width: "100%" }} variant="determinate" value={loadingProgress} />
          : null}

        <Grid sx={{ my: 1, mx: 4, position: 'relative' }} >
          <TextField label="Username"
            defaultValue={userName}
            variant="outlined"
            size="small"
            sx={{ width: 150, m: 1 }}
            onChange={event => {
              setUserName(event.target.value);
            }} />
          <FormControl sx={{ width: 130, m: 1 }} size="small">
            <InputLabel id="platform-label">Platform</InputLabel>
            <Select
              labelId="platform-label"
              value={platform}
              label="Platform"
              defaultValue={gameType}
              onChange={(event: SelectChangeEvent) => {
                setPlatform(event.target.value);
              }}
            >
              <MenuItem value={"chesscom"}>Chess.com</MenuItem>
              <MenuItem value={"lichess"}>Lichess</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ width: 120, m: 1 }} size="small">
            <InputLabel id="game-type-label">Game Type</InputLabel>
            <Select
              labelId="game-type-label"
              id="game-type"
              value={gameType}
              label="Game type"
              defaultValue={gameType}
              onChange={(event: SelectChangeEvent) => {
                setGameType(event.target.value as TimeClass);
              }}
            >
              <MenuItem value={"rapid"}>Rapid</MenuItem>
              <MenuItem value={"blitz"}>Blitz</MenuItem>
              <MenuItem value={"bullet"}>Bullet</MenuItem>
            </Select>
          </FormControl>
          <TextField
            id="startDate"
            label="Start Date"
            type="month"
            InputProps={{ inputProps: { max: new Date().toISOString().substring(0, 7) } }}
            defaultValue={startDate.toISOString().substring(0, 7)}
            size="small"
            sx={{ width: 150, m: 1 }}
            InputLabelProps={{
              shrink: true,
            }}
            onChange={event => {
              setStartDate(new Date(event.target.value));
            }}
          />
          <TextField
            type="number"
            label="# games"
            defaultValue={maxNbFetchedGame}
            variant="outlined"
            size="small"
            inputProps={{ min: 1 }}
            sx={{ width: 80, m: 1 }}
            onChange={event => {
              const value = Math.max(parseInt(event.target.value, 10), 1);
              setMaxNbFetchedGame(value);
            }} />
          <TextField
            type="number"
            label="Depth"
            defaultValue={sfDepth}
            variant="outlined"
            size="small"
            inputProps={{ min: 1, max: 18 }}
            sx={{ width: 80, m: 1 }}
            onChange={event => {
              const value = Math.min(Math.max(parseInt(event.target.value, 10), 0), 18);
              setSfDepth(value);
            }} />
          <FormControl sx={{ width: 80, m: 1 }} size="small">
            <InputLabel id="nb-thread-label"># threads</InputLabel>
            <Select
              labelId="nb-thread-label"
              id="game-type"
              value={String(numberOfThreadsX2)}
              label="# threads"
              onChange={(event: SelectChangeEvent) => {
                setNumberOfThreadsX2(Number(event.target.value));
              }}
            >
              <MenuItem value={'1'}>2</MenuItem>
              <MenuItem value={'2'}>4</MenuItem>
              <MenuItem value={'3'}>6</MenuItem>
              <MenuItem value={'4'}>8</MenuItem>
              <MenuItem value={'5'}>10</MenuItem>
              <MenuItem value={'6'}>12</MenuItem>
              <MenuItem value={'7'}>14</MenuItem>
              <MenuItem value={'8'}>16</MenuItem>
            </Select>
          </FormControl>

          <Button variant="contained" onClick={fetchGames} sx={{ mt: 1.1, mr: 1, ml: 1 }} disabled={LoadingStates.includes(computingState) || !userName || sfDepth <= 0 || sfDepth > 18}>
            {LoadingStates.includes(computingState) ? "Computing..." : "Compute"}
          </Button>
        </Grid>
        {computingState == ComputingState.ErrorFetchingUser ? <Alert severity="error">Error fetching user information</Alert> : null}
        {computingState == ComputingState.ErrorFetchingGames ? <Alert severity="error">Error fetching games for this user</Alert> : null}
        {computingState == ComputingState.ErrorNoGamesFound ? <Alert severity="warning">No games were found for the selected filters</Alert> : null}

        {(!hydratedArchives || hydratedArchives.length == 0) ?
          <ComputingStateInfo computingState={computingState} archivesLength={archives?.length} sfDepth={sfDepth}></ComputingStateInfo>
          :
          <Grid container direction="column" alignItems="center" justifyContent="start">
            <ProfileLine userInfo={userInfo}></ProfileLine>
            <List dense={true} sx={{ py: 3, width: "100%", maxWidth: 600, mb: 2 }}>
              {Object.entries(monthsInfo).sort().map(([month, info]) => (
                <ListItem className="hoverGray" key={month} secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => deleteMonth(month)} disabled={LoadingStates.includes(computingState)}>
                    <DeleteIcon />
                  </IconButton>
                }>
                  <ListItemIcon>
                    {getGameTypeIcon(month.split('%')[1])}
                  </ListItemIcon>
                  <ListItemText primary={`${month.split('%')[0]} - ${month.split('%')[2]} : ${info.nbGames} ${month.split('%')[1]} games`}
                    secondary={`Completed - 100% with Stockfish nnue depth ${info.sfDepth}`} />
                </ListItem>))}
            </List>
          </Grid>
        }
        <Routes>
          <Route path="/" element={<Statistics hydratedArchives={hydratedArchives}></Statistics>} />
          <Route path="board" element={<BoardPlay hydratedArchives={hydratedArchives}></BoardPlay>} />
          <Route path="preparation" element={<Preparation></Preparation>} />
        </Routes>
        <Drawer
          anchor={'left'}
          open={drawerOpen}
          onClose={() => setDrawerOpen(!drawerOpen)}
        >
          <Box
            sx={{ width: 250 }}
          >
            <List>
              <ListItem key={'Home'} disablePadding>
                <ListItemButton component={Link} to={'/'} onClick={() => setDrawerOpen(false)}>
                  <ListItemIcon>
                    <HomeIcon />
                  </ListItemIcon>
                  <ListItemText primary={'Home'} />
                </ListItemButton>
              </ListItem>

              <Divider />

              <ListItem key={'Tactics replay'} disablePadding>
                <ListItemButton component={Link} to={'/board'} onClick={() => setDrawerOpen(false)}>
                  <ListItemIcon>
                    <TrackChangesIcon />
                  </ListItemIcon>
                  <ListItemText primary={'Tactics replay'} />
                </ListItemButton>
              </ListItem>

              <ListItem key={'Openings trainer'} disablePadding>
                <ListItemButton component={Link} to={'/preparation'} onClick={() => setDrawerOpen(false)}>
                  <ListItemIcon>
                    <MeetingRoomIcon />
                  </ListItemIcon>
                  <ListItemText primary={'Openings trainer'} />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </Drawer>
      </div >
    </div >
  );
}



export default App;
