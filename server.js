const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'orders.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadOrders() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; }
}
function saveOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

app.get('/api/orders', (req, res) => {
  const orders = loadOrders();
  const { date, result } = req.query;
  let filtered = [...orders];
  if (date) filtered = filtered.filter(o => o.date === date);
  if (result && result !== '全部') filtered = filtered.filter(o => o.result === result);
  filtered.sort((a, b) => b.id - a.id);
  res.json(filtered);
});

app.get('/api/stats', (req, res) => {
  const orders = loadOrders();
  const total = orders.length;
  const won = orders.filter(o => o.result === '中').length;
  const lost = orders.filter(o => o.result === '未中').length;
  const settled = won + lost;
  const winRate = settled > 0 ? (won / settled * 100).toFixed(1) : 0;
  let profit = 0;
  orders.forEach(o => {
    const payout = o.odds * o.amount;
    if (o.result === '中') profit += (payout - o.amount);
    else if (o.result === '未中') profit -= o.amount;
  });
  res.json({ total, won, lost, winRate: parseFloat(winRate), profit: parseFloat(profit.toFixed(2)) });
});

app.post('/api/orders', (req, res) => {
  const { date, home, away, play, option, odds, amount, result, author } = req.body;
  if (!date || !home || !away || !odds || !amount) {
    return res.status(400).json({ error: '请填写必填项' });
  }
  const orders = loadOrders();
  const order = {
    id: Date.now(),
    date, home, away, play: play || '胜平负',
    option: option || '',
    odds: parseFloat(odds.toFixed(2)),
    amount: parseFloat(amount.toFixed(2)),
    result: result || '待结算',
    author: author || '',
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  saveOrders(orders);
  res.json(order);
});

app.put('/api/orders/:id', (req, res) => {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: '订单不存在' });
  orders[idx].result = req.body.result;
  saveOrders(orders);
  res.json(orders[idx]);
});

app.delete('/api/orders/:id', (req, res) => {
  let orders = loadOrders();
  orders = orders.filter(o => o.id != req.params.id);
  saveOrders(orders);
  res.json({ ok: true });
});

app.delete('/api/orders', (req, res) => {
  saveOrders([]);
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚽ 竞彩足球服务运行中: http://0.0.0.0:${PORT}`);
});
