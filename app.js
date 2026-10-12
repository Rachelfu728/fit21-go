/**
 * Fit21 出發鍵 (V1.0)
 * 專為體重管理事業經營者打造的行動啟動小工具
 * 核心理念：「不必想一整天，只要開始第一步。」
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEY_ACTIVE = 'fit21_active_session_v1';
  const STORAGE_KEY_HISTORY = 'fit21_history_v1';

  // Global State
  let activeSession = null;
  let timerInterval = null;
  let selectedPreFatigue = null;
  let deferredInstallPrompt = null;

  // DOM Elements
  const screens = {
    home: document.getElementById('screen-home'),
    active: document.getElementById('screen-active'),
    complete: document.getElementById('screen-complete')
  };

  const modals = {
    history: document.getElementById('modal-history'),
    settings: document.getElementById('modal-settings'),
    confirm: document.getElementById('modal-confirm')
  };

  // --- Initializer ---
  function init() {
    registerServiceWorker();
    setupPwaInstall();
    bindEvents();
    renderHomeWeeklyPill();

    // Check if an active session was in progress
    const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (savedActive) {
      try {
        activeSession = JSON.parse(savedActive);
        if (activeSession && activeSession.startTime) {
          resumeActiveSession();
          return;
        }
      } catch (e) {
        console.error('Failed to parse active session:', e);
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
      }
    }

    switchScreen('home');
  }

  // --- PWA & Service Worker ---
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('Fit21 SW registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('Fit21 SW registration failed:', err);
          });
      });
    }
  }

  function setupPwaInstall() {
    const installBtn = document.getElementById('btn-install-prompt');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('hidden');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          showToast('已將 Fit21 出發鍵 加到桌面！');
        }
        deferredInstallPrompt = null;
        installBtn.classList.add('hidden');
      });
    }

    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.classList.add('hidden');
      deferredInstallPrompt = null;
      showToast('Fit21 出發鍵 安裝完成！');
    });
  }

  // --- Screen Navigation ---
  function switchScreen(screenName) {
    Object.keys(screens).forEach((name) => {
      if (name === screenName) {
        screens[name].classList.add('active');
      } else {
        screens[name].classList.remove('active');
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Header navigation
    document.getElementById('btn-nav-history').addEventListener('click', () => openModal('history'));
    document.getElementById('btn-nav-settings').addEventListener('click', () => openModal('settings'));
    document.getElementById('btn-close-history').addEventListener('click', () => closeModal('history'));
    document.getElementById('btn-close-settings').addEventListener('click', () => closeModal('settings'));

    // Modal background close
    Object.values(modals).forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal && modal.id !== 'modal-confirm') {
          modal.classList.add('hidden');
        }
      });
    });

    // Screen 1: Home Pre-fatigue buttons
    const preFatigueBtns = document.querySelectorAll('#pre-fatigue-group .rating-btn');
    const clearPreBtn = document.getElementById('btn-clear-pre-fatigue');
    const preHint = document.getElementById('pre-fatigue-selected-hint');
    const preStatus = document.getElementById('pre-fatigue-status');

    preFatigueBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        hapticFeedback(20);
        const score = parseInt(btn.getAttribute('data-score'), 10);
        if (selectedPreFatigue === score) {
          // Deselect
          selectedPreFatigue = null;
          btn.classList.remove('active');
          clearPreBtn.classList.add('hidden');
          preHint.textContent = '直接點擊下方「我現在出發」即可，不需強制填寫';
          preStatus.textContent = '可跳過';
        } else {
          selectedPreFatigue = score;
          preFatigueBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          clearPreBtn.classList.remove('hidden');
          preHint.textContent = `已記錄出發前感受：${score} 分`;
          preStatus.textContent = `已選 ${score} 分`;
        }
      });
    });

    clearPreBtn.addEventListener('click', () => {
      selectedPreFatigue = null;
      preFatigueBtns.forEach((b) => b.classList.remove('active'));
      clearPreBtn.classList.add('hidden');
      preHint.textContent = '直接點擊下方「我現在出發」即可，不需強制填寫';
      preStatus.textContent = '可跳過';
    });

    // Screen 1: Start Now Button
    document.getElementById('btn-start-now').addEventListener('click', startDeparture);

    // Screen 2: First Talk Button
    document.getElementById('btn-first-talk').addEventListener('click', recordFirstTalk);

    // Screen 2: Counter buttons
    document.querySelectorAll('.btn-counter-add').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        modifyCount(type, 1);
      });
    });

    document.querySelectorAll('.btn-counter-sub').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        modifyCount(type, -1);
      });
    });

    // Screen 2: End session
    document.getElementById('btn-end-session').addEventListener('click', () => {
      hapticFeedback(25);
      openConfirmModal();
    });

    // Screen 3: Post-fatigue buttons
    const postFatigueBtns = document.querySelectorAll('#post-fatigue-group .rating-btn');
    postFatigueBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        hapticFeedback(20);
        const score = parseInt(btn.getAttribute('data-score'), 10);
        setPostFatigue(score);
      });
    });

    // Screen 3: Back home & view history
    document.getElementById('btn-back-home').addEventListener('click', resetToHome);
    document.getElementById('btn-view-history-from-complete').addEventListener('click', () => {
      openModal('history');
    });

    // Backup & Restore
    document.getElementById('btn-export-json').addEventListener('click', exportBackup);
    document.getElementById('input-import-json').addEventListener('change', importBackup);
  }

  // --- Session Management ---

  function startDeparture() {
    hapticFeedback(50);
    const now = new Date();

    activeSession = {
      id: 'session_' + now.getTime(),
      startTime: now.getTime(),
      endTime: null,
      dateStr: formatDate(now),
      timeStr: formatTime(now),
      preFatigue: selectedPreFatigue,
      postFatigue: null,
      firstTalkTime: null,
      firstTalkElapsedMins: null,
      counts: {
        invites: 0,
        tastings: 0,
        appointments: 0
      }
    };

    saveActiveSession();
    setupActiveScreen();
    switchScreen('active');
    startTimer();
    showToast('開始邀約！先跨出第一步。');
  }

  function resumeActiveSession() {
    setupActiveScreen();
    switchScreen('active');
    startTimer();
    showToast('已為您恢復進行中的邀約紀錄');
  }

  function setupActiveScreen() {
    const startDate = new Date(activeSession.startTime);
    document.getElementById('active-current-date').textContent = formatFullDateWithDay(startDate);
    document.getElementById('active-start-time-text').textContent = `出發時間：${formatTime(startDate)}`;

    // Restore counters
    updateCounterDisplay('invites', activeSession.counts.invites);
    updateCounterDisplay('tastings', activeSession.counts.tastings);
    updateCounterDisplay('appointments', activeSession.counts.appointments);

    // Restore First Talk state
    const ctaBox = document.getElementById('box-first-talk-cta');
    const badgeBox = document.getElementById('box-first-talk-badge');
    const talkDesc = document.getElementById('badge-talk-time-text');

    if (activeSession.firstTalkTime) {
      ctaBox.classList.add('hidden');
      badgeBox.classList.remove('hidden');
      const talkDate = new Date(activeSession.firstTalkTime);
      const mins = activeSession.firstTalkElapsedMins || Math.max(1, Math.round((activeSession.firstTalkTime - activeSession.startTime) / 60000));
      talkDesc.textContent = `首次開口時間：出發後 ${mins} 分鐘 (${formatTime(talkDate)})`;
    } else {
      ctaBox.classList.remove('hidden');
      badgeBox.classList.add('hidden');
    }
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }

  function updateTimerDisplay() {
    if (!activeSession || !activeSession.startTime) return;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - activeSession.startTime) / 1000));
    const timerElem = document.getElementById('active-timer');
    if (timerElem) {
      timerElem.textContent = formatDurationDigital(elapsedSeconds);
    }
  }

  function recordFirstTalk() {
    if (!activeSession) return;
    hapticFeedback([40, 60, 40]);
    const now = Date.now();
    activeSession.firstTalkTime = now;
    const elapsedMins = Math.max(1, Math.round((now - activeSession.startTime) / 60000));
    activeSession.firstTalkElapsedMins = elapsedMins;

    saveActiveSession();

    const ctaBox = document.getElementById('box-first-talk-cta');
    const badgeBox = document.getElementById('box-first-talk-badge');
    const talkDesc = document.getElementById('badge-talk-time-text');

    ctaBox.classList.add('hidden');
    badgeBox.classList.remove('hidden');
    talkDesc.textContent = `首次開口時間：出發後 ${elapsedMins} 分鐘 (${formatTime(new Date(now))})`;

    showToast('✨ 恭喜順利開口！節奏正在回來。');
  }

  function modifyCount(type, delta) {
    if (!activeSession || !activeSession.counts) return;
    const current = activeSession.counts[type] || 0;
    const next = Math.max(0, current + delta);
    activeSession.counts[type] = next;

    hapticFeedback(delta > 0 ? 30 : 15);
    updateCounterDisplay(type, next);
    saveActiveSession();
  }

  function updateCounterDisplay(type, val) {
    const valElem = document.getElementById('val-' + type);
    if (valElem) {
      valElem.textContent = val;
    }
    const card = document.getElementById('counter-card-' + type);
    if (card) {
      const subBtn = card.querySelector('.btn-counter-sub');
      if (subBtn) {
        subBtn.disabled = val <= 0;
      }
    }
  }

  function openConfirmModal() {
    const modal = document.getElementById('modal-confirm');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnOk = document.getElementById('btn-confirm-ok');

    modal.classList.remove('hidden');

    function cleanup() {
      btnCancel.removeEventListener('click', onCancel);
      btnOk.removeEventListener('click', onOk);
      modal.classList.add('hidden');
    }

    function onCancel() {
      cleanup();
    }

    function onOk() {
      cleanup();
      finishActiveSession();
    }

    btnCancel.addEventListener('click', onCancel);
    btnOk.addEventListener('click', onOk);
  }

  function finishActiveSession() {
    if (!activeSession) return;
    if (timerInterval) clearInterval(timerInterval);

    const now = Date.now();
    activeSession.endTime = now;
    const totalMinutes = Math.max(1, Math.round((now - activeSession.startTime) / 60000));
    activeSession.durationMinutes = totalMinutes;

    // Save to history
    saveCompletedSession(activeSession);

    // Clear active session
    localStorage.removeItem(STORAGE_KEY_ACTIVE);

    // Setup Complete screen
    setupCompleteScreen(activeSession);
    switchScreen('complete');

    // Keep activeSession reference for post-fatigue rating on screen 3
    renderHomeWeeklyPill();
  }

  function setupCompleteScreen(session) {
    // Populate Results Grid
    document.getElementById('res-duration').textContent = formatMinutesFriendly(session.durationMinutes);

    const firstTalkElem = document.getElementById('res-first-talk');
    if (session.firstTalkElapsedMins) {
      firstTalkElem.textContent = `出發後 ${session.firstTalkElapsedMins} 分鐘`;
    } else {
      firstTalkElem.textContent = '未特別記錄';
    }

    document.getElementById('res-invites').textContent = `${session.counts.invites} 人`;
    document.getElementById('res-tastings').textContent = `${session.counts.tastings} 人`;
    document.getElementById('res-appointments').textContent = `${session.counts.appointments} 人`;

    // Reset post fatigue UI
    const postFatigueBtns = document.querySelectorAll('#post-fatigue-group .rating-btn');
    postFatigueBtns.forEach((btn) => btn.classList.remove('active'));
    document.getElementById('post-fatigue-status').textContent = '可跳過';

    // Reset compare card
    updateFatigueCompareCard(session.preFatigue, null);
  }

  function setPostFatigue(score) {
    if (!activeSession) return;
    activeSession.postFatigue = score;

    // Update in history storage
    updateSessionInHistory(activeSession.id, { postFatigue: score });

    const postFatigueBtns = document.querySelectorAll('#post-fatigue-group .rating-btn');
    postFatigueBtns.forEach((btn) => {
      const s = parseInt(btn.getAttribute('data-score'), 10);
      btn.classList.toggle('active', s === score);
    });

    document.getElementById('post-fatigue-status').textContent = `已記錄 ${score} 分`;
    updateFatigueCompareCard(activeSession.preFatigue, score);
  }

  function updateFatigueCompareCard(preScore, postScore) {
    const compareCard = document.getElementById('fatigue-compare-card');
    if (!compareCard) return;

    if (preScore !== null && preScore !== undefined && postScore !== null && postScore !== undefined) {
      document.getElementById('cmp-pre-score').textContent = `${preScore} 分`;
      document.getElementById('cmp-post-score').textContent = `${postScore} 分`;
      document.getElementById('cmp-insight-text').textContent = `出發前：${preScore}分 ➔ 完成後：${postScore}分`;
      compareCard.classList.remove('hidden');
    } else {
      compareCard.classList.add('hidden');
    }
  }

  function resetToHome() {
    activeSession = null;
    selectedPreFatigue = null;

    // Reset Pre-Fatigue on home screen
    document.querySelectorAll('#pre-fatigue-group .rating-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById('btn-clear-pre-fatigue').classList.add('hidden');
    document.getElementById('pre-fatigue-selected-hint').textContent = '直接點擊下方「我現在出發」即可，不需強制填寫';
    document.getElementById('pre-fatigue-status').textContent = '可跳過';

    renderHomeWeeklyPill();
    switchScreen('home');
  }

  // --- Storage & History Operations ---

  function saveActiveSession() {
    if (!activeSession) return;
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeSession));
  }

  function getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading history:', e);
      return [];
    }
  }

  function saveCompletedSession(session) {
    const list = getHistory();
    // Prepend newest first
    list.unshift(session);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
  }

  function updateSessionInHistory(sessionId, updates) {
    const list = getHistory();
    const idx = list.findIndex((item) => item.id === sessionId);
    if (idx !== -1) {
      list[idx] = Object.assign({}, list[idx], updates);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
    }
  }

  function deleteHistoryItem(sessionId) {
    if (!confirm('確定要刪除這筆紀錄嗎？')) return;
    const list = getHistory().filter((item) => item.id !== sessionId);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
    renderHistoryModal();
    renderHomeWeeklyPill();
    showToast('已刪除紀錄');
  }

  // --- Modal: History & Weekly Statistics ---

  function openModal(modalName) {
    if (modalName === 'history') {
      renderHistoryModal();
    } else if (modalName === 'settings') {
      document.getElementById('backup-status-msg').textContent = '';
    }
    if (modals[modalName]) {
      modals[modalName].classList.remove('hidden');
    }
  }

  function closeModal(modalName) {
    if (modals[modalName]) {
      modals[modalName].classList.add('hidden');
    }
  }

  function renderHistoryModal() {
    const historyList = getHistory();
    const { startOfWeek, endOfWeek, weekRecords } = getWeekData(historyList);

    // Render Weekly Stats
    const dateRangeStr = `${formatDateShort(startOfWeek)} ~ ${formatDateShort(endOfWeek)}`;
    document.getElementById('weekly-range-text').textContent = dateRangeStr;

    let totalInvites = 0;
    let totalTastings = 0;
    let totalAppointments = 0;
    let totalMinutes = 0;

    weekRecords.forEach((item) => {
      totalInvites += (item.counts?.invites || 0);
      totalTastings += (item.counts?.tastings || 0);
      totalAppointments += (item.counts?.appointments || 0);
      totalMinutes += (item.durationMinutes || 0);
    });

    document.getElementById('stat-departures').textContent = weekRecords.length;
    document.getElementById('stat-invites').textContent = totalInvites;
    document.getElementById('stat-tastings').textContent = totalTastings;
    document.getElementById('stat-appointments').textContent = totalAppointments;
    document.getElementById('stat-total-time').textContent = formatHoursAndMinutes(totalMinutes);

    // Render Timeline List
    const container = document.getElementById('history-list-container');
    container.innerHTML = '';

    if (historyList.length === 0) {
      container.innerHTML = `
        <div class="empty-history-box">
          <p>尚未有出發紀錄。<br>準備好時，按下「我現在出發」跨出第一步吧！</p>
        </div>
      `;
      return;
    }

    historyList.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'history-item-card';

      const startDate = new Date(item.startTime);
      const endDate = item.endTime ? new Date(item.endTime) : null;
      const timeRangeStr = endDate ? `${formatTime(startDate)} - ${formatTime(endDate)}` : formatTime(startDate);
      const durationStr = formatMinutesFriendly(item.durationMinutes || 0);

      let fatigueText = '';
      if (item.preFatigue && item.postFatigue) {
        fatigueText = `感受：${item.preFatigue}分 ➔ ${item.postFatigue}分`;
      } else if (item.preFatigue) {
        fatigueText = `出發前：${item.preFatigue}分`;
      } else if (item.postFatigue) {
        fatigueText = `完成後：${item.postFatigue}分`;
      }

      let talkText = '';
      if (item.firstTalkElapsedMins) {
        talkText = `首次開口：出發後 ${item.firstTalkElapsedMins} 分鐘`;
      }

      card.innerHTML = `
        <div class="history-item-header">
          <div class="history-date">${formatFullDateWithDay(startDate)}</div>
          <span class="history-time-badge">${durationStr} (${timeRangeStr})</span>
        </div>
        <div class="history-item-metrics">
          <span>開口邀約 <strong class="history-metric-val">${item.counts?.invites || 0}</strong> 人</span>
          <span>進店試飲 <strong class="history-metric-val">${item.counts?.tastings || 0}</strong> 人</span>
          <span>預約客戶 <strong class="history-metric-val">${item.counts?.appointments || 0}</strong> 人</span>
        </div>
        <div class="history-item-footer">
          <div>
            ${talkText ? `<span class="history-talk-tag">${talkText}</span>` : ''}
            ${talkText && fatigueText ? ' · ' : ''}
            ${fatigueText ? `<span>${fatigueText}</span>` : ''}
          </div>
          <button type="button" class="btn-delete-record" data-id="${item.id}" title="刪除此筆紀錄">刪除</button>
        </div>
      `;

      card.querySelector('.btn-delete-record').addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteHistoryItem(id);
      });

      container.appendChild(card);
    });
  }

  function renderHomeWeeklyPill() {
    const pill = document.getElementById('home-weekly-pill');
    if (!pill) return;
    const historyList = getHistory();
    const { weekRecords } = getWeekData(historyList);

    if (weekRecords.length > 0) {
      let totalInvites = 0;
      weekRecords.forEach((r) => totalInvites += (r.counts?.invites || 0));
      pill.style.display = 'block';
      pill.innerHTML = `本週已累積出發 <strong>${weekRecords.length}</strong> 次 · 累計邀約 <strong>${totalInvites}</strong> 人`;
    } else {
      pill.style.display = 'none';
    }
  }

  function getWeekData(records) {
    const now = new Date();
    // Monday as start of week
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekRecords = records.filter((item) => {
      const itemTime = item.startTime;
      return itemTime >= startOfWeek.getTime() && itemTime <= endOfWeek.getTime();
    });

    return { startOfWeek, endOfWeek, weekRecords };
  }

  // --- Backup & Restore (JSON) ---

  function exportBackup() {
    try {
      const history = getHistory();
      const backupData = {
        app: 'Fit21 出發鍵',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalRecords: history.length,
        records: history
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `Fit21_邀約紀錄備份_${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const statusElem = document.getElementById('backup-status-msg');
      if (statusElem) {
        statusElem.textContent = `✅ 成功匯出 ${history.length} 筆紀錄檔案！`;
        statusElem.style.color = 'var(--color-primary)';
      }
      showToast('紀錄備份匯出成功！');
    } catch (e) {
      console.error('Export failed:', e);
      alert('匯出失敗，請重試');
    }
  }

  function importBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedRecords = Array.isArray(parsed) ? parsed : (parsed.records && Array.isArray(parsed.records) ? parsed.records : null);

        if (!importedRecords) {
          throw new Error('無效的備份格式');
        }

        const existing = getHistory();
        const existingIds = new Set(existing.map((item) => item.id));

        let addedCount = 0;
        importedRecords.forEach((item) => {
          if (item && item.startTime) {
            if (!item.id) item.id = 'session_' + item.startTime;
            if (!existingIds.has(item.id)) {
              existing.push(item);
              existingIds.add(item.id);
              addedCount++;
            }
          }
        });

        // Re-sort descending
        existing.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(existing));

        const statusElem = document.getElementById('backup-status-msg');
        if (statusElem) {
          statusElem.textContent = `✅ 匯入完成！新增 ${addedCount} 筆紀錄（現有共 ${existing.length} 筆）`;
          statusElem.style.color = 'var(--color-primary)';
        }

        renderHomeWeeklyPill();
        showToast(`成功匯入 ${addedCount} 筆新紀錄！`);
      } catch (err) {
        console.error('Import failed:', err);
        alert('匯入失敗：請確認選擇正確的 Fit21 JSON 備份檔案');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  // --- Formatting Helpers ---

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }

  function formatDateShort(d) {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${day}`;
  }

  function formatFullDateWithDay(d) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const daysMap = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${y}年${m}月${day}日 ${daysMap[d.getDay()]}`;
  }

  function formatTime(d) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function formatDurationDigital(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function formatMinutesFriendly(mins) {
    if (mins < 60) {
      return `${mins} 分鐘`;
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} 小時 ${m} 分鐘` : `${h} 小時`;
  }

  function formatHoursAndMinutes(totalMinutes) {
    if (totalMinutes === 0) return '0 分鐘';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins} 分鐘`;
    return mins > 0 ? `${hours} 小時 ${mins} 分鐘` : `${hours} 小時`;
  }

  // --- Feedback Utilities ---

  function hapticFeedback(pattern) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore vibration errors if blocked by browser
      }
    }
  }

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // Run App Initialization
  document.addEventListener('DOMContentLoaded', init);

})();
