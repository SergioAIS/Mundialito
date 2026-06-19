const USER_KEY = 'mundial_user';
const PREDICTIONS_KEY = 'mundial_predictions';
const MATCH_PREDICTIONS_KEY = 'mundial_match_predictions';
const SYNC_QUEUE_KEY = 'mundial_sync_queue';

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 4; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const offlineStorage = {
  loginUser: (username) => {
    if (!username || typeof username !== 'string') {
      throw new Error('Username is required');
    }
    
    const normalizedName = username.trim();
    if (!normalizedName) {
      throw new Error('Username cannot be empty');
    }

    const existingUserStr = localStorage.getItem(USER_KEY);
    if (existingUserStr) {
      try {
        const existingUser = JSON.parse(existingUserStr);
        // Si ya hay un usuario guardado, devolvemos ese
        return existingUser;
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
      }
    }

    // Si no existe, creamos uno nuevo
    const newUser = {
      name: normalizedName,
      id: generateToken()
    };
    
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    return newUser;
  },

  savePredictions: (predictions) => {
    // Validamos que tenga la estructura requerida (aunque permitimos que estén vacíos)
    const { first, second, third, fourth } = predictions || {};
    const predictionsToSave = {
      first: first || null,
      second: second || null,
      third: third || null,
      fourth: fourth || null
    };
    localStorage.setItem(PREDICTIONS_KEY, JSON.stringify(predictionsToSave));
  },

  getPredictions: () => {
    const dataStr = localStorage.getItem(PREDICTIONS_KEY);
    if (!dataStr) return null;
    try {
      return JSON.parse(dataStr);
    } catch (e) {
      console.error('Error parsing predictions from localStorage', e);
      return null;
    }
  },

  saveMatchPredictions: (matchPredictions) => {
    localStorage.setItem(MATCH_PREDICTIONS_KEY, JSON.stringify(matchPredictions || {}));
  },

  getMatchPredictions: () => {
    const dataStr = localStorage.getItem(MATCH_PREDICTIONS_KEY);
    if (!dataStr) return {};
    try {
      return JSON.parse(dataStr);
    } catch (e) {
      console.error('Error parsing match predictions', e);
      return {};
    }
  },

  enqueueSync: (type, data) => {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
    let queue = [];
    if (queueStr) {
      try {
        queue = JSON.parse(queueStr);
      } catch (e) {
        console.error('Error parsing sync queue from localStorage', e);
      }
    }
    
    queue.push({
      type,
      data,
      timestamp: Date.now()
    });
    
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  },

  getQueue: () => {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueStr) return [];
    try {
      return JSON.parse(queueStr);
    } catch (e) {
      console.error('Error parsing sync queue from localStorage', e);
      return [];
    }
  },

  clearQueue: () => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }
};

export default offlineStorage;
