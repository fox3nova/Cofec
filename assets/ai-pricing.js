/* Reviewed public price snapshot. No API keys, storage, analytics or AI calls. */
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('ai-pricing-data').textContent);
  const byId = id => document.getElementById(id);
  const form = byId('cost-form');
  const modelSelect = byId('cost-model');
  const providerSelect = byId('cost-provider');
  const models = new Map(data.models.map(m => [m.id, m]));
  const fmt = n => new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
  const money = (usd, fx) => `US$${fmt(usd)}（約 NT$${fmt(usd * fx)}）`;
  const matches = (m, query) => `${m.provider} ${m.name} ${m.modelID}`.toLowerCase().includes(query.trim().toLowerCase());
  const hasPrice = m => Number.isFinite(m.input) && Number.isFinite(m.output);
  function number(id) {
    const el = byId(id);
    const value = el.valueAsNumber;
    if (!el.checkValidity() || !Number.isFinite(value) || el.value.trim() === '') throw new Error('請填入範圍內的有效數字；每月次數與 token 須為整數。');
    return value;
  }
  function populateModels(preferred) {
    const custom = providerSelect.value === 'custom';
    const all = data.models.filter(m => m.provider === providerSelect.value);
    const list = all.filter(m => matches(m, byId('cost-search').value));
    modelSelect.replaceChildren();
    byId('cost-search').disabled = custom;
    if (custom) {
      modelSelect.add(new Option('自訂模型費率', 'custom'));
    } else {
      for (const m of list) {
        const suffix = m.unavailable ? ' · 參考項目' : !hasPrice(m) ? ' · 需確認價格' : '';
        modelSelect.add(new Option(m.name + suffix, m.id));
      }
      if (!list.length) modelSelect.add(new Option('找不到模型，請清除或縮短搜尋文字', ''));
      if (list.some(m => m.id === preferred)) modelSelect.value = preferred;
    }
    modelSelect.disabled = !custom && !list.length;
    byId('cost-model-count').textContent = custom ? '費率請依實際服務商方案填寫。' : `顯示 ${list.length}／${all.length} 個模型／方案；可搜尋 API ID。`;
  }
  function rates(model, input) {
    if (model.tiers) {
      const tier = model.tiers.find(t => input <= t.maxInput);
      if (!tier) throw new Error('輸入超出已收錄的計價級距，請查官方價格並選「自訂相容 API／費率」。');
      return tier;
    }
    if (model.maxInputForRate && input > model.maxInputForRate) throw new Error('輸入超出目錄所列用量範圍，請查官方模型限制及價格。');
    return model;
  }
  function update() {
    const custom = providerSelect.value === 'custom';
    byId('custom-rates').hidden = !custom;
    for (const id of ['custom-input', 'custom-output']) {
      byId(id).disabled = !custom;
      byId(id).required = custom;
    }
    byId('cost-total').textContent = '';
    byId('cost-detail').textContent = '';
    byId('cost-error').hidden = true;
    for (const s of data.scenarios) byId(`${s.id}-cost`).textContent = '';
    const selected = models.get(modelSelect.value);
    byId('selected-rate').textContent = custom ? '請依服務商的實際方案填入美元單價；圖片支援需自行確認。' : !selected ? '搜尋沒有符合的模型。' : `${selected.modelID} · ${hasPrice(selected) ? `輸入 US$${selected.input}／輸出 US$${selected.output} 起（每 100 萬 token）` : '未提供固定輸入／輸出價格'}。${selected.note}${selected.tiers ? ' 依每個功能的輸入量自動套用已收錄級距。' : ''}`;
    try {
      const model = custom ? { input: number('custom-input'), output: number('custom-output'), vision: byId('custom-vision').checked } : selected;
      if (!model) throw new Error('請清除搜尋或改選服務商，再選擇模型。');
      if (model.unavailable) throw new Error(model.unavailable);
      if (!hasPrice(model)) throw new Error('此項目未提供固定價格；請向服務商確認後使用自訂費率，不會將缺漏價格視為免費。');
      if (model.validThrough && new Date() > new Date(`${model.validThrough}T23:59:59Z`)) throw new Error('此模型的優惠價格已到期，請依官方最新價格使用自訂費率。');
      const fx = number('cost-fx');
      const multiplier = number('cost-multiplier');
      let total = 0, calls = 0, input = 0, output = 0;
      let unsupported = false;
      for (const s of data.scenarios) {
        const count = number(`${s.id}-count`);
        const i = number(`${s.id}-input`), o = number(`${s.id}-output`);
        if (s.vision && model.vision !== true) {
          byId(`${s.id}-cost`).textContent = model.vision === false ? '不支援圖片：請改選模型，或把照片次數設為 0。' : '圖片能力尚未確認：請先在 App 測試，或把照片次數設為 0；確認後可用自訂費率。';
          if (count > 0) unsupported = true;
          continue;
        }
        const price = count ? rates(model, i) : model;
        const once = (i * price.input + o * price.output) / 1e6;
        byId(`${s.id}-cost`).textContent = count ? `單次 ${money(once, fx)}；每月 ${money(once * count * multiplier, fx)}。採輸入 ${price.input}／輸出 ${price.output} US$/M，含額外呼叫倍率。` : '本月 0 次，不列入費用。';
        total += once * count * multiplier;
        calls += count;
        input += i * count * multiplier;
        output += o * count * multiplier;
      }
      if (unsupported) throw new Error('尚無完整月費：照片功能不支援或能力尚未確認。請改選模型或把照片次數設為 0；不會把未確認的功能算成免費。');
      byId('cost-total').textContent = `預估每月 API token 用量費 ${money(total, fx)}`;
      byId('cost-detail').textContent = `${calls.toLocaleString('zh-TW')} 次功能使用 × ${multiplier} 倍用量；約 ${Math.round(input).toLocaleString('zh-TW')} 輸入與 ${Math.round(output).toLocaleString('zh-TW')} 計費輸出 token。未含工具／圖片等獨立附加費、稅、儲值手續費及匯差；未扣免費額度、快取或批次優惠。${model.routePrice ? 'OpenRouter 採公開路由起價，實際 endpoint 可能較高。' : ''}此為示例用量試算，不是帳單或費用上限。`;
    } catch (error) {
      byId('cost-total').textContent = '';
      byId('cost-detail').textContent = '';
      byId('cost-error').textContent = error.message;
      byId('cost-error').hidden = false;
    }
  }
  function filterCatalog() {
    const provider = byId('catalog-provider').value;
    const query = byId('catalog-search').value;
    let count = 0;
    for (const group of document.querySelectorAll('.catalog-provider')) {
      let found = 0;
      for (const row of group.querySelectorAll('tr[data-model]')) {
        const m = models.get(row.dataset.model);
        row.hidden = !!(provider && m.provider !== provider) || !matches(m, query);
        if (!row.hidden) found++;
      }
      group.hidden = found === 0;
      group.open = !!(provider || query.trim()) && found > 0;
      count += found;
    }
    byId('catalog-count').textContent = count ? `符合 ${count}／${data.models.length} 個模型／方案。${provider || query.trim() ? '' : '點選服務商即可展開。'}` : '找不到符合項目，請清除搜尋文字或選「全部服務商」。';
  }
  byId('catalog-controls').hidden = false;
  byId('catalog-provider').addEventListener('change', filterCatalog);
  byId('catalog-search').addEventListener('input', filterCatalog);
  for (const button of document.querySelectorAll('[data-use]')) {
    button.hidden = false;
    button.addEventListener('click', () => {
      const m = models.get(button.dataset.use);
      providerSelect.value = m.provider;
      byId('cost-search').value = '';
      populateModels(m.id);
      update();
      byId('ai-calculator').scrollIntoView({ behavior: 'auto', block: 'start' });
      modelSelect.focus({ preventScroll: true });
    });
  }
  form.hidden = false;
  form.addEventListener('input', event => {
    if (event.target.id === 'cost-search') populateModels(modelSelect.value);
    update();
  });
  form.addEventListener('change', event => {
    if (event.target.id === 'cost-provider') {
      byId('cost-search').value = '';
      populateModels(providerSelect.value === 'Meta（Muse）' ? data.defaultModel : undefined);
    }
    update();
  });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => setTimeout(() => { populateModels(data.defaultModel); update(); }, 0));
  populateModels(data.defaultModel);
  filterCatalog();
  update();
})();
