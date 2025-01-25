
import ChessWebAPI from 'chess-web-api';
import { ChessComArchive, TimeClass, UserInfo } from './ChessComArchive';

export class ChesscomClient {
  private chessAPI: any;

  constructor() {
    this.chessAPI = new ChessWebAPI();
  }

  public async fetchUserInfo(userName: string): Promise<UserInfo> {
    let responsePlayer = await this.chessAPI.getPlayer(userName);
    let responseStats = await this.chessAPI.getPlayerStats(userName);
    let globalStats = this.getPlayerStats()
    let userInfo: UserInfo = this.computeUserInfo(responsePlayer, responseStats, globalStats);
    return userInfo;
  }

  public async fetchAllArchives(userName: string, startDate: Date, gameType: TimeClass, maxNbFetchedGame: number): Promise<ChessComArchive[]> {
    let archiveTemp: ChessComArchive[] = [];
    const startYear = startDate.getUTCFullYear();
    const startMonth = startDate.getUTCMonth() + 1;
    let y = startYear;
    let m = startMonth;
    while (y > startYear - 2) { // Set a limit to 2 years to avoid infinity loop user has less than the numbe rof asked games
      let response = await this.chessAPI.getPlayerCompleteMonthlyArchives(userName, y, m);

      let newGamesToBeAdded = response.body.games.filter((x: ChessComArchive) => x.time_class == gameType)

      if (archiveTemp.length + newGamesToBeAdded.length >= maxNbFetchedGame) {
        // If we reach the last call we don't take all the games from this month
        var gamesToBeAdded = newGamesToBeAdded.slice(-(maxNbFetchedGame - archiveTemp.length));
        archiveTemp = archiveTemp.concat(gamesToBeAdded);
        break;
      }

      archiveTemp = archiveTemp.concat(newGamesToBeAdded);

      if (m == 1) {
        m = 12; y--;
      } else {
        m--;
      }
    }
    return archiveTemp;
  }

  private getPercentil(userRating: number, rating_distribution: { [key: number]: number }) {
    userRating = userRating || 0;
    let playerLower = 0;
    let totalPlayers = 0;

    for (let [_, nbPlayer] of Object.entries(rating_distribution)) {
      totalPlayers += nbPlayer;
    }

    for (let [rating, nbPlayer] of Object.entries(rating_distribution)) {
      if (userRating < Number(rating)) {
        let faction = ((userRating % 100) / 100);
        playerLower += nbPlayer * faction;
        break;
      }
      playerLower += nbPlayer;
    }

    return playerLower / totalPlayers;
  }

  private computeUserInfo(responsePlayer: any, responseStats: any, globalStats: any) {
    return {
      username: responsePlayer.body.url.replace('https://www.chess.com/member/', ''), // We do that in oder to have the correct case afterwards and be able to compare easily with what the API return for game data
      avatar: responsePlayer.body.avatar,
      country: responsePlayer.body.country.split('/country/')[1],
      url: responsePlayer.body.url,
      blitz: {
        rating: responseStats.body.chess_blitz?.last?.rating || 0,
        rd: responseStats.body.chess_blitz?.last?.rd || 0,
        percentil: this.getPercentil(responseStats.body.chess_blitz?.last?.rating, globalStats.blitz.stats.rating_distribution),
        nbGames: responseStats.body.chess_blitz?.record.win + responseStats.body.chess_blitz?.record.draw + responseStats.body.chess_blitz?.record.loss
      },
      bullet: {
        rating: responseStats.body.chess_bullet?.last?.rating || 0,
        rd: responseStats.body.chess_bullet?.last?.rd || 0,
        percentil: this.getPercentil(responseStats.body.chess_bullet?.last?.rating, globalStats.bullet.stats.rating_distribution),
        nbGames: responseStats.body.chess_bullet?.record.win + responseStats.body.chess_bullet?.record.draw + responseStats.body.chess_bullet?.record.loss
      },
      rapid: {
        rating: responseStats.body.chess_rapid?.last?.rating || 0,
        rd: responseStats.body.chess_rapid?.last?.rd || 0,
        percentil: this.getPercentil(responseStats.body.chess_rapid?.last?.rating, globalStats.rapid.stats.rating_distribution),
        nbGames: responseStats.body.chess_rapid?.record.win + responseStats.body.chess_rapid?.record.draw + responseStats.body.chess_rapid?.record.loss
      },
      classical: {
        rating: responseStats.body.chess_daily?.last?.rating || 0,
        rd: responseStats.body.chess_daily?.last?.rd || 0,
        percentil: this.getPercentil(responseStats.body.chess_daily?.last?.rating, globalStats.classical.stats.rating_distribution),
        nbGames: responseStats.body.chess_daily?.record.win || 0 + responseStats.body.chess_daily?.record.draw || 0 + responseStats.body.chess_daily?.record.loss || 0
      },
    }
  }

