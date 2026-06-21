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
  // Grupo D
  "United States-Australia": "2026-06-19T15:00:00-04:00",
  "Turkey-Paraguay": "2026-06-19T23:00:00-04:00",
  "Paraguay-Australia": "2026-06-25T22:00:00-04:00",
  "Turkey-United States": "2026-06-25T22:00:00-04:00",
  // Grupo A
  "South Africa-South Korea": "2026-06-24T21:00:00-04:00",
  "Czech Republic-Mexico": "2026-06-24T21:00:00-04:00",
  // Grupo B
  "Bosnia and Herzegovina-Qatar": "2026-06-24T15:00:00-04:00",
  "Switzerland-Canada": "2026-06-24T15:00:00-04:00",
  // Grupo C
  "Scotland-Morocco": "2026-06-19T18:00:00-04:00",
  "Brazil-Haiti": "2026-06-19T20:30:00-04:00",
  "Scotland-Brazil": "2026-06-24T18:00:00-04:00",
  "Morocco-Haiti": "2026-06-24T18:00:00-04:00",
  // Grupo E
  "Germany-Ivory Coast": "2026-06-20T16:00:00-04:00",
  "Ecuador-Curaçao": "2026-06-20T20:00:00-04:00",
  "Curaçao-Ivory Coast": "2026-06-25T16:00:00-04:00",
  "Ecuador-Germany": "2026-06-25T16:00:00-04:00",
  // Grupo F
  "Netherlands-Sweden": "2026-06-20T13:00:00-04:00",
  "Tunisia-Japan": "2026-06-21T00:00:00-04:00",
  "Japan-Sweden": "2026-06-25T19:00:00-04:00",
  "Tunisia-Netherlands": "2026-06-25T19:00:00-04:00",
  // Grupo G
  "Belgium-Iran": "2026-06-21T15:00:00-04:00",
  "New Zealand-Egypt": "2026-06-21T21:00:00-04:00",
  "New Zealand-Belgium": "2026-06-26T23:00:00-04:00",
  "Egypt-Iran": "2026-06-26T23:00:00-04:00",
  // Grupo H
  "Spain-Saudi Arabia": "2026-06-21T12:00:00-04:00",
  "Uruguay-Cape Verde": "2026-06-21T18:00:00-04:00",
  "Cape Verde-Saudi Arabia": "2026-06-26T20:00:00-04:00",
  "Uruguay-Spain": "2026-06-26T20:00:00-04:00",
  // Grupo I
  "France-Iraq": "2026-06-22T17:00:00-04:00",
  "Norway-Senegal": "2026-06-22T20:00:00-04:00",
  "Senegal-Iraq": "2026-06-26T15:00:00-04:00",
  "Norway-France": "2026-06-26T15:00:00-04:00",
  // Grupo J
  "Argentina-Austria": "2026-06-22T13:00:00-04:00",
  "Jordan-Algeria": "2026-06-22T23:00:00-04:00",
  "Algeria-Austria": "2026-06-27T22:00:00-04:00",
  "Jordan-Argentina": "2026-06-27T22:00:00-04:00",
  // Grupo K
  "Portugal-Uzbekistan": "2026-06-23T13:00:00-04:00",
  "Colombia-DR Congo": "2026-06-23T22:00:00-04:00",
  "DR Congo-Uzbekistan": "2026-06-27T19:30:00-04:00",
  "Colombia-Portugal": "2026-06-27T19:30:00-04:00",
  // Grupo L
  "England-Ghana": "2026-06-23T16:00:00-04:00",
  "Panama-Croatia": "2026-06-23T19:00:00-04:00",
  "Croatia-Ghana": "2026-06-27T17:00:00-04:00",
  "Panama-England": "2026-06-27T17:00:00-04:00"
};

/**
 * Utilidad para manejar fechas de la API.
 */
