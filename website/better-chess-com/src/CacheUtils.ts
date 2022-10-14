import { HydratedChessComArchive } from "./ChessComArchive";

export function getLocalCache(userName?: string): { [key: string]: { games: HydratedChessComArchive[], sfDepth: number } } {
  const monthsInfoString = window.localStorage.getItem("months");
  let months: string[] = monthsInfoString ? JSON.parse(monthsInfoString) : [];
  let localCache: { [key: string]: { games: HydratedChessComArchive[], sfDepth: number } } = {};

  for (let monthAndType of months) {
    // We clear the previous games from another username
    const monthAndTypeSplitArray = monthAndType.split("%");
    const monthUsername = monthAndTypeSplitArray[monthAndTypeSplitArray.length - 1];
    if (userName && monthUsername != userName)
      continue;

    let monthGames = window.localStorage.getItem(monthAndType);
    localCache[monthAndType] = monthGames ? JSON.parse(monthGames) : ({ games: [], sfDepth: 0 });
  }

  return localCache;
}

export function setLocalCache(filteredArchives: HydratedChessComArchive[], gameType: string, userName: string): { [key: string]: { nbGames: number, sfDepth: number } } {
  let localCache: { [key: string]: { games: HydratedChessComArchive[], sfDepth: number } } = {};
  let months: string[] = [];
  for (const archive of filteredArchives) {
    let monthAndType: string = new Date(archive.end_time * 1000).toISOString().substring(0, 7) + "%" + gameType + "%" + userName;
    if (!localCache[monthAndType]) {
      localCache[monthAndType] = { games: [], sfDepth: 99 };
    }

    if (!months.includes(monthAndType)) {
      months.push(monthAndType);
    }

    localCache[monthAndType].games.push(archive);
    if (localCache[monthAndType].sfDepth > archive.sfDepth)
      localCache[monthAndType].sfDepth = archive.sfDepth
  }

  localStorage.setItem("months", JSON.stringify(months));

  for (const entry of Object.entries(localCache)) {
    localStorage.setItem(entry[0], JSON.stringify(entry[1]));
  }

  let monthsInfo: { [key: string]: { nbGames: number, sfDepth: number } } = {};
  for (let month of Object.keys(localCache)) {
    monthsInfo[month] = { nbGames: localCache[month].games.length, sfDepth: localCache[month].sfDepth };
  }

  return monthsInfo;
}