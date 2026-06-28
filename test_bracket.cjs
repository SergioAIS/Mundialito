const fs = require('fs');
const games = JSON.parse(fs.readFileSync('games.json', 'utf8')).games;

const getDependencies = (match) => {
  if (!match) return [];
  const leftId = match.home_team_label?.match(/Match (\d+)/i)?.[1];
  const rightId = match.away_team_label?.match(/Match (\d+)/i)?.[1];
  return [leftId, rightId].filter(Boolean);
};

const earliestDateCache = {};
const getEarliestDate = (matchId) => {
  if (earliestDateCache[matchId]) return earliestDateCache[matchId];
  const match = games.find(m => String(m.id) === String(matchId));
  if (!match) return Infinity;
  
  let minDate = new Date(match.local_date).getTime();
  const deps = getDependencies(match);
  deps.forEach(depId => {
    const depDate = getEarliestDate(depId);
    if (depDate < minDate) minDate = depDate;
  });
  
  earliestDateCache[matchId] = minDate;
  return minDate;
};

const buildBracketOrder = (rootIds) => {
  let currentLevel = rootIds;
  const roundsOrder = [];
  
  while (currentLevel.length > 0) {
    roundsOrder.unshift(currentLevel); 
    let nextLevel = [];
    
    currentLevel.forEach(matchId => {
      const match = games.find(m => String(m.id) === String(matchId));
      const deps = getDependencies(match);
      if (deps.length === 2) {
        deps.sort((a, b) => getEarliestDate(a) - getEarliestDate(b));
      }
      nextLevel.push(...deps);
    });
    
    currentLevel = nextLevel;
  }
  return roundsOrder;
};

const bracketTreeLevels = buildBracketOrder(['104']).reverse();
console.log("R32 (index 0):", bracketTreeLevels[0]);
console.log("R16 (index 1):", bracketTreeLevels[1]);
console.log("QF (index 2):", bracketTreeLevels[2]);
