import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Trophy, User, CloudUpload, Send, Home, Calendar, Users, ListOrdered, Edit3, Save, Medal, Lock, ChevronDown, ChevronUp, Loader2, LogOut, Smartphone, Monitor, Share, PlusSquare } from 'lucide-react';
import offlineStorage from './utils/offlineStorage';
import { communityPredictions } from './data/mundialData';
import { fetchLiveMatches, calculateStandings, getBoliviaTimeData, TEAM_DICTIONARY } from './services/api';
import { supabase } from './services/supabase';

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
    }, 120000);

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
    const enCursoGlobal = matches.find(m => m.status === 'EN_CURSO');
    const finalizadosGlobal = matches.filter(m => m.status === 'FINALIZADO').sort((a,b) => new Date(b.date) - new Date(a.date));
    const featuredMatchGlobal = enCursoGlobal || finalizadosGlobal[0];

    if (!featuredMatchGlobal?.id) return;
    const matchId = featuredMatchGlobal.id;

    const fetchVotes = async () => {
      try {
        const { data, error } = await supabase
          .from('predicciones_comunidad')
          .select('*')
          .eq('partido_id', matchId);
          
        if (error) throw error;
        setCommunityVotes(data || []);
      } catch (e) {
        console.error("Error al obtener votos de la comunidad desde Supabase", e);
      }
    };
    
    // Carga inicial
    fetchVotes();

    // Suscripción a cambios en tiempo real para este partido
    const channel = supabase
      .channel(`realtime:predicciones_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predicciones_comunidad',
          filter: `partido_id=eq.${matchId}`
        },
        (payload) => {
          // Refrescamos los votos inmediatamente tras detectar un cambio en la base de datos
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matches]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mundial_user');
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
            else console.log("✅ Guardado en Supabase:", data);
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
      btn.innerHTML = '¡Guardado! ✅';
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
    // Calculamos el total de puntos del usuario
    const totalPoints = matches.filter(m => m.status === 'FINALIZADO').reduce((acc, m) => {
      const uPred = matchPredictions[m.id];
      if (uPred && uPred.score1 !== undefined && uPred.score2 !== undefined && uPred.score1 !== '' && uPred.score2 !== '') {
        const pts = calculatePoints(m.score1, m.score2, uPred.score1, uPred.score2);
        return acc + (pts ? pts.points : 0);
      }
      return acc;
    }, 0);

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
                <span className="text-sm font-bold text-emerald-400 whitespace-nowrap">Puntos: {totalPoints}</span>
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
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isOnline 
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
    const enCurso = matches.find(m => m.status === 'EN_CURSO');
    const finalizados = matches.filter(m => m.status === 'FINALIZADO').sort((a,b) => new Date(b.date) - new Date(a.date));
    const featuredMatch = enCurso || finalizados[0];
  
    const now = new Date();
    const pendientes = matches
      .filter(m => m.status === 'PENDIENTE' && new Date(m.date) > now)
      .sort((a,b) => new Date(a.date) - new Date(b.date));
    const nextMatch = pendientes[0];
    
    const userTop4 = Object.entries(predictions).filter(([k,v]) => v !== '');
  
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* Scoreboard Gigante */}
        {featuredMatch && (
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
            <div className="flex justify-between items-center mb-8">
              <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">
                {featuredMatch.stage} {featuredMatch.group ? `- ${featuredMatch.group}` : ''}
              </span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ${featuredMatch.status === 'EN_CURSO' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                {featuredMatch.status === 'EN_CURSO' ? 'EN VIVO' : 'FINALIZADO'}
              </span>
            </div>
            
            <div className="flex justify-between items-center px-2 md:px-12">
              <div className="flex flex-col items-center gap-3 w-1/3">
                <span className="text-6xl md:text-8xl drop-shadow-lg">{getFlag(featuredMatch.team1)}</span>
                <span className="font-bold text-base md:text-xl text-center">{featuredMatch.team1}</span>
              </div>
              
              <div className="flex flex-col items-center justify-center w-1/3">
                <div className="flex items-center gap-3 text-6xl md:text-8xl font-black tabular-nums tracking-tighter">
                  <span className={featuredMatch.score1 > featuredMatch.score2 ? 'text-white' : 'text-slate-300'}>{featuredMatch.score1 ?? '-'}</span>
                  <span className="text-slate-600 text-4xl pb-2">:</span>
                  <span className={featuredMatch.score2 > featuredMatch.score1 ? 'text-white' : 'text-slate-300'}>{featuredMatch.score2 ?? '-'}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-3 w-1/3">
                <span className="text-6xl md:text-8xl drop-shadow-lg">{getFlag(featuredMatch.team2)}</span>
                <span className="font-bold text-base md:text-xl text-center">{featuredMatch.team2}</span>
              </div>
            </div>
          </div>
        )}
  
        {/* Próximo Partido */}
        {nextMatch && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between shadow-md gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Próximo Partido
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
        )}
  
        {/* Community Predictions */}
        <div className="mt-2 bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-4 text-slate-100">
            <Users className="w-5 h-5 text-emerald-400" />
            Predicciones de la Comunidad
            <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-900 px-3 py-1 rounded-full hidden sm:block">
              Para el partido {featuredMatch?.status === 'EN_CURSO' ? 'en vivo' : 'reciente'}
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {communityVotes.length > 0 ? (
              communityVotes.map((pred, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-900/40 flex items-center justify-center border border-emerald-500/30 text-emerald-400 font-black text-lg">
                      {pred.usuario.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-200">{pred.usuario}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pred.prediccion && pred.prediccion.includes(' - ') ? (
                      <>
                        <div className="w-10 h-10 flex items-center justify-center font-mono font-black text-xl bg-slate-900 rounded-lg border border-slate-700 text-emerald-400 shadow-inner">
                          {pred.prediccion.split(' - ')[0].trim()}
                        </div>
                        <span className="text-slate-500 font-bold">-</span>
                        <div className="w-10 h-10 flex items-center justify-center font-mono font-black text-xl bg-slate-900 rounded-lg border border-slate-700 text-emerald-400 shadow-inner">
                          {pred.prediccion.split(' - ')[1].trim()}
                        </div>
                      </>
                    ) : (
                      <div className="font-mono font-bold text-xl bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 text-emerald-400 shadow-inner">
                        {pred.prediccion}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 text-center py-6 text-slate-400">
                Aún no hay predicciones para este partido. ¡Sé el primero en predecir!
              </div>
            )}
          </div>
        </div>

        {/* Tabla de Posiciones Global (Leaderboard) */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-lg mt-2">
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

        {/* Top 4 de la Comunidad */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 shadow-lg mt-2">
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
                    ].map(({l, team, c}) => (
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
    );
  };

  const renderHorario = () => {
    const sortedMatches = [...matches].sort((a,b) => new Date(a.date) - new Date(b.date));
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
      return (
        <div className="bg-slate-800 border border-slate-700 p-4 md:p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between hover:border-slate-500 transition-colors shadow-sm gap-4">
          <div className="flex flex-row md:flex-col justify-between md:justify-center w-full md:w-1/4">
            <span className="text-xs font-semibold text-slate-400 capitalize">{btz.date}</span>
            <span className="text-sm md:text-base font-bold text-emerald-400 font-mono">{btz.time}</span>
          </div>
          
          <div className="flex items-center justify-center gap-3 md:gap-6 flex-1 w-full">
            <div className="flex items-center justify-end gap-2 flex-1">
              <span className="font-bold text-sm md:text-base text-right">{match.team1}</span>
              <span className="text-2xl md:text-3xl">{getFlag(match.team1)}</span>
            </div>
            
            <div className="bg-slate-900 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-slate-700 font-mono font-black text-lg md:text-xl min-w-[5rem] flex flex-row justify-center items-center whitespace-nowrap shadow-inner">
              {match.score1 !== null ? `${match.score1} : ${match.score2}` : <span className="text-slate-500 text-sm">VS</span>}
            </div>

            <div className="flex items-center justify-start gap-2 flex-1">
              <span className="text-2xl md:text-3xl">{getFlag(match.team2)}</span>
              <span className="font-bold text-sm md:text-base text-left">{match.team2}</span>
            </div>
          </div>
    
          <div className="hidden md:flex w-1/4 justify-end">
            {match.group && (
              <span className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-300">
                {match.group}
              </span>
            )}
          </div>
        </div>
      );
    };
  
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
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
              <div className="flex flex-col gap-4 mt-6 animate-in slide-in-from-top-2 duration-200">
                {finalizados.map(m => {
                  const uPred = matchPredictions[m.id];
                  const uPredStr = uPred && uPred.score1 !== undefined && uPred.score2 !== undefined && uPred.score1 !== '' && uPred.score2 !== '' ? `${uPred.score1} - ${uPred.score2}` : 'Sin predicción';
                  const ptsResult = uPredStr !== 'Sin predicción' ? calculatePoints(m.score1, m.score2, uPred.score1, uPred.score2) : null;
                  const btz = getBoliviaTimeData(m.date);
                  
                  return (
                    <div key={m.id} className="bg-slate-800 border border-slate-600 p-4 rounded-xl flex flex-col gap-3 shadow-md">
                      <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                        <span className="font-semibold text-slate-400">{btz.date}</span>
                        <span className="font-bold text-slate-500">{m.stage}</span>
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
          <div className="flex flex-col gap-3">
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
          
          <div className="flex flex-col gap-3">
            {dieciseisavos.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
  
      </div>
    );
  };

  const renderPuntuaciones = () => (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-3xl font-black mb-2 uppercase tracking-wide text-slate-100 flex items-center gap-3 border-b border-slate-700 pb-4">
        <ListOrdered className="w-8 h-8 text-emerald-400" />
        Tablas de Posiciones
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groupsData.map((group) => (
          <div key={group.group} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-900/80 px-5 py-4 border-b border-slate-700 font-black text-slate-200 tracking-wider">
              {group.group}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-800 text-slate-400 text-xs">
                  <tr>
                    <th className="px-5 py-3 font-semibold w-full">Equipo</th>
                    <th className="px-3 py-3 text-center font-semibold">PJ</th>
                    <th className="px-3 py-3 text-center font-semibold">DG</th>
                    <th className="px-5 py-3 text-center font-black text-emerald-400 text-sm">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {group.teams.sort((a,b) => b.pts - a.pts).map((team, idx) => (
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
                        <span className="font-bold text-slate-200">{team.name}</span>
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
    </div>
  );

  const renderPredicciones = () => {
    const pendientes = matches.filter(m => m.status === 'PENDIENTE');
    const top4Locked = isTop4Locked();

    return (
      <div className="p-4 md:p-6 lg:p-8 w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* Floating Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-[4.5rem] z-10 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h2 className="text-2xl font-black uppercase tracking-wide text-slate-100 flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-emerald-400" />
            Mis Predicciones
          </h2>
          <button 
            id="btn-save"
            onClick={handleSavePredictions}
            disabled={!hasUnsavedChanges}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all w-full sm:w-auto ${
              hasUnsavedChanges 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-900 shadow-lg shadow-emerald-500/20 transform active:scale-95' 
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Save className="w-5 h-5" />
            Guardar Predicciones
          </button>
        </div>

        {/* Top 4 */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 md:p-8 shadow-lg">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-100">
            <Medal className="w-5 h-5 text-emerald-400" />
            Mejores 4 del Torneo
            {top4Locked && <Lock className="w-4 h-4 text-red-400 ml-2" />}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    disabled={top4Locked}
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

        {/* Proximos Partidos */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 md:p-8 shadow-lg">
          <h3 className="text-xl font-bold mb-6 text-slate-100 flex items-center gap-2 border-b border-slate-700 pb-4">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Pronósticos de Próximos Partidos
          </h3>
          <div className="flex flex-col gap-4">
            {pendientes.map(m => {
              const locked = isMatchLocked(m);
              return (
                <div key={m.id} className={`bg-slate-900/40 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${locked ? 'border-slate-800 opacity-80' : 'border-slate-700/50 hover:border-slate-600'}`}>
                  
                  <div className="flex items-center justify-end w-full sm:w-2/5 gap-3 relative">
                      {locked && <Lock className="w-4 h-4 text-red-400 absolute left-0 opacity-70" title="Partido Bloqueado" />}
                      <span className="font-bold text-sm md:text-base">{m.team1}</span>
                      <span className="text-3xl drop-shadow-sm">{getFlag(m.team1)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
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
                        className={`w-14 h-14 md:w-16 md:h-16 border rounded-xl text-center font-black text-2xl focus:ring-2 focus:outline-none transition-shadow ${locked ? 'bg-slate-900/50 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-slate-600 text-slate-100 focus:ring-emerald-500'}`} 
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
                        className={`w-14 h-14 md:w-16 md:h-16 border rounded-xl text-center font-black text-2xl focus:ring-2 focus:outline-none transition-shadow ${locked ? 'bg-slate-900/50 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-slate-600 text-slate-100 focus:ring-emerald-500'}`} 
                      />
                  </div>
                  
                  <div className="flex items-center justify-start w-full sm:w-2/5 gap-3">
                      <span className="text-3xl drop-shadow-sm">{getFlag(m.team2)}</span>
                      <span className="font-bold text-sm md:text-base">{m.team2}</span>
                  </div>

                </div>
              );
            })}
          </div>
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
          { id: 'predicciones', icon: Edit3, label: 'Predecir', alert: hasUnsavedChanges }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-2 w-[72px] md:w-24 rounded-2xl transition-all duration-300 relative ${
              currentTab === tab.id 
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
