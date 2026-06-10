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

const MATCHES_FILE = path.join(__dirname, 'matches.json');
function loadMatches() {
  try { return JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8')); } catch { return []; }
}
function saveMatches(matches) {
  fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
}

app.get('/api/matches', (req, res) => {
  res.json(loadMatches());
});

app.post('/api/matches', (req, res) => {
  const { name, league } = req.body;
  if (!name) return res.status(400).json({ error: '请输入比赛名称' });
  const matches = loadMatches();
  if (matches.find(m => m.name === name)) return res.status(400).json({ error: '比赛已存在' });
  const match = { name, league: league || '', createdAt: new Date().toISOString() };
  matches.push(match);
  saveMatches(matches);
  res.json(match);
});

app.delete('/api/matches/:name', (req, res) => {
  let matches = loadMatches();
  matches = matches.filter(m => m.name !== req.params.name);
  saveMatches(matches);
  res.json({ ok: true });
});

app.get('/api/orders', (req, res) => {
  const orders = loadOrders();
  const { author, result } = req.query;
  let filtered = [...orders];
  if (author) filtered = filtered.filter(o => o.author && o.author.includes(author));
  if (result && result !== '全部') filtered = filtered.filter(o => o.result === result);
  filtered.sort((a, b) => b.id - a.id);
  res.json(filtered);
});

app.get('/api/stats', (req, res) => {
  const orders = loadOrders();
  const { author, result } = req.query;
  let filtered = [...orders];
  if (author) filtered = filtered.filter(o => o.author && o.author.includes(author));
  if (result && result !== '全部') filtered = filtered.filter(o => o.result === result);
  const total = filtered.length;
  const won = filtered.filter(o => o.result === '中').length;
  const lost = filtered.filter(o => o.result === '未中').length;
  const settled = won + lost;
  const winRate = settled > 0 ? (won / settled * 100).toFixed(1) : 0;
  let profit = 0;
  filtered.forEach(o => {
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

const INSIDER_FILE = path.join(__dirname, 'insider.json');
function loadInsider() {
  try { return JSON.parse(fs.readFileSync(INSIDER_FILE, 'utf8')); } catch { return []; }
}
function saveInsider(msgs) {
  fs.writeFileSync(INSIDER_FILE, JSON.stringify(msgs, null, 2));
}

app.get('/api/insider', (req, res) => {
  const msgs = loadInsider();
  res.json(msgs.slice(-50).reverse());
});

app.post('/api/insider', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '请输入内容' });
  const msgs = loadInsider();
  const msg = {
    id: Date.now(),
    text,
    time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString()
  };
  msgs.push(msg);
  saveInsider(msgs);
  res.json(msg);
});

app.delete('/api/insider/:id', (req, res) => {
  let msgs = loadInsider();
  msgs = msgs.filter(m => m.id != req.params.id);
  saveInsider(msgs);
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚽ 竞彩足球服务运行中: http://0.0.0.0:${PORT}`);
});
