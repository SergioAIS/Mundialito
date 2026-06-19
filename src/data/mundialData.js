export const matches = [
  {
    id: 1,
    team1: 'Argentina',
    team2: 'Arabia Saudita',
    score1: 1,
    score2: 2,
    status: 'FINALIZADO',
    date: '2026-06-15T10:00:00-04:00', // UTC-4 Bolivia
    group: 'Grupo C',
    stage: 'Fase de Grupos'
  },
  {
    id: 2,
    team1: 'Bolivia',
    team2: 'Ecuador',
    score1: 1,
    score2: 1,
    status: 'EN_CURSO',
    date: '2026-06-19T00:00:00-04:00',
    group: 'Grupo A',
    stage: 'Fase de Grupos'
  },
  {
    id: 3,
    team1: 'Brasil',
    team2: 'Serbia',
    score1: null,
    score2: null,
    status: 'PENDIENTE',
    date: '2026-06-20T14:00:00-04:00',
    group: 'Grupo G',
    stage: 'Fase de Grupos'
  },
  {
    id: 4,
    team1: 'Inglaterra',
    team2: 'Senegal',
    score1: null,
    score2: null,
    status: 'PENDIENTE',
    date: '2026-06-25T16:00:00-04:00',
    stage: 'Dieciseisavos'
  },
  {
    id: 5,
    team1: 'Francia',
    team2: 'Polonia',
    score1: null,
    score2: null,
    status: 'PENDIENTE',
    date: '2026-06-26T12:00:00-04:00',
    stage: 'Dieciseisavos'
  }
];

export const communityPredictions = [
  { user: 'Carlos M.', pred: '2 - 1' },
  { user: 'María F.', pred: '1 - 1' },
  { user: 'Juan P.', pred: '0 - 2' },
  { user: 'Ana G.', pred: '3 - 0' }
];

export const groupsData = [
  {
    group: 'Grupo A',
    teams: [
      { name: 'Ecuador', flag: '🇪🇨', pts: 4, pj: 2, dg: 2 },
      { name: 'Bolivia', flag: '🇧🇴', pts: 4, pj: 2, dg: 1 },
      { name: 'Senegal', flag: '🇸🇳', pts: 3, pj: 2, dg: -1 },
      { name: 'Qatar', flag: '🇶🇦', pts: 0, pj: 2, dg: -2 },
    ]
  },
  {
    group: 'Grupo B',
    teams: [
      { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', pts: 6, pj: 2, dg: 4 },
      { name: 'USA', flag: '🇺🇸', pts: 4, pj: 2, dg: 1 },
      { name: 'Irán', flag: '🇮🇷', pts: 1, pj: 2, dg: -2 },
      { name: 'Gales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', pts: 0, pj: 2, dg: -3 },
    ]
  }
];
