import { matches as mockMatches, groupsData as mockGroups } from '../data/mundialData';

export const TEAM_DICTIONARY = {
  "Mexico": { es: "México", flag: "🇲🇽" }, "South Africa": { es: "Sudáfrica", flag: "🇿🇦" },
  "South Korea": { es: "Corea del Sur", flag: "🇰🇷" }, "Czech Republic": { es: "Rep. Checa", flag: "🇨🇿" },
  "Canada": { es: "Canadá", flag: "🇨🇦" }, "Bosnia and Herzegovina": { es: "Bosnia y Herz.", flag: "🇧🇦" },
  "United States": { es: "Estados Unidos", flag: "🇺🇸" }, "Paraguay": { es: "Paraguay", flag: "🇵🇾" },
  "Haiti": { es: "Haití", flag: "🇭🇹" }, "Scotland": { es: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  "Australia": { es: "Australia", flag: "🇦🇺" }, "Turkey": { es: "Turquía", flag: "🇹🇷" },
  "Brazil": { es: "Brasil", flag: "🇧🇷" }, "Morocco": { es: "Marruecos", flag: "🇲🇦" },
  "Qatar": { es: "Qatar", flag: "🇶🇦" }, "Switzerland": { es: "Suiza", flag: "🇨🇭" },
  "Ivory Coast": { es: "Costa de Marfil", flag: "🇨🇮" }, "Ecuador": { es: "Ecuador", flag: "🇪🇨" },
  "Germany": { es: "Alemania", flag: "🇩🇪" }, "Curaçao": { es: "Curazao", flag: "🇨🇼" },
  "Netherlands": { es: "Países Bajos", flag: "🇳🇱" }, "Japan": { es: "Japón", flag: "🇯🇵" },
  "Senegal": { es: "Senegal", flag: "🇸🇳" }, "Iran": { es: "Irán", flag: "🇮🇷" },
  "Mali": { es: "Malí", flag: "🇲🇱" }, "Wales": { es: "Gales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  "France": { es: "Francia", flag: "🇫🇷" }, "Cameroon": { es: "Camerún", flag: "🇨🇲" },
  "Spain": { es: "España", flag: "🇪🇸" }, "Costa Rica": { es: "Costa Rica", flag: "🇨🇷" },
  "England": { es: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, "Algeria": { es: "Argelia", flag: "🇩🇿" },
  "Argentina": { es: "Argentina", flag: "🇦🇷" }, "Nigeria": { es: "Nigeria", flag: "🇳🇬" },
  "Belgium": { es: "Bélgica", flag: "🇧🇪" }, "Honduras": { es: "Honduras", flag: "🇭🇳" },
  "Uruguay": { es: "Uruguay", flag: "🇺🇾" }, "Jamaica": { es: "Jamaica", flag: "🇯🇲" },
  "Portugal": { es: "Portugal", flag: "🇵🇹" }, "Ghana": { es: "Ghana", flag: "🇬🇭" },
  "Sweden": { es: "Suecia", flag: "🇸🇪" }, "Saudi Arabia": { es: "Arabia Saudita", flag: "🇸🇦" },
  "Croatia": { es: "Croacia", flag: "🇭🇷" }, "Tunisia": { es: "Túnez", flag: "🇹🇳" },
  "Italy": { es: "Italia", flag: "🇮🇹" }, "Colombia": { es: "Colombia", flag: "🇨🇴" },
  "Denmark": { es: "Dinamarca", flag: "🇩🇰" }, "New Zealand": { es: "Nueva Zelanda", flag: "🇳🇿" },
  "Austria": { es: "Austria", flag: "🇦🇹" }, "Uzbekistan": { es: "Uzbekistán", flag: "🇺🇿" },
  "Egypt": { es: "Egipto", flag: "🇪🇬" }, "Cape Verde": { es: "Cabo Verde", flag: "🇨🇻" },
  "Iraq": { es: "Irak", flag: "🇮🇶" }, "Norway": { es: "Noruega", flag: "🇳🇴" },
  "Jordan": { es: "Jordania", flag: "🇯🇴" }, "DR Congo": { es: "Rep. Dem. Congo", flag: "🇨🇩" },
  "Democratic Republic of the Congo": { es: "Rep. Dem. Congo", flag: "🇨🇩" }, "Panama": { es: "Panamá", flag: "🇵🇦" },
  "Bolivia": { es: "Bolivia", flag: "🇧🇴" }, "Peru": { es: "Perú", flag: "🇵🇪" },
  "Chile": { es: "Chile", flag: "🇨🇱" }, "Venezuela": { es: "Venezuela", flag: "🇻🇪" },
  "Poland": { es: "Polonia", flag: "🇵🇱" }, "Serbia": { es: "Serbia", flag: "🇷🇸" }
};

export const MATCH_TIMES_OVERRIDE = {
  "United States-Australia": "2026-06-19T15:00:00-04:00", "Turkey-Paraguay": "2026-06-19T23:00:00-04:00",
  "Paraguay-Australia": "2026-06-25T22:00:00-04:00", "Turkey-United States": "2026-06-25T22:00:00-04:00",
  "South Africa-South Korea": "2026-06-24T21:00:00-04:00", "Czech Republic-Mexico": "2026-06-24T21:00:00-04:00",
  "Bosnia and Herzegovina-Qatar": "2026-06-24T15:00:00-04:00", "Switzerland-Canada": "2026-06-24T15:00:00-04:00",
  "Scotland-Morocco": "2026-06-19T18:00:00-04:00", "Brazil-Haiti": "2026-06-19T20:30:00-04:00",
  "Scotland-Brazil": "2026-06-24T18:00:00-04:00", "Morocco-Haiti": "2026-06-24T18:00:00-04:00",
  "Germany-Ivory Coast": "2026-06-20T16:00:00-04:00", "Ecuador-Curaçao": "2026-06-20T20:00:00-04:00",
  "Curaçao-Ivory Coast": "2026-06-25T16:00:00-04:00", "Ecuador-Germany": "2026-06-25T16:00:00-04:00",
  "Netherlands-Sweden": "2026-06-20T13:00:00-04:00", "Tunisia-Japan": "2026-06-21T00:00:00-04:00",
  "Japan-Sweden": "2026-06-25T19:00:00-04:00", "Tunisia-Netherlands": "2026-06-25T19:00:00-04:00",
  "Belgium-Iran": "2026-06-21T15:00:00-04:00", "New Zealand-Egypt": "2026-06-21T21:00:00-04:00",
  "New Zealand-Belgium": "2026-06-26T23:00:00-04:00", "Egypt-Iran": "2026-06-26T23:00:00-04:00",
  "Spain-Saudi Arabia": "2026-06-21T12:00:00-04:00", "Uruguay-Cape Verde": "2026-06-21T18:00:00-04:00",
  "Cape Verde-Saudi Arabia": "2026-06-26T20:00:00-04:00", "Uruguay-Spain": "2026-06-26T20:00:00-04:00",
  "France-Iraq": "2026-06-22T17:00:00-04:00", "Norway-Senegal": "2026-06-22T20:00:00-04:00",
  "Senegal-Iraq": "2026-06-26T15:00:00-04:00", "Norway-France": "2026-06-26T15:00:00-04:00",
  "Argentina-Austria": "2026-06-22T13:00:00-04:00", "Jordan-Algeria": "2026-06-22T23:00:00-04:00",
  "Algeria-Austria": "2026-06-27T22:00:00-04:00", "Jordan-Argentina": "2026-06-27T22:00:00-04:00",
  "Portugal-Uzbekistan": "2026-06-23T13:00:00-04:00", "Colombia-DR Congo": "2026-06-23T22:00:00-04:00",
  "DR Congo-Uzbekistan": "2026-06-27T19:30:00-04:00", "Colombia-Portugal": "2026-06-27T19:30:00-04:00",
  "England-Ghana": "2026-06-23T16:00:00-04:00", "Panama-Croatia": "2026-06-23T19:00:00-04:00",
  "Croatia-Ghana": "2026-06-27T17:00:00-04:00", "Panama-England": "2026-06-27T17:00:00-04:00"
};

export const getBoliviaTimeData = (isoString) => {
  const date = new Date(isoString);
  const timeFormatted = date.toLocaleTimeString('es-BO', { 
    timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false
  });
  const dateFormatted = date.toLocaleDateString('es-BO', { 
    timeZone: 'America/La_Paz', weekday: 'long', day: 'numeric', month: 'long' 
  });
  return { time: timeFormatted, date: dateFormatted, timestamp: date.getTime() };
};

export const fetchLiveMatches = async () => {
  let gamesArray = [];
  try {
    const response = await fetch('https://worldcup26.ir/get/games');
    if (!response.ok) throw new Error(`HTTP: ${response.status}`);
    const data = await response.json();
    gamesArray = (data && Array.isArray(data.games)) ? data.games : [];
    if (gamesArray.length > 0) localStorage.setItem('api_matches_cache', JSON.stringify(gamesArray));
  } catch (error) {
    const cached = localStorage.getItem('api_matches_cache');
    if (cached) try { gamesArray = JSON.parse(cached); } catch (e) {}
    if (gamesArray.length === 0) return mockMatches;
  }

  return gamesArray.map((game, index) => {
    let label1 = game.home_team_label?.replace('Winner Match', 'Ganador Partido').replace('Loser Match', 'Perdedor Partido');
    let label2 = game.away_team_label?.replace('Winner Match', 'Ganador Partido').replace('Loser Match', 'Perdedor Partido');

    let team1En = String(game.home_team_id) === '0' ? (label1 || 'Por definir') : game.home_team_name_en;
    let team2En = String(game.away_team_id) === '0' ? (label2 || 'Por definir') : game.away_team_name_en;
    
    let score1 = (game.home_score === 'null' || game.home_score == null) ? null : Number(game.home_score);
    let score2 = (game.away_score === 'null' || game.away_score == null) ? null : Number(game.away_score);

    const team1 = TEAM_DICTIONARY[team1En]?.es || team1En;
    const team2 = TEAM_DICTIONARY[team2En]?.es || team2En;
    const flag1 = TEAM_DICTIONARY[team1En]?.flag || '🏳️';
    const flag2 = TEAM_DICTIONARY[team2En]?.flag || '🏳️';

    let status = 'PENDIENTE'; 
    const isFinished = String(game.finished).toUpperCase() === 'TRUE' || game.finished === true;
    const elapsed = String(game.time_elapsed || '').toLowerCase();

    if (isFinished) {
      status = 'FINALIZADO';
    } else if (['live', 'in_play', 'paused', 'ht', 'et', 'p', 'en_curso'].includes(elapsed)) {
      status = 'EN_CURSO'; 
    } else if (elapsed === 'postponed') {
      status = 'PENDIENTE'; 
    }

    const matchKey1 = `${game.home_team_name_en}-${game.away_team_name_en}`;
    const matchKey2 = `${game.away_team_name_en}-${game.home_team_name_en}`;
    
    let dateIso = MATCH_TIMES_OVERRIDE[matchKey1] || MATCH_TIMES_OVERRIDE[matchKey2];
    if (!dateIso) {
      dateIso = new Date().toISOString();
      if (game.local_date && !isNaN(new Date(game.local_date).getTime())) {
        dateIso = new Date(game.local_date).toISOString();
      }
    }

    const boData = getBoliviaTimeData(dateIso);

    const mappedGame = {
      id: game.id || String(index),
      team1: team1 || 'Equipo 1',
      team2: team2 || 'Equipo 2',
      flag1,
      flag2,
      score1,
      score2,
      home_scorers: game.home_scorers,
      away_scorers: game.away_scorers,
      status, 
      date: dateIso, 
      displayDate: boData.date, 
      time: boData.time,
      stage: game.type === 'group' ? 'Fase de Grupos' : game.type,
      group: game.group,
      matchType: game.type
    };

    if (String(mappedGame.id) === "47" || (mappedGame.team1?.includes('Colombia') && mappedGame.team2?.includes('Congo'))) {
      mappedGame.time = "22:00";
    }

    return mappedGame;
  });
};

export const calculateStandings = (matches) => {
  const groupsMap = {};

  matches.forEach(match => {
    if (match.matchType !== 'group' || !match.group) return;
    const formattedGroup = `Grupo ${match.group}`;
    if (!groupsMap[formattedGroup]) groupsMap[formattedGroup] = {};

    const initTeam = (teamName) => {
      if (!teamName || teamName === 'Por definir') return;
      if (!groupsMap[formattedGroup][teamName]) {
        groupsMap[formattedGroup][teamName] = { name: teamName, pts: 0, pj: 0, gf: 0, gc: 0, dg: 0 };
      }
    };

    initTeam(match.team1);
    initTeam(match.team2);

    // <--- VARIABLES RESUCITADAS:
    const t1 = groupsMap[formattedGroup][match.team1];
    const t2 = groupsMap[formattedGroup][match.team2];

    if (match.status !== 'FINALIZADO' && match.status !== 'FINISHED') return;
    if (!t1 || !t2) return;

    t1.pj += 1; t2.pj += 1;
    const s1 = Number(match.score1) || 0; const s2 = Number(match.score2) || 0;
    t1.gf += s1; t1.gc += s2; t2.gf += s2; t2.gc += s1;

    if (s1 > s2) t1.pts += 3;
    else if (s2 > s1) t2.pts += 3;
    else { t1.pts += 1; t2.pts += 1; }

    t1.dg = t1.gf - t1.gc; t2.dg = t2.gf - t2.gc;
  });

  const formattedStandings = Object.keys(groupsMap).map(groupName => ({
    group: groupName,
    teams: Object.values(groupsMap[groupName]).sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : (b.dg !== a.dg ? b.dg - a.dg : b.gf - a.gf))
  })).sort((a, b) => a.group.localeCompare(b.group));

  return formattedStandings.length > 0 ? formattedStandings : mockGroups;
};