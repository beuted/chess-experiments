
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
      standard: {
        rating: responseStats.body.chess_daily?.last?.rating || 0,
        rd: responseStats.body.chess_daily?.last?.rd || 0,
        percentil: this.getPercentil(responseStats.body.chess_daily?.last?.rating, globalStats.rapid.stats.rating_distribution),
        nbGames: responseStats.body.chess_daily?.record.win || 0 + responseStats.body.chess_daily?.record.draw || 0 + responseStats.body.chess_daily?.record.loss || 0
      },
    }
  }

  private getPlayerStats() {
    // Fetched manually from "https://www.chess.com/callback/leaderboard/live/sidebar/blitz/stats";
    // NB: player_count seems to not match the number of player in rating_distribution...
    let blitz = { "stats": { "rating_distribution": { "100": 126425, "200": 250740, "300": 390426, "400": 511150, "500": 577299, "600": 610079, "700": 597628, "800": 557390, "900": 486818, "1000": 419365, "1100": 343805, "1200": 281970, "1300": 225232, "1400": 174220, "1500": 134213, "1600": 101361, "1700": 76267, "1800": 55117, "1900": 39512, "2000": 29326, "2100": 19240, "2200": 12482, "2300": 8067, "2400": 5057, "2500": 3097, "2600": 1719, "2700": 1128, "2800": 579, "2900": 267, "3000": 88, "3100": 25, "3200": 7 }, "avg_rating": "805.4999", "player_count": 9695300 }, };
    let bullet = { "stats": { "rating_distribution": { "100": 62042, "200": 120328, "300": 199037, "400": 271865, "500": 313197, "600": 329770, "700": 316186, "800": 289840, "900": 245768, "1000": 208495, "1100": 167080, "1200": 135634, "1300": 106288, "1400": 81762, "1500": 62326, "1600": 46693, "1700": 34353, "1800": 24922, "1900": 17767, "2000": 13714, "2100": 9149, "2200": 6471, "2300": 4206, "2400": 2813, "2500": 1877, "2600": 1149, "2700": 686, "2800": 379, "2900": 150, "3000": 84, "3100": 45, "3200": 11, "3300": 3, "3400": 1 }, "avg_rating": "791.3378", "player_count": 5954548 }, }
    let rapid = { "stats": { "rating_distribution": { "100": 270623, "200": 537880, "300": 838094, "400": 1129216, "500": 1328763, "600": 1441476, "700": 1445160, "800": 1373083, "900": 1185590, "1000": 1012293, "1100": 819619, "1200": 664880, "1300": 479822, "1400": 342213, "1500": 238568, "1600": 164305, "1700": 108690, "1800": 71036, "1900": 44384, "2000": 28996, "2100": 15779, "2200": 8288, "2300": 4036, "2400": 1635, "2500": 569, "2600": 176, "2700": 57, "2800": 24, "2900": 5, "3400": 1 }, "avg_rating": "785.4554", "player_count": 24955138 } }
    let standard = { "stats": { "rating_distribution": { "100": 3425, "200": 7025, "300": 14069, "400": 35900, "500": 39988, "600": 59541, "700": 83748, "800": 116344, "900": 125586, "1000": 131305, "1100": 123526, "1200": 110780, "1300": 83280, "1400": 59084, "1500": 38953, "1600": 26795, "1700": 15138, "1800": 9089, "1900": 5026, "2000": 3354, "2100": 1449, "2200": 640, "2300": 260, "2400": 78, "2500": 22, "2600": 4, "2700": 1 }, "player_count": 1993414, "avg_rating": "1001.7453", "avg_rd": "119.9512177156" } }
    let result = { blitz, bullet, rapid, standard };

    return result;
  }

}