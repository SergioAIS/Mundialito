import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Trophy, User, CloudUpload, Send, Home, Calendar, Users, ListOrdered, Edit3, Save, Medal, Lock, ChevronDown, ChevronUp, Loader2, LogOut, Smartphone, Monitor, Share, PlusSquare, Shuffle } from 'lucide-react';
import offlineStorage from './utils/offlineStorage';
import { communityPredictions } from './data/mundialData';
import { fetchLiveMatches, calculateStandings, getBoliviaTimeData, TEAM_DICTIONARY } from './services/api';
import { supabase } from './services/supabase';

// Bloqueo oficial: Domingo 28 de Junio de 2026 a las 14:59:00 Hora de Bolivia (-04:00)
const IS_TOP4_LOCKED = new Date() >= new Date("2026-06-28T14:59:00-04:00");

const getTrueMatchTime = (match, btzTime) => {
  if (!match) return btzTime || '';
  // Compara convirtiendo a string para ignorar si la API manda int o string
  if (String(match.id) === "47") return "22:00";
  return btzTime || match.time || match.displayTime || "20:00";
};

// 1. Validador universal de partido activo
const isActuallyLive = (m) => {
  if (!m) return false;
  const str = String(m.time_elapsed || m.status || '').toLowerCase();
  return ['live', 'in_play', 'paused', '1h', '2h', 'ht', 'et', 'p', 'en_curso'].includes(str);
};

// 2. El Rey del Centro de Comando (Línea de sucesión anti-pantalla blanca)
const getCommandCenterKings = (matchesList) => {
  if (!matchesList || !Array.isArray(matchesList) || matchesList.length === 0) return [];

  // 1. DIARQUÍA VIVA: Todos los partidos jugándose AHORA que compartan hora de inicio
  const live = matchesList.filter(isActuallyLive);
  if (live.length > 0) {
    const latest = [...live].sort((a, b) => Number(b.id) - Number(a.id))[0];
    return live.filter(m => m.date === latest?.date);
  }

  // 2. DIARQUÍA REGENTE: Los últimos partidos terminados que se jugaron a la vez
  const finished = matchesList.filter(m => 
    m.status === 'FINALIZADO' || m.status === 'FINISHED' || String(m.finished).toUpperCase() === 'TRUE' || m.finished === true
  );
  if (finished.length > 0) {
    const latestFinished = [...finished].sort((a, b) => Number(b.id) - Number(a.id))[0];
    return finished.filter(m => m.date === latestFinished?.date);
  }

  // 3. Fallback Día 0
  const scheduled = matchesList.filter(m => m.status === 'PENDIENTE' || m.status === 'SCHEDULED');
  return scheduled.length > 0 ? [scheduled[0]] : [matchesList[0]];
};

