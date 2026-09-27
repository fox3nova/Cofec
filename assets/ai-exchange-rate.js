/* Public USD reference rates only; no calculator values, keys or records are sent. */
(() => {
  'use strict';
  const input = document.getElementById('cost-fx');
  const status = document.getElementById('fx-status');
  const button = document.getElementById('fx-refresh');
  const form = document.getElementById('cost-form');
  const endpoint = 'https://open.er-api.com/v6/latest/USD';
  let latest = null, manual = false, revision = 0, controller = null, lastAttempt = 0;
  const date = timestamp => new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(timestamp));
  const day = timestamp => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
  function describe() {
    if (manual) return '目前使用手動匯率；自動更新不會覆蓋你的修改。';
    if (latest) return `已帶入最新公布匯率：${date(latest.updated)}（臺北時間${day(latest.updated) === day(Date.now()) ? '' : '，非今日資料'}）。每日更新，可自行修改；不是銀行或信用卡實際扣款匯率。`;
    return '目前使用預設估算值 32，尚未取得最新匯率；可自行修改。';
  }
  function apply() {
    input.value = String(latest.rate);
    manual = false;
    // Notify the existing calculator without treating this as a manual edit.
    input.dispatchEvent(new Event('change', { bubbles: true }));
    status.textContent = describe();
  }
  async function refresh() {
    if (controller) controller.abort();
    const request = new AbortController();
    controller = request;
    const version = ++revision;
    lastAttempt = Date.now();
    button.disabled = true;
    status.textContent = `正在取得最新美元／新臺幣匯率⋯ ${describe()}`;
    const timeout = setTimeout(() => request.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        signal: request.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'
      });
      if (!response.ok) throw new Error('HTTP');
      const value = await response.json();
      const rate = value.rates?.TWD;
      const updated = value.time_last_update_unix * 1000;
      const next = value.time_next_update_unix * 1000;
      if (value.result !== 'success' || value.base_code !== 'USD' ||
          typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0.01 || rate > 1000 ||
          !Number.isFinite(updated) || updated <= 0 || updated > Date.now() + 300000 ||
          !Number.isFinite(next) || next <= updated) throw new Error('Invalid rate');
      if (controller !== request) return;
      latest = { rate, updated, next };
      // A user can edit the field while the request is in flight.
      if (version === revision) apply();
      else status.textContent = describe();
    } catch (_) {
      if (controller === request) status.textContent = `未能取得最新匯率。${describe()}可按「更新最新匯率」重試。`;
    } finally {
      clearTimeout(timeout);
      if (controller === request) {
        controller = null;
        button.disabled = false;
      }
    }
  }
  input.addEventListener('input', () => {
    revision++;
    manual = true;
    status.textContent = describe();
  });
  button.addEventListener('click', refresh);
  form.addEventListener('reset', () => {
    revision++;
    manual = false;
    if (controller) { controller.abort(); controller = null; }
    setTimeout(() => {
      button.disabled = false;
      if (latest) apply();
      else status.textContent = describe();
      if (!latest || Date.now() >= latest.next) refresh();
    }, 0);
  });
  function refreshIfDue() {
    if (!document.hidden && !manual && !controller && Date.now() - lastAttempt >= 3600000 &&
        (!latest || Date.now() >= latest.next)) refresh();
  }
  document.addEventListener('visibilitychange', refreshIfDue);
  setInterval(refreshIfDue, 3600000);
  refresh();
})();