  private getPlayerStats() {
    // Fetched manually from "https://www.chess.com/callback/leaderboard/live/sidebar/blitz/stats";
    // NB: player_count seems to not match the number of player in rating_distribution...
    let blitz = { "stats": {"rating_distribution":{"100":1140565,"200":1732720,"300":1902949,"400":1904154,"500":1754251,"600":1538142,"700":1434521,"800":1088456,"900":844007,"1000":673913,"1100":765708,"1200":504868,"1300":376019,"1400":284139,"1500":218182,"1600":165328,"1700":122798,"1800":90831,"1900":64406,"2000":48722,"2100":31715,"2200":20974,"2300":13718,"2400":8788,"2500":6257,"2600":3403,"2700":1853,"2800":978,"2900":451,"3000":197,"3100":71,"3200":9,"3300":1},"avg_rating":"628.2764","player_count":31213834} };
    let bullet = {"stats":{"rating_distribution":{"100":769329,"200":1184888,"300":1333346,"400":1288938,"500":1145823,"600":950318,"700":820508,"800":605723,"900":454277,"1000":361539,"1100":352743,"1200":239889,"1300":182278,"1400":139914,"1500":107374,"1600":82128,"1700":61445,"1800":45723,"1900":32829,"2000":26497,"2100":17021,"2200":11690,"2300":7819,"2400":5054,"2500":3971,"2600":2240,"2700":1252,"2800":619,"2900":277,"3000":155,"3100":51,"3200":20,"3300":3},"avg_rating":"578.6143","player_count":21604333}}
    let rapid = {"stats":{"rating_distribution":{"100":2420828,"200":3992672,"300":4726984,"400":5377818,"500":5055452,"600":4529568,"700":4054690,"800":3187793,"900":2409469,"1000":1928523,"1100":1728444,"1200":1166202,"1300":811324,"1400":570936,"1500":411451,"1600":300789,"1700":205413,"1800":138999,"1900":88954,"2000":77826,"2100":40527,"2200":18722,"2300":8515,"2400":3219,"2500":894,"2600":276,"2700":92,"2800":16,"2900":7,"3000":1},"avg_rating":"614.7616","player_count":84603860}}
    let standard = {"stats":{"rating_distribution":{"100":2420828,"200":3992672,"300":4726984,"400":5377818,"500":5055452,"600":4529568,"700":4054690,"800":3187793,"900":2409469,"1000":1928523,"1100":1728444,"1200":1166202,"1300":811324,"1400":570936,"1500":411451,"1600":300789,"1700":205413,"1800":138999,"1900":88954,"2000":77826,"2100":40527,"2200":18722,"2300":8515,"2400":3219,"2500":894,"2600":276,"2700":92,"2800":16,"2900":7,"3000":1},"avg_rating":"614.7616","player_count":84603860}}
    let result = { blitz:blitz, bullet:bullet, rapid: rapid, classical: standard };

    return result;
  }

}