const getNextCommandCenterMatches = (matchesList) => {
  if (!matchesList || !Array.isArray(matchesList)) return [];
  const scheduled = matchesList
    .filter(m => m.status === 'PENDIENTE' || m.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (scheduled.length === 0) return [];
  const targetDate = scheduled[0].date;
  return scheduled.filter(m => m.date === targetDate);
};

// 3. Captura de partidos solapados secundarios
const getSecondaryLiveMatches = (matchesList, kingId) => {
  if (!matchesList || !Array.isArray(matchesList)) return [];
  return matchesList.filter(m => isActuallyLive(m) && String(m.id) !== String(kingId));
};

const parseScorers = (scorersRaw) => {
  if (!scorersRaw || scorersRaw === "{}" || scorersRaw === "null") return [];
  if (Array.isArray(scorersRaw)) return scorersRaw;

  try {
    // Por si en el futuro la API cambia a JSON real
    const parsed = JSON.parse(scorersRaw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { }

  // Limpieza de string PostgreSQL: '{"Gol A", "Gol B"}' -> ["Gol A", "Gol B"]
  const cleaned = String(scorersRaw).replace(/^\{|\}$/g, '');
  const matches = [...cleaned.matchAll(/"([^"]+)"/g)];
  if (matches.length > 0) {
    return matches.map(m => m[1]);
  }

  return cleaned.split(',').map(s => s.trim()).filter(Boolean);
};

const flags = {};
Object.values(TEAM_DICTIONARY).forEach(info => {
  flags[info.es] = info.flag;
});

const TEAMS = Object.keys(flags).sort();

const getFlag = (teamName) => {
  if (!teamName || teamName === 'Por definir') return '🏳️';
  return flags[teamName] || '🏳️';
};

// Función para calcular puntos de predicción
function calculatePoints(realScore1, realScore2, predictedScore1, predictedScore2) {
  if (realScore1 === null || realScore2 === null || predictedScore1 === undefined || predictedScore2 === undefined || predictedScore1 === '' || predictedScore2 === '') {
    return null;
  }

  const rs1 = Number(realScore1);
  const rs2 = Number(realScore2);
  const ps1 = Number(predictedScore1);
  const ps2 = Number(predictedScore2);

  if (rs1 === ps1 && rs2 === ps2) {
    return { points: 3, label: '¡Marcador Exacto!', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', icon: '🎯' };
  }

  const realDiff = rs1 - rs2;
  const predDiff = ps1 - ps2;

  const sameWinner = (realDiff > 0 && predDiff > 0) || (realDiff < 0 && predDiff < 0) || (realDiff === 0 && predDiff === 0);

  if (sameWinner) {
    return { points: 1, label: '¡Acertaste Ganador!', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: '🏆' };
  }

  return { points: 0, label: '', color: 'text-slate-400 bg-slate-800 border-slate-700/50', icon: '' };
}

const isTop4Locked = () => {
  return Date.now() >= new Date('2026-06-25T00:00:00-04:00').getTime();
};

const isMatchLocked = (match) => {
  if (match.status !== 'PENDIENTE') return true;
  const matchTime = new Date(match.date).getTime();
  return Date.now() >= matchTime - 60000; // 1 minuto antes
};

const fetchMyExactSupabaseScore = async (username, finishedMatchesMap) => {
  if (!username || !finishedMatchesMap) return 0;
  try {
    const { data: myBets } = await supabase
      .from('predicciones_comunidad')
      .select('*')
      .eq('usuario', username);

    if (!myBets) return 0;

    let total = 0;
    myBets.forEach(bet => {
      const match = finishedMatchesMap[bet.partido_id];
      if (match) {
        const actualScore = `${match.score1} - ${match.score2}`;
        if (bet.prediccion === actualScore) total += 3;
        else {
          const betGoles = bet.prediccion.split(' - ').map(Number);
          const realGoles = [Number(match.score1), Number(match.score2)];
          const betDiff = betGoles[0] - betGoles[1];
          const realDiff = realGoles[0] - realGoles[1];
          if ((betDiff > 0 && realDiff > 0) || (betDiff < 0 && realDiff < 0) || (betDiff === 0 && realDiff === 0)) {
            total += 1;
          }
        }
      }
    });
    return total;
  } catch (e) {
    return 0;
  }
};

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTab, setCurrentTab] = useState('inicio');
  const [showHistory, setShowHistory] = useState(false);
  const [userPoints, setUserPoints] = useState(0);

  // Estado de Datos Reales de la API
  const [matches, setMatches] = useState([]);
  const [groupsData, setGroupsData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Estado para las predicciones
  const [predictions, setPredictions] = useState({ first: '', second: '', third: '', fourth: '' });
  const [matchPredictions, setMatchPredictions] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estado para la comunidad SQL
  const [communityVotes, setCommunityVotes] = useState([]);
  const [communityTop4, setCommunityTop4] = useState([]);
  const [communityLeaderboard, setCommunityLeaderboard] = useState([]);

  // Estado para flechas de navegación
  const [showArrows, setShowArrows] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  // Escuchar scroll para flechas flotantes
  useEffect(() => {
    let scrollTimeout;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      setCanScrollUp(scrollY > 0);
      setCanScrollDown(scrollY < maxScroll - 10);

      setShowArrows(true);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setShowArrows(false);
      }, 2000);
    };

    window.addEventListener('scroll', handleScroll);
    // Verificar estado inicial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  const hydrateUserData = async (username) => {
    try {
      console.log(`Buscando datos históricos para el usuario: ${username}`);

      // 1. Recuperar Partidos
      const { data: partidosData, error: partidosError } = await supabase
        .from('predicciones_comunidad')
        .select('*')
        .eq('usuario', username);

      let hydratedMatchPredictions = { ...offlineStorage.getMatchPredictions() };

      if (!partidosError && partidosData) {
        partidosData.forEach(fila => {
          if (fila.prediccion && fila.prediccion.includes(' - ')) {
            const [s1, s2] = fila.prediccion.split(' - ').map(s => s.trim());
            hydratedMatchPredictions[fila.partido_id] = { score1: s1, score2: s2 };
          }
        });
      }

      // 2. Recuperar Top 4
      const { data: top4Data, error: top4Error } = await supabase
        .from('top4_comunidad')
        .select('*')
        .eq('usuario', username)
        .maybeSingle();

      let hydratedTop4 = { ...offlineStorage.getPredictions() };

      if (!top4Error && top4Data) {
        hydratedTop4 = {
          first: top4Data.campeon || '',
          second: top4Data.subcampeon || '',
          third: top4Data.tercero || '',
          fourth: top4Data.cuarto || ''
        };
      }

      // 3. Actualizar Estado y LocalStorage
      setMatchPredictions(hydratedMatchPredictions);
      setPredictions(hydratedTop4);
      offlineStorage.saveMatchPredictions(hydratedMatchPredictions);
      offlineStorage.savePredictions(hydratedTop4);

      console.log("✅ Datos del usuario descargados y sincronizados:", {
        top4: hydratedTop4,
        partidos: hydratedMatchPredictions,
        EstructuraParaEstado: hydratedMatchPredictions
      });

    } catch (err) {
      console.error("❌ Error hidratando datos del usuario:", err);
    }
  };

  // Inicializar usuario y predicciones desde localStorage
  useEffect(() => {
    const existingUser = localStorage.getItem('mundial_user');
    if (existingUser) {
      try {
        const parsedUser = JSON.parse(existingUser);
        setUser(parsedUser);
        // Hidratar on mount si hay usuario guardado
        hydrateUserData(parsedUser.username || parsedUser.name);
      } catch (e) {
        console.error("Error leyendo usuario", e);
      }
    } else {
      const savedPredictions = offlineStorage.getPredictions();
      if (savedPredictions) setPredictions(savedPredictions);

      const savedMatchPredictions = offlineStorage.getMatchPredictions();
      if (savedMatchPredictions) setMatchPredictions(savedMatchPredictions);
    }

    setQueueLength(offlineStorage.getQueue().length);
  }, []);

  const calculateGlobalLeaderboard = async (allMatches) => {
    try {
      const { data: allBets, error } = await supabase.from('predicciones_comunidad').select('*');
      if (error || !allBets) return;

      const finishedMatches = allMatches.filter(m => m.status === 'FINALIZADO');
      const finishedMap = {};
      finishedMatches.forEach(m => {
        finishedMap[m.id] = { score1: m.score1, score2: m.score2 };
      });

      const userPoints = {};
      allBets.forEach(bet => {
        if (userPoints[bet.usuario] === undefined) {
          userPoints[bet.usuario] = 0;
        }
      });

      allBets.forEach(bet => {
        const matchData = finishedMap[bet.partido_id];
        if (matchData && bet.prediccion && bet.prediccion.includes(' - ')) {
          const [ps1, ps2] = bet.prediccion.split(' - ').map(s => s.trim());
          const pts = calculatePoints(matchData.score1, matchData.score2, ps1, ps2);
          if (pts && pts.points) {
            userPoints[bet.usuario] += pts.points;
          }
        }
      });

      const leaderboard = Object.keys(userPoints).map(user => ({
        usuario: user,
        puntos: userPoints[user]
      })).sort((a, b) => b.puntos - a.puntos);

      setCommunityLeaderboard(leaderboard);
    } catch (err) {
      console.error("Error calculando leaderboard:", err);
    }
  };

  // Cargar datos de la API y auto-sincronizar cada 2 minutos
  useEffect(() => {
    const initApp = async () => {
      try {
        const matchesRes = await fetchLiveMatches();
        setMatches(matchesRes);

        // Calcular las tablas dinámicamente a partir de los resultados reales
        const calculatedGroups = calculateStandings(matchesRes);
        setGroupsData(calculatedGroups);

        // Fetch de la tabla top 4 de la comunidad
        const top4Res = await supabase.from('top4_comunidad').select('*');
        if (!top4Res.error && top4Res.data) {
          setCommunityTop4(top4Res.data);
        }

        // Calcular Leaderboard global
        await calculateGlobalLeaderboard(matchesRes);

        const mapaPartidosFinalizados = {};
        matchesRes.filter(m => m.status === 'FINALIZADO').forEach(m => {
          mapaPartidosFinalizados[m.id] = m;
        });
        fetchMyExactSupabaseScore(user?.username || user?.name, mapaPartidosFinalizados).then(score => setUserPoints(score));
      } catch (error) {
        console.error("Error al cargar la aplicación", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    // Carga inicial
    initApp();

    // Sincronización automática de goles y estado de partidos en tiempo real (cada 2 minutos)
    const intervalId = setInterval(() => {
      initApp();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Escuchar eventos de red
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Procesar cola de sincronización cuando vuelve el internet
  useEffect(() => {
    const processSyncQueue = async () => {
      const queue = offlineStorage.getQueue();
      if (isOnline && queue.length > 0 && !isSyncing) {
        setIsSyncing(true);
        setTimeout(() => {
          offlineStorage.clearQueue();
          setQueueLength(0);
          setIsSyncing(false);
        }, 2000);
      }
    };

    processSyncQueue();
  }, [isOnline, isSyncing]);

  // Fetch y Suscripción en Tiempo Real de predicciones de la comunidad
  useEffect(() => {
    const featuredMatchesList = getCommandCenterKings(matches);
    const kingIds = featuredMatchesList.map(m => String(m.id));
    const secondaryLiveList = matches.filter(m => isActuallyLive(m) && !kingIds.includes(String(m.id)));
    const activeMatches = [...featuredMatchesList, ...secondaryLiveList].filter(Boolean);
    const matchIds = activeMatches.map(m => String(m.id));

    if (matchIds.length === 0) return;

    const fetchVotes = async () => {
      try {
        const { data, error } = await supabase
          .from('predicciones_comunidad')
          .select('*')
          .in('partido_id', matchIds);

        if (error) throw error;
        setCommunityVotes(data || []);
      } catch (e) {
        console.error("Error al obtener votos de la comunidad desde Supabase", e);
      }
    };

    // Carga inicial
    fetchVotes();

    // Suscripción global a cambios en tiempo real en la tabla
    const channel = supabase
      .channel(`realtime:predicciones_activas`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predicciones_comunidad'
        },
        (payload) => {
          // Refrescamos los votos si afectan a nuestros partidos activos
          if (matchIds.includes(String(payload.new?.partido_id || payload.old?.partido_id))) {
            fetchVotes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matches]);

  const handleLogout = () => {
    // 1. Exterminio de LocalStorage
    localStorage.removeItem('user_predictions');
    localStorage.removeItem('user_top4');
    localStorage.removeItem('mundial_user');

    // 2. Exterminio de la memoria RAM de React
    if (typeof setMatchPredictions === 'function') setMatchPredictions({});
    if (typeof setPredictions === 'function') setPredictions({ first: '', second: '', third: '', fourth: '' });
    if (typeof setUserPredictions === 'function') setUserPredictions({});
    if (typeof setUserTop4 === 'function') setUserTop4({});

    setUser(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    try {
      const loggedUser = offlineStorage.loginUser(username);
      setUser(loggedUser);
      // Ejecutar hidratación al loguear
      await hydrateUserData(loggedUser.username || loggedUser.name);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTabChange = (newTab) => {
    if (newTab === currentTab) return;

    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm("Tienes predicciones sin guardar. ¿Seguro que quieres salir de esta pestaña? Se perderán los cambios visuales no guardados.");
      if (!confirmLeave) return;

      const savedPredictions = offlineStorage.getPredictions();
      if (savedPredictions) setPredictions(savedPredictions);

      const savedMatchPredictions = offlineStorage.getMatchPredictions();
      if (savedMatchPredictions) setMatchPredictions(savedMatchPredictions);
      else setMatchPredictions({});

      setHasUnsavedChanges(false);
    }

    setCurrentTab(newTab);
  };

  const handleSavePredictions = async () => {
    console.log("1. --- BOTÓN GUARDAR PRESIONADO ---");
    offlineStorage.savePredictions(predictions);
    offlineStorage.saveMatchPredictions(matchPredictions);

    // Guardar en Supabase si hay internet
    if (isOnline && user && (user.username || user.name)) {
      const username = user.username || user.name;

      // BLOQUE A: Guardar Partidos
      const prediccionesAGuardar = [];
      for (const matchId in matchPredictions) {
        const pred = matchPredictions[matchId];
        if (pred.score1 !== undefined && pred.score2 !== undefined && pred.score1 !== '' && pred.score2 !== '') {
          prediccionesAGuardar.push({
            partidoId: matchId,
            marcador: `${pred.score1} - ${pred.score2}`
          });
        }
      }

      if (prediccionesAGuardar.length > 0) {
        console.log("2. Preparando envío a Supabase para las predicciones:", prediccionesAGuardar);
        try {
          await Promise.all(prediccionesAGuardar.map(async (pred) => {
            const payload = { usuario: username, partido_id: pred.partidoId, prediccion: pred.marcador };
            console.log("3. Intentando upsert con:", payload);

            const { data, error } = await supabase
              .from('predicciones_comunidad')
              .upsert(payload, { onConflict: 'usuario, partido_id' })
              .select();

            if (error) console.error("❌ Error en Supabase para el partido", pred.partidoId, ":", error);
            else console.log("Guardado en Supabase:", data);
          }));
          console.log("4. --- FIN DEL GUARDADO DE PARTIDOS ---");
        } catch (err) {
          console.error("❌ Error catastrófico en el bucle de partidos:", err);
        }
      } else {
        console.log("2. No hay predicciones de partidos válidas para enviar a Supabase.");
      }

      // BLOQUE B: Guardar Top 4 (SIEMPRE)
      console.log("5. --- INICIANDO GUARDADO DE TOP 4 ---");
      try {
        const payloadTop4 = {
          usuario: username,
          campeon: predictions.first || '',
          subcampeon: predictions.second || '',
          tercero: predictions.third || '',
          cuarto: predictions.fourth || ''
        };
        console.log("6. Payload del Top 4 a enviar:", payloadTop4);

        const { data: top4Data, error: top4Error } = await supabase
          .from('top4_comunidad')
          .upsert(payloadTop4, { onConflict: 'usuario' })
          .select();

        if (top4Error) {
          console.error("❌ Error en Supabase guardando Top 4:", top4Error.message, top4Error.details);
        } else {
          console.log("✅ Top 4 guardado exitosamente en la nube:", top4Data);
          const mapaPartidosFinalizados = {};
          matches.filter(m => m.status === 'FINALIZADO').forEach(m => {
            mapaPartidosFinalizados[m.id] = m;
          });
          fetchMyExactSupabaseScore(user?.username || user?.name, mapaPartidosFinalizados).then(score => setUserPoints(score));
        }
      } catch (err) {
        console.error("❌ Error catastrófico ejecutando Top 4:", err);
      }

    } else {
      console.log("2. No se envía a Supabase: isOnline=", isOnline, " user=", !!user);
    }

    if (!isOnline) {
      offlineStorage.enqueueSync('UPDATE_PREDICTIONS', { top4: predictions, matches: matchPredictions });
      setQueueLength(offlineStorage.getQueue().length);
    }

    setHasUnsavedChanges(false);

    const btn = document.getElementById('btn-save');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '¡Guardado!';
      btn.classList.add('bg-green-500');
      btn.classList.remove('bg-emerald-500');
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('bg-green-500');
        btn.classList.add('bg-emerald-500');
      }, 2000);
    } else {
      alert("¡Tus predicciones han sido guardadas localmente!");
    }
  };

  const renderHeader = () => {
    return (
      <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700 shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Trophy className="text-emerald-400 w-6 h-6" />
          <h1 className="text-xl font-bold tracking-wide">Mundialero</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-emerald-900/40 border border-emerald-500/30 px-3 py-1.5 rounded-full shadow-inner">
                <span className="text-sm font-bold text-emerald-400 whitespace-nowrap">
                  Puntos: {communityLeaderboard?.find(u => 
                    String(u.usuario || '').toLowerCase() === String(user?.username || user?.name || '').toLowerCase()
                  )?.puntos ?? 0}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm bg-slate-700 px-3 py-1.5 rounded-full text-slate-200 border border-slate-600">
                <User className="w-4 h-4" />
                <span className="font-semibold">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 bg-slate-700 rounded-full text-slate-300 hover:text-red-400 hover:bg-slate-600 border border-slate-600 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          {!user && (
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm font-bold text-emerald-400 hover:text-emerald-300"
            >
              Ingresar
            </button>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isOnline
            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
            : 'bg-red-900/40 text-red-400 border border-red-800/50'
            }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>
    );
  };

  const handleDownloadClick = async () => {
    if (deferredPrompt) {
      // Plan A: El navegador soporta instalación nativa directa
      deferredPrompt.prompt();
    } else {
      // Plan B: El navegador bloqueó el prompt (Brave Linux, iPhone Safari, etc.)
      // Desplegamos nuestro Modal de instrucciones a prueba de fallos
      setShowHelpModal(true);
    }
  };

  const renderLandingPage = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in duration-500 mt-4 md:mt-12">
      <div className="max-w-3xl w-full bg-slate-800/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center text-center">

        <Trophy className="w-20 h-20 text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
          Mundialito <span className="text-emerald-400">2026</span>
        </h2>
        <p className="text-xl text-slate-300 mb-8 font-medium">
          Intenta adivinar los resultados del mundial. Compara tus predicciones con otras personas
        </p>

        <button
          onClick={handleDownloadClick}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black text-2xl md:text-3xl py-6 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 transition-transform hover:-translate-y-1 mb-6"
        >
          ⬇️ Descargar / Instalar Mundialito
        </button>

        <button
          onClick={() => setShowLogin(true)}
          className="w-full md:w-auto bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-lg py-3 px-12 rounded-xl transition-colors border border-slate-600"
        >
          Ya la tengo, iniciar sesión
        </button>
      </div>

      {showHelpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
          <div className="bg-slate-800 p-6 md:p-8 rounded-3xl max-w-md w-full border border-slate-600 shadow-2xl relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-full p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="text-2xl font-black text-emerald-400 mb-2 pr-8">Instalación Manual Rápida</h3>
            <p className="text-slate-300 mb-6 text-sm">Tu navegador requiere un paso extra para instalar la App:</p>

            <div className="space-y-4 mb-8">
              <div className="flex gap-3 items-start bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <span className="text-2xl mt-1">🍎</span>
                <div>
                  <p className="font-bold text-slate-200 text-sm mb-1">En iPhone / iPad</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Toca el botón de Compartir (el cuadrado con la flecha hacia arriba) y selecciona <strong className="text-slate-300">"Agregar a la pantalla de inicio"</strong>.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <span className="text-2xl mt-1">🤖</span>
                <div>
                  <p className="font-bold text-slate-200 text-sm mb-1">En Android (Chrome)</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Toca los 3 puntos de la esquina superior derecha y selecciona <strong className="text-slate-300">"Instalar aplicación"</strong>.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <span className="text-2xl mt-1">💻</span>
                <div>
                  <p className="font-bold text-slate-200 text-sm mb-1">En PC / Mac (Brave/Edge/Chrome)</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Mira a la derecha de tu barra de direcciones (donde escribes las URLs) y haz clic en el icono de <strong className="text-slate-300">"Instalar"</strong> o el símbolo de <strong className="text-slate-300">+</strong>.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors border border-slate-600"
            >
              Entendido, cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderLogin = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <Trophy className="w-12 h-12 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Bienvenido a Mundialero</h2>
        <p className="text-slate-400 text-center mb-8">Ingresa tu nombre para guardar tus predicciones.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-400 mb-1">Tu Nombre</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              autoComplete="off"
              placeholder="Ej. Juan Pérez"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-600 transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 transform active:scale-95"
          >
            Ingresar a la App <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );

  const renderInicio = () => {
    const featuredMatchesList = getCommandCenterKings(matches);
    const kingIds = featuredMatchesList.map(m => String(m.id));
    const secondaryLiveList = matches.filter(m => isActuallyLive(m) && !kingIds.includes(String(m.id)));

    const finalizados = matches.filter(m => m.status === 'FINALIZADO' || m.status === 'FINISHED').sort((a, b) => new Date(b.date) - new Date(a.date));

    const now = new Date();
    const pendientes = matches
      .filter(m => m.status === 'PENDIENTE' && new Date(m.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextMatchesList = getNextCommandCenterMatches(matches);

    const userTop4 = Object.entries(predictions).filter(([k, v]) => v !== '');

    return (
      <div className="p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto px-2 sm:px-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* COLUMNA IZQUIERDA: La Acción */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">

            {/* Scoreboard Gigante */}
            <div className="flex flex-col gap-4 w-full">
              {featuredMatchesList.map((featuredMatch) => {
                const sortedLiveMatches = [featuredMatch, ...secondaryLiveList].filter(Boolean);
                return (
                  <div key={featuredMatch.id} className="bg-slate-800 border border-slate-700 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
                <div className="flex justify-between items-center mb-8">
                  <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">
                    {featuredMatch.stage} {featuredMatch.group ? `- ${featuredMatch.group}` : ''}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="font-mono text-[10px] bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50">
                      #{featuredMatch.id}
                    </span>
                    {featuredMatch?.status === 'EN_CURSO' ? (
                      <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded font-bold animate-pulse">EN VIVO</span>
                    ) : featuredMatch?.status === 'FINALIZADO' ? (
                      <span className="bg-slate-700/50 text-slate-300 border border-slate-600/50 px-2.5 py-0.5 rounded font-semibold">FINALIZADO</span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded font-bold">⏰ PRÓXIMO • {featuredMatch?.time || '13:00'}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6 w-full mt-4 mb-2 py-2 px-1 md:px-8">
                  <div className="flex items-center justify-end gap-2 sm:gap-4 text-right min-w-0">
                    <span className="font-bold text-lg md:text-2xl leading-tight whitespace-normal break-words">{featuredMatch.team1}</span>
                    <span className="shrink-0 flex items-center justify-center w-12 sm:w-20 h-10 sm:h-16 text-5xl md:text-6xl overflow-visible">
                      {typeof getFlag(featuredMatch.team1) === 'string' && getFlag(featuredMatch.team1).startsWith('http') ? <img src={getFlag(featuredMatch.team1)} alt={featuredMatch.team1} className="w-full h-full object-contain drop-shadow-sm" /> : getFlag(featuredMatch.team1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-4 font-black text-6xl text-slate-100 my-1">
                    {featuredMatch?.status === 'PENDIENTE' ? (
                      <span className="text-6xl text-slate-400 font-extrabold tracking-normal py-1">VS</span>
                    ) : (
                      <>
                        <span>{featuredMatch?.score1 ?? 0}</span>
                        <span className="text-slate-600 font-light">:</span>
                        <span>{featuredMatch?.score2 ?? 0}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-start gap-2 sm:gap-4 text-left min-w-0">
                    <span className="shrink-0 flex items-center justify-center w-12 sm:w-20 h-10 sm:h-16 text-5xl md:text-6xl overflow-visible">
                      {typeof getFlag(featuredMatch.team2) === 'string' && getFlag(featuredMatch.team2).startsWith('http') ? <img src={getFlag(featuredMatch.team2)} alt={featuredMatch.team2} className="w-full h-full object-contain drop-shadow-sm" /> : getFlag(featuredMatch.team2)}
                    </span>
                    <span className="font-bold text-lg md:text-2xl leading-tight whitespace-normal break-words">{featuredMatch.team2}</span>
                  </div>
                </div>

                {(featuredMatch?.status === 'EN_CURSO' || featuredMatch?.status === 'FINALIZADO') && (parseScorers(featuredMatch.home_scorers).length > 0 || parseScorers(featuredMatch.away_scorers).length > 0) && (
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-1 sm:gap-3 px-2 sm:px-4 pb-3 pt-1 text-[11px] sm:text-xs text-slate-300 border-t border-slate-800/80 mt-1">
                    {/* Goleadores Local (Izquierda) */}
                    <div className="flex flex-col items-end text-right">
                      {parseScorers(featuredMatch.home_scorers).map((scorer, i) => (
                        <span key={i} className="tracking-tight">{scorer} ⚽</span>
                      ))}
                    </div>

                    {/* Espaciador central del ancho exacto del marcador */}
                    <div className="w-12 sm:w-20 shrink-0"></div>

                    {/* Goleadores Visitante (Derecha) */}
                    <div className="flex flex-col items-start text-left">
                      {parseScorers(featuredMatch.away_scorers).map((scorer, i) => (
                        <span key={i} className="tracking-tight">⚽ {scorer}</span>
                      ))}
                    </div>
                  </div>
                )}

                {sortedLiveMatches.length > 1 && (
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Otros partidos en vivo / Retrasados</span>
                    {sortedLiveMatches.slice(1).map((extraMatch) => (
                      <div key={extraMatch.id} className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-2.5 flex flex-col gap-1.5">
                        {/* Cabecera compacta */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/40 pb-1">
                          <span className="font-medium">{extraMatch.stage}</span>
                          <span className="text-rose-400 font-bold animate-pulse bg-rose-500/10 px-1 rounded text-[9px]">● EN SEGUNDO PLANO</span>
                        </div>
                        {/* Fila del partido clonando el diseño limpio 1fr_auto_1fr de MatchCard */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full text-xs">
                          <div className="flex items-center justify-end gap-1.5 text-right overflow-hidden">
                            <span className="font-bold text-slate-200 truncate">{formatBracketTeam(extraMatch.team1)}</span>
                            <span className="shrink-0 flex items-center justify-center text-lg">{typeof getFlag(extraMatch.team1) === 'string' && getFlag(extraMatch.team1).startsWith('http') ? <img src={getFlag(extraMatch.team1)} alt={extraMatch.team1} className="w-4 h-4 object-contain drop-shadow-sm" /> : getFlag(extraMatch.team1)}</span>
                          </div>
                          <div className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-black text-xs text-slate-300 min-w-[40px] text-center">
                            {extraMatch.score1 ?? 0} : {extraMatch.score2 ?? 0}
                          </div>
                          <div className="flex items-center justify-start gap-1.5 text-left overflow-hidden">
                            <span className="shrink-0 flex items-center justify-center text-lg">{typeof getFlag(extraMatch.team2) === 'string' && getFlag(extraMatch.team2).startsWith('http') ? <img src={getFlag(extraMatch.team2)} alt={extraMatch.team2} className="w-4 h-4 object-contain drop-shadow-sm" /> : getFlag(extraMatch.team2)}</span>
                            <span className="font-bold text-slate-200 truncate">{formatBracketTeam(extraMatch.team2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

            {/* Próximo Partido */}
            {nextMatchesList.length > 0 && (
              <div className="flex flex-col gap-2.5 w-full my-2">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase ml-1">⏰ Próximos Encuentros Simultáneos</span>
                {nextMatchesList.map((nextMatch) => (
                  <div key={nextMatch.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between shadow-md gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Próximo Partido
                        <span className="font-mono text-[10px] bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 ml-auto">
                          #{nextMatch.id}
                        </span>
                      </span>
                      <div className="flex items-center gap-3 text-lg md:text-xl font-bold">
                        <span className="text-2xl">{getFlag(nextMatch.team1)}</span> {nextMatch.team1}
                        <span className="text-slate-500 font-normal mx-1">vs</span>
                        {nextMatch.team2} <span className="text-2xl">{getFlag(nextMatch.team2)}</span>
                      </div>
                    </div>
                    <div className="flex md:flex-col items-center md:items-end w-full md:w-auto justify-between md:justify-center border-t md:border-t-0 border-slate-700 pt-3 md:pt-0">
                      <span className="text-sm font-medium text-slate-300 capitalize">{getBoliviaTimeData(nextMatch.date).date}</span>
                      <span className="text-2xl font-black font-mono text-emerald-400">{getBoliviaTimeData(nextMatch.date).time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top 4 del Usuario (Read-Only) */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 shadow-md">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100 border-b border-slate-700 pb-3">
                <Medal className="w-5 h-5 text-emerald-400" /> Mi Top 4 del Torneo
              </h3>
              {userTop4.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'first', label: '1º', team: predictions.first, color: 'text-yellow-400' },
                    { id: 'second', label: '2º', team: predictions.second, color: 'text-slate-300' },
                    { id: 'third', label: '3º', team: predictions.third, color: 'text-amber-600' },
                    { id: 'fourth', label: '4º', team: predictions.fourth, color: 'text-slate-400' }
                  ].map(pos => pos.team && (
                    <div key={pos.id} className="flex items-center gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                      <span className={`text-sm font-black ${pos.color}`}>{pos.label}</span>
                      <span className="text-2xl drop-shadow-sm">{getFlag(pos.team)}</span>
                      <span className="text-xs font-bold text-slate-200 truncate">{pos.team}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-700 border-dashed text-sm text-slate-400">
                  Aún no has elegido tu Top 4. ¡Ve a la pestaña de Predicciones!
                </div>
              )}
            </div>

          </div>

          {/* COLUMNA DERECHA: La Comunidad */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">

            {/* 1. Tabla de Posiciones Global (Leaderboard) */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-lg">
              <h3 className="text-xl font-black mb-4 flex items-center gap-2 border-b border-slate-700 pb-3 text-slate-100">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Tabla de Posiciones Global
              </h3>
              {communityLeaderboard.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {communityLeaderboard.map((item, idx) => {
                    const isMe = user && (user.username === item.usuario || user.name === item.usuario);
                    let positionBadge;
                    if (idx === 0) positionBadge = "🥇";
                    else if (idx === 1) positionBadge = "🥈";
                    else if (idx === 2) positionBadge = "🥉";
                    else positionBadge = <span className="text-slate-500 font-bold">{idx + 1}º</span>;

                    return (
                      <div key={item.usuario} className={`flex items-center justify-between p-3 rounded-xl border ${isMe ? 'bg-emerald-950/60 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-900/50 border-slate-700/50 transition-colors hover:border-slate-600'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-center text-lg">{positionBadge}</div>
                          <span className={`font-bold ${isMe ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {item.usuario}
                            {isMe && <span className="ml-2 text-[10px] uppercase font-black tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Tú</span>}
                          </span>
                        </div>
                        <div className="bg-emerald-900/40 border border-emerald-500/30 px-3 py-1 rounded-full shadow-inner">
                          <span className="font-black text-emerald-400">{item.puntos} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-900/50 rounded-2xl border border-slate-700 border-dashed">
                  <p className="text-slate-400">Aún no hay puntos en la comunidad.</p>
                </div>
              )}
            </div>

            {/* 2. Predicciones de la Comunidad (Espejo Simultáneo) */}
            <div className="flex flex-col gap-4">
              {featuredMatchesList.map((activeMatch) => {
                const matchVotes = communityVotes.filter(v => String(v.partido_id) === String(activeMatch.id));
                const isMatchLive = isActuallyLive(activeMatch);

                return (
                  <div key={activeMatch.id} className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-md">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-3 text-slate-100">
                      <Users className="w-5 h-5 text-emerald-400" />
                      Predicciones de la Comunidad
                      <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-900 px-3 py-1 rounded-full hidden sm:block">
                        {isMatchLive ? 'En vivo' : 'Reciente'}
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-4 bg-slate-900/50 p-2 rounded-lg justify-center border border-slate-700/50">
                      <span>{getFlag(activeMatch.team1)}</span> {activeMatch.team1}
                      <span className="text-slate-500 mx-2">vs</span>
                      {activeMatch.team2} <span>{getFlag(activeMatch.team2)}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {matchVotes.length > 0 ? (
                        matchVotes.map((pred, idx) => (
                          <div key={idx} className="bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl flex justify-between items-center hover:bg-slate-700/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-900/40 flex items-center justify-center border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                                {pred.usuario.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-sm text-slate-200">{pred.usuario}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {pred.prediccion && pred.prediccion.includes(' - ') ? (
                                <>
                                  <div className="w-8 h-8 flex items-center justify-center font-mono font-black text-sm bg-slate-900 rounded-lg border border-slate-700 text-emerald-400 shadow-inner">
                                    {pred.prediccion.split(' - ')[0].trim()}
                                  </div>
                                  <span className="text-slate-500 font-bold">-</span>
                                  <div className="w-8 h-8 flex items-center justify-center font-mono font-black text-sm bg-slate-900 rounded-lg border border-slate-700 text-emerald-400 shadow-inner">
                                    {pred.prediccion.split(' - ')[1].trim()}
                                  </div>
                                </>
                              ) : (
                                <div className="font-mono font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-emerald-400 shadow-inner">
                                  {pred.prediccion}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-slate-400">
                          Aún no hay predicciones para este partido. ¡Sé el primero en predecir!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Top 4 de la Comunidad */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-lg">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-3 text-slate-100">
                <Medal className="w-5 h-5 text-emerald-400" />
                Top 4 de la Comunidad
              </h3>
              {communityTop4.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {communityTop4.map((top4Row, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-700 p-4 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-900/40 flex items-center justify-center border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                          {top4Row.usuario.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-200">{top4Row.usuario}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { l: '1º', team: top4Row.campeon, c: 'text-yellow-400' },
                          { l: '2º', team: top4Row.subcampeon, c: 'text-slate-300' },
                          { l: '3º', team: top4Row.tercero, c: 'text-amber-600' },
                          { l: '4º', team: top4Row.cuarto, c: 'text-slate-500' }
                        ].map(({ l, team, c }) => (
                          team ? (
                            <div key={l} className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-lg border border-slate-700/50">
                              <span className={`text-xs font-black ${c}`}>{l}</span>
                              <span className="text-xl">{getFlag(team)}</span>
                              <span className="text-xs font-bold text-slate-200 truncate" title={team}>{team}</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-900/50 rounded-2xl border border-slate-700 border-dashed">
                  <p className="text-slate-400">Aún no hay predicciones del Top 4 en la comunidad.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  };

  const formatBracketTeam = (name) => {
    if (!name) return '';
    // Detecta "Winner Group A" o "1st Group A" -> convierte a "1A"
    const winnerMatch = name.match(/(?:Winner|1st).*?Group\s+([A-L])/i);
    if (winnerMatch) return `1${winnerMatch[1].toUpperCase()}`;

    // Detecta "Runner-up Group B" o "2nd Group B" -> convierte a "2B"
    const runnerMatch = name.match(/(?:Runner-up|2nd).*?Group\s+([A-L])/i);
    if (runnerMatch) return `2${runnerMatch[1].toUpperCase()}`;

    // Detecta terceros lugares (ej. "3rd Group A/B/C")
    const thirdMatch = name.match(/(?:Third|3rd).*?Group\s+([A-L\/\s]+)/i);
    if (thirdMatch) return `3 ${thirdMatch[1].trim().toUpperCase()}`;

    return name;
  };

  const renderHorario = () => {
    const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    const faseGrupos = sortedMatches.filter(m =>
      m.status === 'PENDIENTE' &&
      new Date(m.date) > now &&
      m.matchType === 'group'
    );
    const dieciseisavos = sortedMatches.filter(m =>
      m.status === 'PENDIENTE' &&
      new Date(m.date) > now &&
      m.matchType !== 'group'
    );
    const finalizados = sortedMatches.filter(m => m.status === 'FINALIZADO');

    const MatchCard = ({ match }) => {
      const btz = getBoliviaTimeData(match.date);
      const isLiveOrFinished = match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'FINISHED';

      return (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-2.5 sm:p-3 flex flex-col gap-2 w-full shadow-sm hover:border-slate-600/50 transition-all">

          {/* PISO 1: BARRA DE CABECERA (Ancho completo con borde inferior) */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 text-xs text-slate-400">

            {/* Izquierda: Fecha, Fase y Grupo */}
            <div className="flex items-center gap-1.5 sm:gap-2 font-medium flex-wrap">
              <span className="capitalize text-slate-300">{btz.date}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{match.stage}</span>
              {match.group && (
                <span className="text-slate-400 font-bold">({match.group})</span>
              )}
            </div>

            {/* Derecha: Hora de Kickoff (en verde) e ID */}
            <div className="flex items-center gap-2 ml-auto shrink-0 font-mono">
              {!isLiveOrFinished && (
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Hora: {getTrueMatchTime(match, btz.time) || '20:00'}
                </span>
              )}
              <span className="text-[10px] bg-slate-900/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/40">
                #{match.id}
              </span>
            </div>

          </div>

          {/* PISO 2: LA FILA DEL PARTIDO (Mantiene tu código exacto) */}
          <div className="flex items-center justify-between gap-4 py-2 w-full text-xs sm:text-sm">
            <div className="flex items-center justify-end gap-2 flex-1">
              <span className="font-bold text-sm md:text-base">{formatBracketTeam(match.team1)}</span>
              <span className="text-2xl">{getFlag(match.team1)}</span>
            </div>

            <div className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-slate-900/90 border border-slate-800/80 rounded font-black text-xs sm:text-sm text-slate-200 tracking-tighter shrink-0 flex items-center justify-center whitespace-nowrap shadow-inner">
              {isLiveOrFinished ? `${match.score1 ?? 0} : ${match.score2 ?? 0}` : 'VS'}
            </div>

            <div className="flex items-center justify-start gap-2 flex-1">
              <span className="text-2xl">{getFlag(match.team2)}</span>
              <span className="font-bold text-sm md:text-base">{formatBracketTeam(match.team2)}</span>
            </div>
          </div>

        </div>
      );
    };

    return (
      <div className="p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto px-2 sm:px-6 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* Histórico Expansible */}
        {finalizados.length > 0 && (
          <section className="bg-slate-800/60 p-4 md:p-6 rounded-3xl border border-slate-700">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-lg md:text-xl font-black uppercase tracking-widest text-slate-200 focus:outline-none transition-colors hover:text-emerald-400"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-slate-500 rounded-full"></div>
                Histórico de Partidos
              </div>
              <div className="bg-slate-700 p-1.5 rounded-full">
                {showHistory ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
              </div>
            </button>

            {showHistory && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 animate-in slide-in-from-top-2 duration-200 items-start">
                {finalizados.map(m => {
                  const uPred = matchPredictions[m.id];
                  const uPredStr = uPred && uPred.score1 !== undefined && uPred.score2 !== undefined && uPred.score1 !== '' && uPred.score2 !== '' ? `${uPred.score1} - ${uPred.score2}` : 'Sin predicción';
                  const ptsResult = uPredStr !== 'Sin predicción' ? calculatePoints(m.score1, m.score2, uPred.score1, uPred.score2) : null;
                  const btz = getBoliviaTimeData(m.date);

                  return (
                    <div key={m.id} className="bg-slate-800 border border-slate-600 p-4 rounded-xl flex flex-col gap-3 shadow-md">
                      <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                        <div className="flex gap-2 items-center">
                          <span className="font-semibold text-slate-400">{btz.date}</span>
                          <span className="font-bold text-slate-500">{m.stage}</span>
                        </div>
                        <span className="font-mono text-[10px] bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 ml-auto">
                          #{m.id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 py-2">
                        <div className="flex items-center justify-end gap-2 flex-1">
                          <span className="font-bold text-sm md:text-base">{m.team1}</span>
                          <span className="text-2xl">{getFlag(m.team1)}</span>
                        </div>

                        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-600 font-mono font-black text-xl min-w-[5rem] text-center shadow-inner">
                          {m.score1} : {m.score2}
                        </div>

                        <div className="flex items-center justify-start gap-2 flex-1">
                          <span className="text-2xl">{getFlag(m.team2)}</span>
                          <span className="font-bold text-sm md:text-base">{m.team2}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mt-2">
                        <div className="flex-1 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-slate-400 block mb-1 text-xs uppercase font-bold tracking-wider">Tu predicción</span>
                            <div className="flex items-center gap-3">
                              <span className={`font-mono font-bold text-lg ${uPredStr !== 'Sin predicción' ? 'text-emerald-400' : 'text-slate-500'}`}>{uPredStr}</span>
                            </div>
                          </div>

                          {ptsResult && (
                            <div className={`px-3 py-1.5 rounded-full border text-sm font-bold flex items-center gap-2 ${ptsResult.color}`}>
                              <span className="font-mono">{ptsResult.points > 0 ? `+${ptsResult.points}` : '0'} pts</span>
                              {ptsResult.label && <span className="flex items-center gap-1">{ptsResult.icon} {ptsResult.label}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Fase de Grupos */}
        <section className="bg-slate-800/30 p-4 md:p-6 rounded-3xl border border-slate-800">
          <h2 className="text-2xl font-black mb-6 uppercase tracking-widest text-slate-100 flex items-center gap-3">
            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
            Fase de Grupos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            {faseGrupos.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>

        {/* Torneo */}
        <section className="bg-slate-800/30 p-4 md:p-6 rounded-3xl border border-slate-800">
          <h2 className="text-3xl font-black mb-2 uppercase tracking-widest text-slate-100 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Torneo
          </h2>
          <h3 className="text-lg font-bold text-emerald-400 mb-6 uppercase tracking-wide ml-11">
            Fase Final
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            {dieciseisavos.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>

      </div>
    );
  };

  const renderPuntuaciones = () => (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-6 py-4">
      <h2 className="text-3xl font-black mb-2 uppercase tracking-wide text-slate-100 flex items-center gap-3 border-b border-slate-700 pb-4">
        <ListOrdered className="w-8 h-8 text-emerald-400" />
        Tablas de Posiciones
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {groupsData.map((group) => (
          <div key={group.group} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg p-2 sm:p-3">
            <div className="bg-slate-900/80 px-5 py-4 border-b border-slate-700 font-black text-slate-200 tracking-wider">
              {group.group}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
                <thead className="bg-slate-800 text-slate-400 text-xs">
                  <tr>
                    <th className="text-left pl-2 text-slate-400 font-normal">Equipo</th>
                    <th className="w-12 text-center text-slate-400 font-normal">PJ</th>
                    <th className="w-12 text-center text-slate-400 font-normal">DG</th>
                    <th className="w-12 text-center font-bold text-emerald-400 pr-1">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {group.teams.sort((a, b) => b.pts - a.pts).map((team, idx) => (
                    <tr key={team.name} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 flex items-center gap-3">
                        <span className={`font-mono text-xs w-4 font-bold ${idx < 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {idx + 1}
                        </span>
                        {team.flag && team.flag.startsWith('http') ? (
                          <img src={team.flag} alt={`Bandera de ${team.name}`} className="w-8 h-8 object-contain drop-shadow-sm" />
                        ) : (
                          <span className="text-2xl drop-shadow-sm">{team.flag}</span>
                        )}
                        <span className="block font-bold text-slate-100 whitespace-nowrap">{team.name}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-400">{team.pj}</td>
                      <td className="px-3 py-3 text-center text-slate-400 font-mono">
                        {team.dg > 0 ? `+${team.dg}` : team.dg}
                      </td>
                      <td className="px-5 py-3 text-center font-black text-lg text-emerald-400">{team.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* TABLA DE MEJORES TERCEROS */}
      {groupsData?.bestThirds && groupsData.bestThirds.length > 0 && (
        <div className="mt-8 bg-slate-900/60 border border-amber-500/30 rounded-xl p-3 sm:p-4 shadow-lg w-full mb-8">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <h3 className="font-black tracking-wider text-amber-400 text-xs sm:text-sm uppercase">Tabla de Mejores Terceros</h3>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-mono">Clasifican Top 8</span>
          </div>

          <div className="flex flex-col gap-1 w-full text-xs">
            {groupsData.bestThirds.map((team, idx) => {
              const isQualifying = idx < 8; // Los 8 primeros van a Dieciseisavos
              return (
                <div key={team.name} className={`flex items-center justify-between p-2 rounded ${isQualifying ? 'bg-amber-500/10 border-l-2 border-amber-400 text-slate-100 font-bold' : 'bg-slate-800/30 opacity-50 text-slate-400'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] w-4">{idx + 1}º</span>
                    <span className="truncate">{team.name}</span>
                    <span className="text-[9px] bg-slate-800 px-1 rounded text-amber-400/80">({team.grupoOrigen})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono shrink-0">
                    <span>{team.pts} pts</span>
                    <span className="text-[10px] text-slate-400">{team.dg > 0 ? `+${team.dg}` : team.dg} DG</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderPredicciones = () => {
    const pendientes = matches
      .filter(m => m.status === 'PENDIENTE' || m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const top4Locked = IS_TOP4_LOCKED;

    return (
      <div className="w-full max-w-none mx-auto px-2 sm:px-10 py-4">
        {/* BOTÓN GUARDAR */}
        <div className="flex justify-end mb-4">
          <button
            id="btn-save"
            onClick={handleSavePredictions}
            disabled={!hasUnsavedChanges}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all w-full sm:w-auto ${hasUnsavedChanges
              ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-900 shadow-lg shadow-emerald-500/20 transform active:scale-95'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
          >
            <Save className="w-5 h-5" />
            Guardar Predicciones
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: Top 4 del Usuario (Ancho 3/12) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 md:p-8 shadow-lg">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-100">
                <Medal className="w-5 h-5 text-emerald-400" />
                Mejores 4 del Torneo
                {top4Locked && <Lock className="w-4 h-4 text-red-400 ml-2" />}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                {[
                  { id: 'first', label: '1. Campeón', color: 'text-yellow-400', border: 'border-yellow-400/30 bg-yellow-400/5' },
                  { id: 'second', label: '2. Subcampeón', color: 'text-slate-300', border: 'border-slate-400/30 bg-slate-400/5' },
                  { id: 'third', label: '3. Tercer Lugar', color: 'text-amber-600', border: 'border-amber-600/30 bg-amber-600/5' },
                  { id: 'fourth', label: '4. Cuarto Lugar', color: 'text-slate-400', border: 'border-slate-500/30 bg-slate-500/5' },
                ].map((pos) => (
                  <div key={pos.id} className={`p-4 md:p-5 rounded-xl border transition-colors ${pos.border} ${top4Locked ? 'opacity-80' : ''}`}>
                    <label className={`block text-sm md:text-base font-bold mb-3 ${pos.color} flex justify-between`}>
                      {pos.label}
                      {top4Locked && <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-500/20">Bloqueado</span>}
                    </label>
                    <div className="relative">
                      <select
                        value={predictions[pos.id] || ''}
                        disabled={IS_TOP4_LOCKED}
                        onChange={(e) => {
                          setPredictions({ ...predictions, [pos.id]: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className={`w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-medium ${top4Locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-500 transition-colors'}`}
                      >
                        <option value="">-- Selecciona un equipo --</option>
                        {TEAMS.map(team => {
                          const isSelectedElsewhere = Object.values(predictions).includes(team) && predictions[pos.id] !== team;
                          return (
                            <option key={team} value={team} disabled={isSelectedElsewhere}>
                              {team} {isSelectedElsewhere ? '(Ya seleccionado)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                        {!top4Locked && (
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Pronósticos de Partidos (Ancho 8/12) */}
          <div className="lg:col-span-9 flex flex-col gap-4">
            {/* Contenedor de la tarjeta Pronósticos */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 md:p-8 shadow-lg">
              <h3 className="text-xl font-bold mb-6 text-slate-100 flex items-center gap-2 border-b border-slate-700 pb-4">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Pronósticos de Próximos Partidos
              </h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                {pendientes.map(m => {
                  const locked = isMatchLocked(m);
                  return (
                    <div key={m.id} className={`bg-slate-900/40 p-2 sm:p-4 rounded-xl border relative transition-colors ${locked ? 'border-slate-800 opacity-80' : 'border-slate-700/50 hover:border-slate-600'}`}>
                      {locked && <Lock className="w-4 h-4 text-red-400 absolute top-2 left-2 opacity-70" title="Partido Bloqueado" />}
                      {/* Cabecera de tarjeta de pronóstico */}
                      <div className="flex items-center justify-between w-full mb-1.5 text-[10px] sm:text-xs border-b border-slate-700/40 pb-1">
                        <span className="font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 truncate max-w-[75%]">
                          {m.stage || 'Fase de Grupos'}
                        </span>
                        <span className="font-mono text-slate-500 shrink-0 ml-1">
                          #{m.id}
                        </span>
                      </div>

                      {/* BÚNKER DE 12 COLUMNAS (100% Clases nativas de Tailwind) */}
                      <div className="grid grid-cols-12 items-center gap-1 w-full my-1.5 py-1.5 px-1 text-xs sm:text-sm">

                        {/* COLUMNA 1 a 3 (25% del ancho): Nombre Local */}
                        <div className="col-span-3 flex items-center justify-end text-right pr-0.5 sm:pr-1 overflow-hidden">
                          <span className="font-bold leading-tight line-clamp-2 sm:line-clamp-none text-slate-100">
                            {formatBracketTeam(m.team1)}
                          </span>
                        </div>

                        {/* COLUMNA 4: Bandera Local */}
                        <div className="col-span-1 flex items-center justify-center text-base sm:text-xl shrink-0">
                          {typeof getFlag(m.team1) === 'string' && getFlag(m.team1).startsWith('http') ? <img src={getFlag(m.team1)} alt={m.team1} className="w-full h-full object-contain drop-shadow-sm" /> : getFlag(m.team1)}
                        </div>

                        {/* COLUMNA 5 a 8 (33% del ancho): Centro (Marcador / VS / Inputs) */}
                        <div className="col-span-4 flex items-center justify-center font-black text-sm sm:text-lg tracking-tighter overflow-hidden">
                          <div className="w-16 sm:w-24 shrink-0 flex items-center justify-center gap-1 font-black text-base sm:text-xl tracking-tighter">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              disabled={locked}
                              placeholder="-"
                              value={matchPredictions[m.id]?.score1 ?? ''}
                              onChange={(e) => {
                                setMatchPredictions({
                                  ...matchPredictions,
                                  [m.id]: { ...matchPredictions[m.id], score1: e.target.value }
                                });
                                setHasUnsavedChanges(true);
                              }}
                              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border rounded-xl text-center font-black text-xl sm:text-2xl focus:ring-2 focus:outline-none transition-shadow ${locked ? 'bg-slate-900/50 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-slate-600 text-slate-100 focus:ring-emerald-500'}`}
                            />
                            <span className="text-slate-600 font-black px-1">-</span>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              disabled={locked}
                              placeholder="-"
                              value={matchPredictions[m.id]?.score2 ?? ''}
                              onChange={(e) => {
                                setMatchPredictions({
                                  ...matchPredictions,
                                  [m.id]: { ...matchPredictions[m.id], score2: e.target.value }
                                });
                                setHasUnsavedChanges(true);
                              }}
                              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border rounded-xl text-center font-black text-xl sm:text-2xl focus:ring-2 focus:outline-none transition-shadow ${locked ? 'bg-slate-900/50 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-slate-600 text-slate-100 focus:ring-emerald-500'}`}
                            />
                          </div>
                        </div>

                        {/* COLUMNA 9: Bandera Visitante */}
                        <div className="col-span-1 flex items-center justify-center text-base sm:text-xl shrink-0">
                          {typeof getFlag(m.team2) === 'string' && getFlag(m.team2).startsWith('http') ? <img src={getFlag(m.team2)} alt={m.team2} className="w-full h-full object-contain drop-shadow-sm" /> : getFlag(m.team2)}
                        </div>

                        {/* COLUMNA 10 a 12 (25% del ancho): Nombre Visitante */}
                        <div className="col-span-3 flex items-center justify-start text-left pl-0.5 sm:pl-1 overflow-hidden">
                          <span className="font-bold leading-tight line-clamp-2 sm:line-clamp-none text-slate-100">
                            {formatBracketTeam(m.team2)}
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBracket = () => {
    const knockoutMatches = matches.filter(m => m.matchType !== 'group' && m.stage !== 'Fase de Grupos');

    const rondas = [
      { id: 'r32', nombre: 'Dieciseisavos' },
      { id: 'r16', nombre: 'Octavos' },
      { id: 'qf', nombre: 'Cuartos' },
      { id: 'sf', nombre: 'Semifinales' },
      { id: 'final', nombre: 'Gran Final' }
    ];

    return (
      <div className="w-full overflow-x-auto pb-8 pt-2 select-none custom-scrollbar">
        <div className="flex gap-6 min-w-[950px] px-4">
          {rondas.map((ronda) => {
            const rondaMatches = knockoutMatches.filter(m => 
              String(m.stage || '').toLowerCase().includes(ronda.nombre.toLowerCase()) ||
              String(m.matchType || '').toLowerCase() === ronda.id
            );

            return (
              <div key={ronda.id} className="flex flex-col gap-4 w-[200px] shrink-0">
                <div className="bg-slate-800/80 border-b-2 border-amber-500 text-amber-400 font-black text-xs py-1.5 px-3 rounded-t text-center uppercase tracking-wider shadow">
                  {ronda.nombre}
                </div>
                <div className="flex flex-col gap-3 justify-around h-full">
                  {rondaMatches.map((m) => (
                    <div key={m.id} className="bg-slate-900/90 border border-slate-700/60 rounded p-2 text-xs shadow-md relative flex flex-col justify-center">
                      <div className="flex justify-between items-center text-slate-300 font-semibold mb-1 truncate">
                        <span>{m.flag1} {formatBracketTeam(m.team1)}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-bold">{m.score1 ?? '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300 font-semibold truncate">
                        <span>{m.flag2} {formatBracketTeam(m.team2)}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-bold">{m.score2 ?? '-'}</span>
                      </div>
                      <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-600 bg-slate-950 px-1 rounded border border-slate-800">
                        #{m.id}
                      </span>
                      {/* Conector óptico hacia la siguiente ronda */}
                      {ronda.id !== 'final' && (
                        <span className="absolute -right-6 top-1/2 w-6 h-[2px] bg-amber-500/40 pointer-events-none hidden sm:block"></span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Partido por el 3º Puesto */}
                {ronda.id === 'final' && (
                  <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-amber-500 uppercase text-center tracking-widest">🥉 Tercer Puesto</span>
                    {knockoutMatches
                      .filter(m => m.matchType === 'third_place' || String(m.stage).includes('3rd') || m.id === '103')
                      .map(m3 => (
                        <div key={m3.id} className="bg-slate-900/90 border border-slate-700/60 rounded p-2 text-xs shadow-md relative flex flex-col justify-center">
                          <div className="flex justify-between items-center text-slate-300 font-semibold mb-1 truncate">
                            <span>{m3.flag1} {formatBracketTeam(m3.team1)}</span>
                            <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-bold">{m3.score1 ?? '-'}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300 font-semibold truncate">
                            <span>{m3.flag2} {formatBracketTeam(m3.team2)}</span>
                            <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-bold">{m3.score2 ?? '-'}</span>
                          </div>
                          <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-600 bg-slate-950 px-1 rounded border border-slate-800">
                            #{m3.id}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTabContentWrapper = () => {
    if (isLoadingData) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[60vh] animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-slate-300 font-bold text-lg tracking-wide animate-pulse">
            Sincronizando con el servidor de la FIFA...
          </p>
          <p className="text-slate-500 text-sm mt-2">Obteniendo últimos resultados y tablas</p>
        </div>
      );
    }

    switch (currentTab) {
      case 'inicio': return renderInicio();
      case 'horario': return renderHorario();
      case 'puntuaciones': return renderPuntuaciones();
      case 'predicciones': return renderPredicciones();
      case 'bracket': return renderBracket();
      default: return renderInicio();
    }
  };

  const renderNavbar = () => (
    <nav className="fixed bottom-0 w-full bg-slate-800/95 backdrop-blur-md border-t border-slate-700 pb-safe z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)]">
      <div className="flex justify-around items-center p-2 max-w-2xl mx-auto w-full">

        {[
          { id: 'inicio', icon: Home, label: 'Inicio' },
          { id: 'horario', icon: Calendar, label: 'Horario' },
          { id: 'puntuaciones', icon: ListOrdered, label: 'Grupos' },
          { id: 'bracket', icon: Shuffle, label: 'Torneo' },
          { id: 'predicciones', icon: Edit3, label: 'Predecir', alert: hasUnsavedChanges }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-2 w-[72px] md:w-24 rounded-2xl transition-all duration-300 relative ${currentTab === tab.id
              ? 'text-emerald-400 bg-emerald-500/10 scale-105'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
              }`}
          >
            {tab.alert && currentTab !== tab.id && (
              <span className="absolute top-1 right-2 md:right-5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-800"></span>
            )}
            <tab.icon className={`w-6 h-6 mb-1 ${currentTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className={`text-[10px] md:text-xs font-semibold ${currentTab === tab.id ? 'tracking-wide' : ''}`}>
              {tab.label}
            </span>
          </button>
        ))}

      </div>
    </nav>
  );

  const renderFooterAlert = () => {
    if (queueLength === 0 && !isSyncing) return null;

    return (
      <div className="fixed bottom-24 left-4 right-4 z-20 mx-auto max-w-md bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl text-sm flex justify-center items-center">
        {isSyncing ? (
          <div className="flex items-center gap-2 text-emerald-400 animate-pulse font-bold">
            <CloudUpload className="w-5 h-5" />
            Sincronizando con el servidor...
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <WifiOff className="w-5 h-5" />
            {queueLength} cambio{queueLength > 1 ? 's' : ''} offline pendiente{queueLength > 1 ? 's' : ''}.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50 font-sans selection:bg-emerald-500/30">
      {renderHeader()}

      <main className="flex-1 pb-28">
        {!user ? (
          showLogin ? renderLogin() : renderLandingPage()
        ) : (
          renderTabContentWrapper()
        )}
      </main>

      {/* Flechas Flotantes de Navegación Vertical */}
      <div className={`fixed bottom-24 right-6 flex flex-col gap-3 z-50 transition-opacity duration-300 ${showArrows ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {canScrollUp && (
          <button
            onClick={scrollToTop}
            className="p-3 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-full shadow-lg border border-emerald-400 backdrop-blur-sm transition-transform hover:scale-110 flex items-center justify-center"
            title="Ir arriba"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        )}
        {canScrollDown && (
          <button
            onClick={scrollToBottom}
            className="p-3 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-full shadow-lg border border-emerald-400 backdrop-blur-sm transition-transform hover:scale-110 flex items-center justify-center"
            title="Ir abajo"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </div>

      {user && renderFooterAlert()}
      {user && renderNavbar()}
    </div>
  );
}

export default App;
