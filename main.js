document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  //SW registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/retro-games/sw.js')
      .then(reg => console.log('Service Worker registered with scope:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  }


  //state & constants

  const STORAGE_KEYS = {
    SHOUT_MESSAGES: 'retro_shout_messages',
    STREAK: 'retro_streak',
    LAST_CHECKIN: 'retro_last_checkin',
    POLL_VOTES: 'retro_poll_votes',
    BADGES: 'retro_badges',
    VISITOR_COUNT: 'retro_visitor_count',
    USER_VOTE: 'retro_user_vote',
    LEADERBOARD_SUBMISSIONS: 'retro_leaderboard_subs',
    RADIO_STATE: 'retro_radio_state',
    OFFLINE_GAMES: 'retro_offline_games' // track which games user saved offline
  };

  //initial mock data
  let state = {
    onlineCount: 47,
    totalPlayers: 1914,
    chatCount: 92,
    visitorCount: 99,
    streak: 0,
    lastCheckin: null,
    badges: ['first_login'],
    shoutMessages: [
      {
        id: '1',
        name: 'RetroFan',
        text: 'Love these games! 🔥',
        reactions: { '❤️': 3, '😂': 1 },
        timestamp: Date.now() - 120000
      },
      {
        id: '2',
        name: 'PixelPusher',
        text: 'Snake is so addictive 🐍',
        reactions: { '❤️': 5, '🔥': 2 },
        timestamp: Date.now() - 300000
      }
    ],
    pollVotes: {
      'Space Invaders': 45,
      'Frogger': 30,
      'Donkey Kong': 15,
      'Galaga': 10
    },


    userVote: null,
    currentTrack: 'Gadi meri 23 seater',
    isPlaying: false,
    volume: 0.5,
    activities: [
      { text: '🐍 Snake · (i have to add this feature do remine me ehehe)', timestamp: Date.now() - 60000 },
      { text: '👻 Pac-Man · this one too', timestamp: Date.now() - 120000 },
      { text: '🧩 Tetris · ye bhii', timestamp: Date.now() - 180000 },
      { text: '🐍 Snake · this too', timestamp: Date.now() - 240000 },
      { text: '💬 RetroFan shouted "Love these games!"', timestamp: Date.now() - 300000 }
    ],


    leaderboards: {
      snake: ['Sasta hulkkk :142', 'chota bada baccha :138', 'murgi :135'],
      pacman: ['sasta hulk :5280', 'bada baccha :4950', 'paneer :4720'],
      tetris: ['bada sasta hulk :12', 'chota baccha :10', 'rasmalai :9']
    },
    gameCounts: { snake: 42, pacman: 27, tetris: 38 },
    offlineGames: [] // list of game names saved offline
  };

  // Load from localStorage
  function loadState() {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEYS.SHOUT_MESSAGES);
      if (savedMessages) state.shoutMessages = JSON.parse(savedMessages);

      const savedStreak = localStorage.getItem(STORAGE_KEYS.STREAK);
      if (savedStreak) state.streak = parseInt(savedStreak, 10);

      const savedLastCheckin = localStorage.getItem(STORAGE_KEYS.LAST_CHECKIN);
      if (savedLastCheckin) state.lastCheckin = savedLastCheckin;

      const savedPollVotes = localStorage.getItem(STORAGE_KEYS.POLL_VOTES);
      if (savedPollVotes) state.pollVotes = JSON.parse(savedPollVotes);

      const savedBadges = localStorage.getItem(STORAGE_KEYS.BADGES);
      if (savedBadges) state.badges = JSON.parse(savedBadges);

      const savedUserVote = localStorage.getItem(STORAGE_KEYS.USER_VOTE);
      if (savedUserVote) state.userVote = savedUserVote;

      const savedRadioState = localStorage.getItem(STORAGE_KEYS.RADIO_STATE);
      if (savedRadioState) {
        const rs = JSON.parse(savedRadioState);
        state.currentTrack = rs.currentTrack || state.currentTrack;
        state.isPlaying = rs.isPlaying || false;
        state.volume = rs.volume || 0.5;
      }

      const savedOfflineGames = localStorage.getItem(STORAGE_KEYS.OFFLINE_GAMES);
      if (savedOfflineGames) state.offlineGames = JSON.parse(savedOfflineGames);

      const savedVisitorCount = localStorage.getItem(STORAGE_KEYS.VISITOR_COUNT);
      if (savedVisitorCount) {
        state.visitorCount = parseInt(savedVisitorCount, 10) + 1;
      } else {
        state.visitorCount = 1337;
      }
      localStorage.setItem(STORAGE_KEYS.VISITOR_COUNT, state.visitorCount);

    } catch (e) {
      console.warn('Failed to load state from localStorage', e);
    }
  }
  loadState();

  //DOM elements
  const onlineCountSpan = document.getElementById('onlineCount');
  const totalPlayersSpan = document.getElementById('totalPlayers');
  const chatCountSpan = document.getElementById('chatCount');
  const visitorCountSpan = document.getElementById('visitorCount');
  const gameTipSpan = document.getElementById('gameTip');
  const shoutboxMessages = document.getElementById('shoutboxMessages');
  const shoutboxForm = document.getElementById('shoutboxForm');
  const shoutName = document.getElementById('shoutName');
  const shoutMessage = document.getElementById('shoutMessage');
  const leaderboardTabs = document.querySelectorAll('.leaderboard-tab');
  const leaderboardSnake = document.getElementById('leaderboardSnake');
  const leaderboardPacman = document.getElementById('leaderboardPacman');
  const leaderboardTetris = document.getElementById('leaderboardTetris');
  const checkinBtn = document.getElementById('checkinBtn');
  const streakCountSpan = document.getElementById('streakCount');
  const badgeCollection = document.getElementById('badgeCollection');
  const activityFeed = document.getElementById('activityFeed');
  const radioPlayPause = document.getElementById('radioPlayPause');
  const radioTrack = document.getElementById('radioTrack');
  const radioVolume = document.getElementById('radioVolume');
  const trackList = document.querySelectorAll('.track');
  const pollOptions = document.getElementById('pollOptions');
  const voteBtn = document.getElementById('voteBtn');
  const voteMessage = document.getElementById('voteMessage');
  const pollLink = document.getElementById('pollLink');
  const pollModal = document.getElementById('pollModal');
  const closePoll = document.getElementById('closePoll');
  const pollForm = document.getElementById('pollForm');
  const pollResults = document.getElementById('pollResults');
  const reportBugLink = document.getElementById('reportBugLink');
  const bugModal = document.getElementById('bugModal');
  const bugForm = document.getElementById('bugForm');
  const closeBugModal = document.getElementById('closeBugModal');
  const bugName = document.getElementById('bugName');
  const bugDescription = document.getElementById('bugDescription');
  const saveOfflineBtns = document.querySelectorAll('.save-offline-btn');
  const nowPlayingSpans = {
    snake: document.querySelector('[data-game="snake"] .player-count'),
    pacman: document.querySelector('[data-game="pacman"] .player-count'),
    tetris: document.querySelector('[data-game="tetris"] .player-count')
  };
  const highScoreSpans = {
    snake: document.querySelector('[data-game="snake"] .high-score'),
    pacman: document.querySelector('[data-game="pacman"] .high-score'),
    tetris: document.querySelector('[data-game="tetris"] .high-score')
  };

  //functions time/message/votes/badges/streak/radio/offline games
  function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  function saveShoutMessages() {
    localStorage.setItem(STORAGE_KEYS.SHOUT_MESSAGES, JSON.stringify(state.shoutMessages));
  }

  function savePollVotes() {
    localStorage.setItem(STORAGE_KEYS.POLL_VOTES, JSON.stringify(state.pollVotes));
    localStorage.setItem(STORAGE_KEYS.USER_VOTE, state.userVote || '');
  }

  function saveBadges() {
    localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(state.badges));
  }

  function saveStreak() {
    localStorage.setItem(STORAGE_KEYS.STREAK, state.streak.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_CHECKIN, state.lastCheckin || '');
  }

  function saveRadioState() {
    localStorage.setItem(STORAGE_KEYS.RADIO_STATE, JSON.stringify({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      volume: state.volume
    }));
  }

  function saveOfflineGames() {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_GAMES, JSON.stringify(state.offlineGames));
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  //OFFLINE CACHE __TO BE COMPLETED
  function cacheGameForOffline(gameName) {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      alert('Service worker not active. Offline caching unavailable.');
      return;
    }


    //map game name to URL
    const gameUrls = {
      snake: './games/snake/',
      pacman: './games/pacman/',
      tetris: './games/tetris/'
    };
    const url = gameUrls[gameName];
    if (!url) return;

    //send message to service worker
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_GAME',
      url: url
    });

    //add to offlineGames list if not already
    if (!state.offlineGames.includes(gameName)) {
      state.offlineGames.push(gameName);
      saveOfflineGames();
    }

    //provide visual feedback
    const btn = document.querySelector(`.save-offline-btn[data-game="${gameName}"]`);
    if (btn) {
      btn.textContent = '✅';
      btn.title = 'Game saved offline';
      btn.disabled = true;
    }

    //add activity
    addActivity(`💾 ${gameName.charAt(0).toUpperCase() + gameName.slice(1)} saved for offline play`);
  }

  function updateOfflineButtons() {
    saveOfflineBtns.forEach(btn => {
      const game = btn.dataset.game;
      if (state.offlineGames.includes(game)) {
        btn.textContent = '✅';
        btn.title = 'Game saved offline';
        btn.disabled = true;
      } else {
        btn.textContent = '💾';
        btn.title = 'Save this game for offline play';
        btn.disabled = false;
      }
    });
  }

  //ui updates
  function updateLiveStats() {
    if (onlineCountSpan) onlineCountSpan.textContent = state.onlineCount;
    if (totalPlayersSpan) totalPlayersSpan.textContent = state.totalPlayers.toLocaleString();
    if (chatCountSpan) chatCountSpan.textContent = state.chatCount;
    if (visitorCountSpan) visitorCountSpan.textContent = state.visitorCount;
  }

  function updateNowPlaying() {
    if (nowPlayingSpans.snake) nowPlayingSpans.snake.textContent = state.gameCounts.snake;
    if (nowPlayingSpans.pacman) nowPlayingSpans.pacman.textContent = state.gameCounts.pacman;
    if (nowPlayingSpans.tetris) nowPlayingSpans.tetris.textContent = state.gameCounts.tetris;
  }

  function updateGameTip() {
    const tips = [
      'Use arrow keys in Snake',
      'Eat the big dot in Pac-Man to chase ghosts',
      'Clear 4 lines at once for Tetris!',
      'Press space to pause',
      'High scores are saved locally',
      'Share your score in the shoutbox',
      'Check in daily to earn badges',
      'Vote for the next game in the poll',
      'Save games offline with the 💾 button',
      'Suggest more at harsharya129@gmail.com'
    ];
    if (gameTipSpan) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      gameTipSpan.textContent = `💡 Tip: ${randomTip}`;
    }
  }

  function renderShoutbox() {
    if (!shoutboxMessages) return;
    shoutboxMessages.innerHTML = '';
    const sorted = [...state.shoutMessages].sort((a, b) => b.timestamp - a.timestamp);
    sorted.slice(0, 20).forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'shout-message';
      msgDiv.dataset.id = msg.id;
      msgDiv.innerHTML = `
        <span class="shout-avatar">👤</span>
        <span class="shout-name">${escapeHtml(msg.name)}:</span>
        <span class="shout-text">${escapeHtml(msg.text)}</span>
        <div class="shout-actions">
          ${Object.entries(msg.reactions).map(([emoji, count]) => `
            <button class="reaction-btn" data-reaction="${emoji}">${emoji} <span class="reaction-count">${count}</span></button>
          `).join('')}
          <span class="shout-time">${formatTimeAgo(msg.timestamp)}</span>
        </div>
      `;
      shoutboxMessages.appendChild(msgDiv);
    });
    attachReactionListeners();
  }

  function attachReactionListeners() {
    document.querySelectorAll('.reaction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const msgDiv = btn.closest('.shout-message');
        if (!msgDiv) return;
        const msgId = msgDiv.dataset.id;
        const reaction = btn.dataset.reaction;
        const msg = state.shoutMessages.find(m => m.id === msgId);
        if (msg) {
          msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
          saveShoutMessages();
          renderShoutbox();
        }
      });
    });
  }

  function addShoutMessage(name, text) {
    const newMsg = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: name.trim(),
      text: text.trim(),
      reactions: {},
      timestamp: Date.now()
    };
    state.shoutMessages.unshift(newMsg);
    if (state.shoutMessages.length > 50) state.shoutMessages.pop();
    saveShoutMessages();
    renderShoutbox();
    state.chatCount++;
    if (chatCountSpan) chatCountSpan.textContent = state.chatCount;
    addActivity(`💬 ${name} shouted "${text.substring(0, 20)}..."`);
    if (shoutboxMessages) shoutboxMessages.scrollTop = 0;
  }

  function addActivity(text) {
    const activity = { text, timestamp: Date.now() };
    state.activities.unshift(activity);
    if (state.activities.length > 20) state.activities.pop();
    renderActivityFeed();
  }

  function renderActivityFeed() {
    if (!activityFeed) return;
    activityFeed.innerHTML = '';
    state.activities.slice(0, 10).forEach(act => {
      const div = document.createElement('div');
      div.className = 'activity-item';
      div.textContent = act.text;
      activityFeed.appendChild(div);
    });
  }

  function renderLeaderboard(game) {
    [leaderboardSnake, leaderboardPacman, leaderboardTetris].forEach(el => {
      if (el) el.classList.add('hidden');
    });
    let target = null;
    if (game === 'snake') target = leaderboardSnake;
    else if (game === 'pacman') target = leaderboardPacman;
    else if (game === 'tetris') target = leaderboardTetris;
    if (target) {
      target.classList.remove('hidden');
      const list = target.querySelector('ol');
      if (list) {
        list.innerHTML = '';
        state.leaderboards[game].forEach(entry => {
          const li = document.createElement('li');
          li.textContent = entry;
          list.appendChild(li);
        });
      }
    }
  }

  //badges & daily
  function checkAndUnlockBadges() {
    if (state.streak >= 3 && !state.badges.includes('play_three')) {
      state.badges.push('play_three');
      saveBadges();
      addActivity('🏆 Badge unlocked: Play 3 games!');
    }
    if (state.userVote && !state.badges.includes('score_100')) {
      state.badges.push('score_100');
      saveBadges();
      addActivity('🏆 Badge unlocked: Score 100 in Snake!');
    }
    updateDailyChallenge();
  }

  function updateDailyChallenge() {
    if (!streakCountSpan) return;
    streakCountSpan.textContent = state.streak;

    const today = new Date().toDateString();
    if (state.lastCheckin === today) {
      if (checkinBtn) checkinBtn.disabled = true;
    } else {
      if (checkinBtn) checkinBtn.disabled = false;
    }

    if (badgeCollection) {
      const allBadges = [
        { id: 'first_login', emoji: '🎮', unlocked: state.badges.includes('first_login') },
        { id: 'play_three', emoji: '🎯', unlocked: state.badges.includes('play_three') },
        { id: 'score_100', emoji: '🏆', unlocked: state.badges.includes('score_100') },
        { id: 'streak_7', emoji: '🔥', unlocked: state.badges.includes('streak_7') }
      ];
      badgeCollection.innerHTML = allBadges.map(b => `
        <span class="badge ${b.unlocked ? '' : 'locked'}" title="${b.id}">${b.emoji}</span>
      `).join('');
    }
  }

  function handleCheckin() {
    const today = new Date().toDateString();
    if (state.lastCheckin === today) return;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (state.lastCheckin === yesterday) {
      state.streak++;
      if (state.streak === 7 && !state.badges.includes('streak_7')) {
        state.badges.push('streak_7');
        saveBadges();
        addActivity('🔥 Badge unlocked: 7-day streak!');
      }
    } else {
      state.streak = 1;
    }
    state.lastCheckin = today;
    saveStreak();
    updateDailyChallenge();
    addActivity(`📅 ${shoutName?.value || 'Someone'} checked in! (streak: ${state.streak})`);
    checkAndUnlockBadges();
  }

  //poll
  function renderPoll() {
    if (!pollOptions) return;
    const total = Object.values(state.pollVotes).reduce((a, b) => a + b, 0);
    pollOptions.innerHTML = '';
    for (const [game, votes] of Object.entries(state.pollVotes)) {
      const percent = total ? Math.round((votes / total) * 100) : 0;
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="radio" name="poll" value="${game}" ${state.userVote === game ? 'disabled' : ''}>
        ${game} <span class="poll-bar" style="width: ${percent}%">${percent}%</span>
      `;
      pollOptions.appendChild(label);
    }
    if (state.userVote) {
      if (voteMessage) voteMessage.textContent = `You voted for ${state.userVote}`;
    } else {
      if (voteMessage) voteMessage.textContent = '';
    }
  }

  function handlePollVote(vote) {
    if (state.userVote) return;
    state.pollVotes[vote] = (state.pollVotes[vote] || 0) + 1;
    state.userVote = vote;
    savePollVotes();
    renderPoll();
    addActivity(`🗳️ Someone voted for ${vote}`);
    checkAndUnlockBadges();
  }

  ///_-____________________radio ___INCOMPLETE ///
  const tracks = ['__', '___', 'to be implanted'];
  function updateRadio() {
    if (radioTrack) radioTrack.textContent = state.currentTrack;
    if (radioPlayPause) radioPlayPause.textContent = state.isPlaying ? '⏸️ Pause' : '▶️ Play';
    if (radioVolume) radioVolume.value = state.volume;
    saveRadioState();
  }

  //simulated updates-___INCOMPLETE
  function simulateLiveUpdates() {
    setInterval(() => {
      state.onlineCount = 40 + Math.floor(Math.random() * 30);
      if (onlineCountSpan) onlineCountSpan.textContent = state.onlineCount;
    }, 20000);

    setInterval(() => {
      state.gameCounts.snake = 30 + Math.floor(Math.random() * 30);
      state.gameCounts.pacman = 20 + Math.floor(Math.random() * 25);
      state.gameCounts.tetris = 25 + Math.floor(Math.random() * 30);
      updateNowPlaying();
    }, 25000);

    setInterval(() => {
      const activities = [
        '🐍 Snake · New player joined',
        '👻 Pac-Man · Ghost eaten!',
        '🧩 Tetris · Tetris!',
        '💬 New shout in chat',
        '🏆 High score beaten!'
      ];
      const randomAct = activities[Math.floor(Math.random() * activities.length)];
      addActivity(randomAct);
    }, 40000);

    setInterval(() => updateGameTip(), 60000);
  }

  //EMOJI PICKER
  function addEmojiPickerToShoutbox() {
    const form = shoutboxForm;
    if (!form) return;
    const emojiContainer = document.createElement('div');
    emojiContainer.className = 'emoji-picker';
    emojiContainer.style.marginTop = '5px';
    const emojis = ['😀', '😂', '❤️', '🔥', '👍', '🎮', '🐍', '👻', '🧩'];
    emojis.forEach(emoji => {
      const span = document.createElement('span');
      span.textContent = emoji;
      span.style.cursor = 'pointer';
      span.style.fontSize = '1.5rem';
      span.style.marginRight = '5px';
      span.addEventListener('click', () => {
        shoutMessage.value += emoji;
      });
      emojiContainer.appendChild(span);
    });
    form.insertBefore(emojiContainer, form.querySelector('button'));
  }

  //clear shoutbox
  function addClearShoutboxButton() {
    const header = document.querySelector('.community-shoutbox h2');
    if (!header) return;
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Clear';
    clearBtn.style.marginLeft = 'auto';
    clearBtn.style.background = 'transparent';
    clearBtn.style.border = '1px solid var(--accent-pink)';
    clearBtn.style.color = 'var(--accent-pink)';
    clearBtn.style.fontSize = '0.5rem';
    clearBtn.style.padding = '3px 8px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all shout messages? (This is irreversible)')) {
        state.shoutMessages = [];
        saveShoutMessages();
        renderShoutbox();
        addActivity('🗑️ Shoutbox cleared');
      }
    });
    header.appendChild(clearBtn);
  }

  //daily countdown
  function addDailyCountdown() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow - now;
    if (diff > 0) {
      const countdownEl = document.createElement('div');
      countdownEl.className = 'countdown-timer';
      countdownEl.style.fontSize = '0.6rem';
      countdownEl.style.marginTop = '5px';
      const challengeDiv = document.querySelector('.daily-challenge');
      if (challengeDiv) challengeDiv.appendChild(countdownEl);

      setInterval(() => {
        const now2 = new Date();
        const diff2 = tomorrow - now2;
        if (diff2 <= 0) {
          countdownEl.textContent = '✅ Reset available now!';
          return;
        }
        const h = Math.floor(diff2 / 3600000);
        const m = Math.floor((diff2 % 3600000) / 60000);
        const s = Math.floor((diff2 % 60000) / 1000);
        countdownEl.textContent = `⏳ Next daily reset: ${h}h ${m}m ${s}s`;
      }, 1000);
    }
  }

  //initialize
  function init() {
    updateLiveStats();
    updateNowPlaying();
    updateGameTip();
    renderShoutbox();
    renderActivityFeed();
    renderLeaderboard('snake');
    updateDailyChallenge();
    renderPoll();
    updateRadio();
    updateOfflineButtons(); // initial state of offline buttons

    addEmojiPickerToShoutbox();
    addClearShoutboxButton();
    addDailyCountdown();

    //leaderboard tabs
    leaderboardTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        leaderboardTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLeaderboard(tab.dataset.game);
      });
    });

    //shoutbox form
    if (shoutboxForm) {
      shoutboxForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = shoutName.value.trim();
        const msg = shoutMessage.value.trim();
        if (name && msg) {
          addShoutMessage(name, msg);
          shoutName.value = '';
          shoutMessage.value = '';
        }
      });
    }

    // check-in
    if (checkinBtn) {
      checkinBtn.addEventListener('click', handleCheckin);
    }

    // radio
    if (radioPlayPause) {
      radioPlayPause.addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        updateRadio();
      });
    }
    if (radioVolume) {
      radioVolume.addEventListener('input', (e) => {
        state.volume = parseFloat(e.target.value);
        updateRadio();
      });
    }
    trackList.forEach((track, idx) => {
      track.addEventListener('click', () => {
        state.currentTrack = tracks[idx];
        updateRadio();
      });
    });

    // poll modal
    if (pollLink) {
      pollLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (pollModal) pollModal.style.display = 'flex';
      });
    }
    if (closePoll) {
      closePoll.addEventListener('click', () => {
        if (pollModal) pollModal.style.display = 'none';
      });
    }
    if (pollForm) {
      pollForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selected = document.querySelector('input[name="poll"]:checked');
        if (selected && !state.userVote) {
          handlePollVote(selected.value);
          pollForm.reset();
          setTimeout(() => { if (pollModal) pollModal.style.display = 'none'; }, 1000);
        }
      });
    }

    // bug report modal
    if (reportBugLink) {
      reportBugLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (bugModal) bugModal.style.display = 'flex';
      });
    }
    if (closeBugModal) {
      closeBugModal.addEventListener('click', () => {
        if (bugModal) bugModal.style.display = 'none';
      });
    }
    if (bugForm) {
      bugForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = bugName.value.trim();
        const desc = bugDescription.value.trim();
        if (name && desc) {
          alert(`Bug reported! Thanks ${name}. We'll look into it.`);
          bugForm.reset();
          if (bugModal) bugModal.style.display = 'none';
          addActivity(`🐞 ${name} reported a bug`);
        }
      });
    }

    // offline save buttons
    saveOfflineBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const game = btn.dataset.game;
        cacheGameForOffline(game);
      });
    });

    // click outside modal to close
    window.addEventListener('click', (e) => {
      if (pollModal && e.target === pollModal) pollModal.style.display = 'none';
      if (bugModal && e.target === bugModal) bugModal.style.display = 'none';
    });

    simulateLiveUpdates();
    checkAndUnlockBadges();
  }

  init();
});