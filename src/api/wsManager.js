import CryptoJS from 'crypto-js';
import { API_KEY, API_SECRET } from './bybit';

const WS_PUBLIC_SPOT    = 'wss://stream-testnet.bybit.com/v5/public/spot';
const WS_PUBLIC_LINEAR  = 'wss://stream-testnet.bybit.com/v5/public/linear';
const WS_PRIVATE        = 'wss://stream-testnet.bybit.com/v5/private';

function wsSign() {
  const expires = Date.now() + 5000;
  const sig = CryptoJS.HmacSHA256(`GET/realtime${expires}`, API_SECRET).toString();
  return { op: 'auth', args: [API_KEY, expires, sig] };
}

class WSManager {
  constructor() {
    this._sockets   = {};   // key -> WebSocket
    this._handlers  = {};   // topic -> Set of callbacks
    this._pingTimers = {};
    this._reconnectTimers = {};
    this._subscriptions = {}; // wsKey -> Set of topics
  }

  _wsKey(category) {
    if (category === 'linear') return 'linear';
    if (category === 'private') return 'private';
    return 'spot';
  }

  _url(key) {
    if (key === 'linear')  return WS_PUBLIC_LINEAR;
    if (key === 'private') return WS_PRIVATE;
    return WS_PUBLIC_SPOT;
  }

  _getOrCreate(key) {
    if (this._sockets[key]?.readyState === WebSocket.OPEN) return this._sockets[key];
    if (this._sockets[key]?.readyState === WebSocket.CONNECTING) return this._sockets[key];

    const ws = new WebSocket(this._url(key));
    this._sockets[key] = ws;
    this._subscriptions[key] = this._subscriptions[key] || new Set();

    ws.onopen = () => {
      if (key === 'private') {
        ws.send(JSON.stringify(wsSign()));
      }
      // Re-subscribe all pending topics
      const topics = [...this._subscriptions[key]];
      if (topics.length) {
        ws.send(JSON.stringify({ op: 'subscribe', args: topics }));
      }
      // Ping every 20s
      this._pingTimers[key] = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 'ping' }));
      }, 20000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (!msg.topic) return;
        const handlers = this._handlers[msg.topic];
        if (handlers) handlers.forEach(fn => fn(msg.data, msg));
      } catch {}
    };

    ws.onclose = () => {
      clearInterval(this._pingTimers[key]);
      // Reconnect after 2s
      this._reconnectTimers[key] = setTimeout(() => {
        delete this._sockets[key];
        this._getOrCreate(key);
      }, 2000);
    };

    ws.onerror = () => ws.close();
    return ws;
  }

  subscribe(category, topic, callback) {
    const key = this._wsKey(category);
    if (!this._handlers[topic]) this._handlers[topic] = new Set();
    this._handlers[topic].add(callback);

    const ws = this._getOrCreate(key);
    if (!this._subscriptions[key]) this._subscriptions[key] = new Set();
    this._subscriptions[key].add(topic);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: 'subscribe', args: [topic] }));
    }

    return () => this.unsubscribe(category, topic, callback);
  }

  unsubscribe(category, topic, callback) {
    const key = this._wsKey(category);
    this._handlers[topic]?.delete(callback);
    if (!this._handlers[topic]?.size) {
      delete this._handlers[topic];
      this._subscriptions[key]?.delete(topic);
      const ws = this._sockets[key];
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ op: 'unsubscribe', args: [topic] }));
      }
    }
  }

  closeAll() {
    Object.values(this._sockets).forEach(ws => ws.close());
    Object.values(this._pingTimers).forEach(clearInterval);
    Object.values(this._reconnectTimers).forEach(clearTimeout);
    this._sockets = {};
    this._handlers = {};
    this._subscriptions = {};
  }
}

export const wsManager = new WSManager();

// ─── Convenience subscribe helpers ──────────────────────────────────────────

/** Orderbook depth25 */
export function subOrderbook(symbol, category, cb) {
  const topic = `orderbook.25.${symbol}`;
  return wsManager.subscribe(category, topic, cb);
}

/** Individual ticker */
export function subTicker(symbol, category, cb) {
  const topic = `tickers.${symbol}`;
  return wsManager.subscribe(category, topic, cb);
}

/** Kline / candlestick */
export function subKline(symbol, interval, category, cb) {
  const topic = `kline.${interval}.${symbol}`;
  return wsManager.subscribe(category, topic, cb);
}

/** Private: wallet, orders, positions */
export function subPrivate(topic, cb) {
  return wsManager.subscribe('private', topic, cb);
}
