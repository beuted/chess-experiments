import { ChessComArchive, fromLichessToChessComArchive, TimeClass, UserInfo } from "./ChessComArchive";

export class LichessClient {
  public async fetchStatisticsPerGameType(userName: string, gameType: TimeClass) {
    let url = `https://lichess.org/api/user/${userName}/perf/${gameType}`;
    let response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    let res = await response.json();

    return { rating: res.perf.glicko.rating, rd: res.perf.glicko.deviation, percentil: res.percentile / 100, nbGames: res.stat.count.rated };
  }

  public async fetchAllArchives(userName: string, startDate: Date, gameType: TimeClass, maxNbFetchedGame: number): Promise<ChessComArchive[]> {
    let archiveTemp: ChessComArchive[] = [];
    let startTime = startDate.getTime();
    let endDateCopy = new Date(startTime);
    endDateCopy.setMonth(endDateCopy.getMonth() - 1);
    let endTime = endDateCopy.getTime();
    let month = 0;

    while (month < 12 * 2) { // Set a limit to 2 years to avoid infinity loop user has less than the number of asked games
      let url = `https://lichess.org/api/games/user/${userName}?pgnInJson=true&clocks=true&opening=true&perfType=${gameType}&since=${endTime}&until=${startTime}`;
      let response = await fetch(url, {
        headers: {
          'Accept': 'application/x-ndjson'
        }
      });
      let res = await response.text();
      let lines = res.split("\n");

      for (let line of lines) {
        if (!line)
          continue;
        let lichessArchive = JSON.parse(line);

        if (lichessArchive.variant == "standard" && !!lichessArchive.moves && lichessArchive.speed === gameType) { // Filter based of game type
          archiveTemp.push(fromLichessToChessComArchive(lichessArchive));
          if (archiveTemp.length >= maxNbFetchedGame) {
            month = 1000; // Easy way to break the while loop
            break;
          }
        }
      }

      // Update start and end Date
      startTime = endTime;
      endDateCopy.setMonth(endDateCopy.getMonth() - 1);
      endTime = endDateCopy.getTime();

      month++;
    }
    return archiveTemp;
  }

  public async fetchStatistics(userName: string) {
    const blitz = await this.fetchStatisticsPerGameType(userName, 'blitz');
    const rapid = await this.fetchStatisticsPerGameType(userName, 'rapid');
    const standard = await this.fetchStatisticsPerGameType(userName, 'standard');
    const bullet = await this.fetchStatisticsPerGameType(userName, 'bullet');

    return { blitz, rapid, standard, bullet };
  }

  public async fetchUserInfo(userName: string): Promise<UserInfo> {
    let url = `https://lichess.org/api/user/${userName}`;
    let response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    let res = await response.json();

    let partialUserInfo = await this.fetchStatistics(userName);

    return Object.assign(partialUserInfo, {
      avatar: "https://lichess1.org/assets/logo/lichess-pad12.svg",
      country: res.profile?.country, // There seems to never be a country but the API says so ... https://lichess.org/api#tag/Users/operation/apiUser
      url: res.url,
      username: res.username
    });
  }
}