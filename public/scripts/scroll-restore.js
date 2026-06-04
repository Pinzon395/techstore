(function () {
  var STORAGE_KEY = 'pixon_scroll_positions_v1';
  var MAX_ENTRIES = 60;
  var SAVE_INTERVAL = 150;
  var RESTORE_ATTEMPTS = 28;
  var RESTORE_DELAY = 80;
  var restoreCancelled = false;
  var restoreActive = false;
  var userInteracted = false;

  if (!('sessionStorage' in window)) return;

  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  } catch (_) {}

  function storageRead() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function storageWrite(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function pageKey() {
    return window.location.pathname + window.location.search;
  }

  function hasForcedTarget() {
    if (window.location.hash) return true;
    try {
      return new URLSearchParams(window.location.search).has('section');
    } catch (_) {
      return false;
    }
  }

  function trimEntries(data) {
    var entries = Object.entries(data).sort(function (a, b) {
      return (b[1].time || 0) - (a[1].time || 0);
    });
    return entries.slice(0, MAX_ENTRIES).reduce(function (acc, entry) {
      acc[entry[0]] = entry[1];
      return acc;
    }, {});
  }

  function savePosition() {
    var y = window.scrollY || window.pageYOffset || 0;
    var data = storageRead();
    data[pageKey()] = {
      x: window.scrollX || window.pageXOffset || 0,
      y: Math.max(0, Math.round(y)),
      time: Date.now()
    };
    storageWrite(trimEntries(data));
  }

  function restorePosition() {
    if (hasForcedTarget()) return;
    if (userInteracted) return;

    var saved = storageRead()[pageKey()];
    if (!saved || !Number.isFinite(saved.y) || saved.y <= 0) return;

    var attempt = 0;
    var targetY = saved.y;
    var targetX = Number.isFinite(saved.x) ? saved.x : 0;
    restoreCancelled = false;
    restoreActive = true;

    function tryRestore() {
      if (restoreCancelled) {
        restoreActive = false;
        return;
      }

      attempt += 1;
      var maxY = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      ) - window.innerHeight;
      var canRestore = maxY >= Math.min(targetY, 80);
      var lastAttempt = attempt >= RESTORE_ATTEMPTS;

      if (canRestore || lastAttempt) {
        window.scrollTo(targetX, Math.min(targetY, Math.max(0, maxY)));
        restoreActive = false;
        return;
      }

      window.setTimeout(tryRestore, RESTORE_DELAY);
    }

    window.requestAnimationFrame(tryRestore);
  }

  var saveTimer = 0;
  function cancelRestoreOnUserMove() {
    userInteracted = true;
    if (restoreActive) restoreCancelled = true;
  }

  window.addEventListener('pointerdown', cancelRestoreOnUserMove, { passive: true });
  window.addEventListener('wheel', cancelRestoreOnUserMove, { passive: true });
  window.addEventListener('touchstart', cancelRestoreOnUserMove, { passive: true });
  window.addEventListener('touchmove', cancelRestoreOnUserMove, { passive: true });
  window.addEventListener('keydown', function (event) {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(event.key) !== -1) {
      cancelRestoreOnUserMove();
    }
  });

  window.addEventListener('scroll', function () {
    if (saveTimer) return;
    saveTimer = window.setTimeout(function () {
      saveTimer = 0;
      savePosition();
    }, SAVE_INTERVAL);
  }, { passive: true });

  window.addEventListener('pagehide', savePosition);
  window.addEventListener('beforeunload', savePosition);
  window.addEventListener('load', restorePosition);
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) restorePosition();
  });
})();