export const getBoliviaTimeData = (isoString) => {
  const date = new Date(isoString);
  
  const timeFormatted = date.toLocaleTimeString('es-BO', { 
    timeZone: 'America/La_Paz',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });

  const dateFormatted = date.toLocaleDateString('es-BO', { 
    timeZone: 'America/La_Paz',
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return {
    time: timeFormatted,
    date: dateFormatted,
    timestamp: date.getTime()
  };
};

/**
 * Obtiene los partidos desde la API Comunitaria (worldcup26.ir).
 */
export const fetchLiveMatches = async () => {
  let gamesArray = [];
  try {
    const url = 'https://worldcup26.ir/get/games';
    const response = await fetch(url);
    
    console.log("Status HTTP:", response.status);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log("Datos Open-Source:", data);

    gamesArray = (data && Array.isArray(data.games)) ? data.games : [];
    
    if (!gamesArray || gamesArray.length === 0) {
      throw new Error("Datos vacíos o estructura de respuesta no reconocida");
    }

    // Guardar en caché si la llamada fue exitosa
    localStorage.setItem('api_matches_cache', JSON.stringify(gamesArray));

  } catch (error) {
    console.error('fetchLiveMatches falló. Buscando en caché local:', error);
    const cached = localStorage.getItem('api_matches_cache');
    if (cached) {
      try {
        gamesArray = JSON.parse(cached);
        console.log("Cargando datos desde caché local.");
      } catch (e) {
        console.error("Error parseando caché.", e);
      }
    }
    
    if (!gamesArray || gamesArray.length === 0) {
      console.error('Caché falló o está vacía. Retornando datos simulados (fallback).');
      return new Promise(resolve => setTimeout(() => resolve(mockMatches), 800));
    }
  }

  return gamesArray.map((game, index) => {
    let label1 = game.home_team_label;
    if (label1) {
      label1 = label1.replace('Winner Match', 'Ganador Partido').replace('Loser Match', 'Perdedor Partido');
    }
    let label2 = game.away_team_label;
    if (label2) {
      label2 = label2.replace('Winner Match', 'Ganador Partido').replace('Loser Match', 'Perdedor Partido');
    }

    let team1En = String(game.home_team_id) === '0' ? (label1 || 'Por definir') : game.home_team_name_en;
    let team2En = String(game.away_team_id) === '0' ? (label2 || 'Por definir') : game.away_team_name_en;
    
    let score1 = (game.home_score === 'null' || game.home_score === null || game.home_score === undefined) ? null : Number(game.home_score);
    let score2 = (game.away_score === 'null' || game.away_score === null || game.away_score === undefined) ? null : Number(game.away_score);

    // Forzar orden alfabético para garantizar integridad entre local y visitante
    if (team1En > team2En) {
      const tempTeam = team1En;
      team1En = team2En;
      team2En = tempTeam;

      const tempScore = score1;
      score1 = score2;
      score2 = tempScore;
    }
    
    const team1 = TEAM_DICTIONARY[team1En] ? TEAM_DICTIONARY[team1En].es : team1En;
    const team2 = TEAM_DICTIONARY[team2En] ? TEAM_DICTIONARY[team2En].es : team2En;
    
    let status = 'PENDIENTE';
    if (String(game.finished).toUpperCase() === 'TRUE') {
      status = 'FINALIZADO';
    } else if (String(game.finished).toUpperCase() === 'FALSE') {
      if (game.time_elapsed === 'notstarted') {
        status = 'PENDIENTE';
      } else {
        status = 'EN_CURSO';
      }
    }
    
    const matchKey1 = game.home_team_name_en + "-" + game.away_team_name_en;
    const matchKey2 = game.away_team_name_en + "-" + game.home_team_name_en;
    
    let dateIso;
    if (MATCH_TIMES_OVERRIDE[matchKey1]) {
      dateIso = MATCH_TIMES_OVERRIDE[matchKey1];
    } else if (MATCH_TIMES_OVERRIDE[matchKey2]) {
      dateIso = MATCH_TIMES_OVERRIDE[matchKey2];
    } else {
      dateIso = new Date().toISOString();
      if (game.local_date) {
        // Asumimos que local_date ya está en la zona horaria correcta para los cálculos de frontend
        const d = new Date(game.local_date);
        if (!isNaN(d.getTime())) {
          dateIso = d.toISOString();
        }
      }
    }

    return {
      id: game.id || String(index),
      team1: team1 || 'Equipo 1',
      team2: team2 || 'Equipo 2',
      score1,
      score2,
      status,
      date: dateIso,
      stage: game.type === 'group' ? 'Fase de Grupos' : game.type,
      group: game.group,
      matchType: game.type
    };
  });
};

/**
 * Calcula las tablas de posiciones dinámicamente a partir del array de partidos.
 */
export const calculateStandings = (matches) => {
  const groupsMap = {};

  matches.forEach(match => {
    // Asegurarnos de que el partido tiene un grupo y es de Fase de Grupos
    if (match.matchType !== 'group' || !match.group) return;
    
    // Formatear el nombre del grupo para la UI (ej. 'Grupo A')
    const formattedGroup = 'Grupo ' + match.group;

    // Inicializar el grupo si no existe
    if (!groupsMap[formattedGroup]) {
      groupsMap[formattedGroup] = {};
    }

    const initTeam = (teamName) => {
      if (teamName === 'Por definir' || !teamName) return;
      if (!groupsMap[formattedGroup][teamName]) {
        groupsMap[formattedGroup][teamName] = { name: teamName, pts: 0, pj: 0, gf: 0, gc: 0, dg: 0 };
      }
    };

    initTeam(match.team1);
    initTeam(match.team2);

    const t1 = groupsMap[formattedGroup][match.team1];
    const t2 = groupsMap[formattedGroup][match.team2];

    // Si el partido no está finalizado, solo creamos el equipo con 0 pts, pero no sumamos PJ ni goles
    if (match.status !== 'FINALIZADO') return;
    if (!t1 || !t2) return;

    // Actualizar Partidos Jugados
    t1.pj += 1;
    t2.pj += 1;

    // Actualizar Goles
    const s1 = Number(match.score1) || 0;
    const s2 = Number(match.score2) || 0;
    
    t1.gf += s1;
    t1.gc += s2;
    t2.gf += s2;
    t2.gc += s1;

    // Puntos
    if (s1 > s2) {
      t1.pts += 3;
    } else if (s2 > s1) {
      t2.pts += 3;
    } else {
      t1.pts += 1;
      t2.pts += 1;
    }

    // Diferencia de Goles
    t1.dg = t1.gf - t1.gc;
    t2.dg = t2.gf - t2.gc;
  });

  // Convertir al array compatible con la UI
  const formattedStandings = Object.keys(groupsMap).map(groupName => {
    const teamsArray = Object.values(groupsMap[groupName]);
    
    // Ordenar: Pts -> DG -> GF
    teamsArray.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.gf - a.gf;
    });

    return {
      group: groupName,
      teams: teamsArray
    };
  });

  // Ordenar los grupos alfabéticamente
  formattedStandings.sort((a, b) => a.group.localeCompare(b.group));

  // Fallback de seguridad: si no se generó ningún grupo (ej. la API no envía 'group'), devuelve el mock
  if (formattedStandings.length === 0) {
    return mockGroups;
  }

  return formattedStandings;
};
