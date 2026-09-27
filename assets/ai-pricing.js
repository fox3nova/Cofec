/* Static, reviewed prices only. No keys, analytics, storage or AI requests. */
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('ai-pricing-data').textContent);
  const byId = id => document.getElementById(id);
  const form = byId('cost-form');
  const modelSelect = byId('cost-model');
  const fmt = n => new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
  const money = (usd, fx) => `US$${fmt(usd)}（約 NT$${fmt(usd * fx)}）`;
  function number(id) {
    const el = byId(id);
    const value = el.valueAsNumber;
    if (!el.checkValidity() || !Number.isFinite(value) || el.value.trim() === '') throw new Error('請填入範圍內的有效數字；每月次數與 token 須為整數。');
    return value;
  }
  function update() {
    const custom = modelSelect.value === 'custom';
    byId('custom-rates').hidden = !custom;
    for (const id of ['custom-input', 'custom-output']) {
      byId(id).disabled = !custom;
      byId(id).required = custom;
    }
    byId('cost-total').textContent = '';
    byId('cost-detail').textContent = '';
    byId('cost-error').hidden = true;
    for (const s of data.scenarios) byId(`${s.id}-cost`).textContent = '';
    const selected = data.models.find(m => m.id === modelSelect.value);
    byId('selected-rate').textContent = custom ? '請依服務商的實際方案填入美元單價；圖片支援需自行確認。' : `${selected.modelID} · 輸入 US$${selected.input}／輸出 US$${selected.output}（每 100 萬 token）。${selected.note}`;
    try {
      const model = custom ? { input: number('custom-input'), output: number('custom-output'), vision: byId('custom-vision').checked } : selected;
      const fx = number('cost-fx');
      const multiplier = number('cost-multiplier');
      let total = 0, calls = 0, input = 0, output = 0;
      let unsupported = false;
      for (const s of data.scenarios) {
        const count = number(`${s.id}-count`);
        const i = number(`${s.id}-input`), o = number(`${s.id}-output`);
        if (s.vision && !model.vision) {
          byId(`${s.id}-cost`).textContent = '此範例模型不支援圖片；改選圖片模型，或將照片次數設為 0 以只估文字功能。';
          if (count > 0) unsupported = true;
          continue;
        }
        if (count > 0 && model.maxInputForRate && i > model.maxInputForRate) {
          throw new Error('輸入用量超出本頁所引用的計價級距。請查看官方長上下文價格，並改用「自訂費率」估算。');
        }
        const once = (i * model.input + o * model.output) / 1e6;
        byId(`${s.id}-cost`).textContent = `單次 ${money(once, fx)}；每月 ${money(once * count * multiplier, fx)}（含額外呼叫倍率）。`;
        total += once * count * multiplier;
        calls += count;
        input += i * count * multiplier;
        output += o * count * multiplier;
      }
      if (unsupported) throw new Error('尚無完整月費：所選模型不支援照片。請改選模型或把照片次數設為 0；不會把不支援的功能算成免費。');
      byId('cost-total').textContent = `預估每月 API 用量費 ${money(total, fx)}`;
      byId('cost-detail').textContent = `${calls.toLocaleString('zh-TW')} 次功能使用 × ${multiplier} 倍用量；約 ${Math.round(input).toLocaleString('zh-TW')} 輸入與 ${Math.round(output).toLocaleString('zh-TW')} 計費輸出 token。未含稅、儲值手續費及匯差；未扣免費額度、快取或批次優惠。此為示例用量試算，不是帳單或費用上限。`;
    } catch (error) {
      byId('cost-total').textContent = '';
      byId('cost-detail').textContent = '';
      byId('cost-error').textContent = error.message;
      byId('cost-error').hidden = false;
    }
  }
  form.hidden = false;
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => setTimeout(update, 0));
  update();
})();
