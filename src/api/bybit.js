import axios from 'axios';
import CryptoJS from 'crypto-js';

// export const API_KEY    = 'kULcEEQXooyEVWnV7G';
// export const API_SECRET = 'LztbaxVcJV473AxFjKOueVWoMEaSZE3TbyqZ';
// export const BASE_URL   = 'https://api-testnet.bybit.com';
export const API_KEY    = 'W1HJzsI4bhG7v8n5H7';
export const API_SECRET = 'PJORg2B6BRYK1zXAkZqsSioMJypg7va1qzHi';
export const BASE_URL   = 'https://api.bybit.com';

const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });
const RECV_WINDOW = '20000';
const TIME_SYNC_TTL = 30000;

let serverTimeOffset = 0;
let lastTimeSync = 0;
let timeSyncPromise = null;

function sign(payload, ts, recvWindow = RECV_WINDOW) {
  return CryptoJS.HmacSHA256(`${ts}${API_KEY}${recvWindow}${payload}`, API_SECRET).toString();
}

async function syncServerTime(force = false) {
  const now = Date.now();
  if (!force && lastTimeSync && now - lastTimeSync < TIME_SYNC_TTL) return;
  if (timeSyncPromise) return timeSyncPromise;

  timeSyncPromise = client.get('/v5/market/time')
    .then(({ data }) => {
      const result = data?.result || {};
      const serverTime =
        Number(result.timeNano ? Math.floor(Number(result.timeNano) / 1e6) : 0) ||
        Number(result.timeSecond ? Number(result.timeSecond) * 1000 : 0) ||
        Number(data?.time || 0);

      if (serverTime) {
        serverTimeOffset = serverTime - Date.now();
        lastTimeSync = Date.now();
      }
    })
    .finally(() => {
      timeSyncPromise = null;
    });

  return timeSyncPromise;
}

async function authTimestamp() {
  await syncServerTime();
  return String(Date.now() + serverTimeOffset);
}

async function privateGet(path, params = {}, retry = true) {
  const ts = await authTimestamp();
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  const { data } = await client.get(path, {
    params,
    headers: {
      'X-BAPI-API-KEY': API_KEY,
      'X-BAPI-SIGN': sign(qs, ts),
      'X-BAPI-TIMESTAMP': ts,
      'X-BAPI-RECV-WINDOW': RECV_WINDOW,
    },
  });
  if (retry && data?.retCode === 10002) {
    await syncServerTime(true);
    return privateGet(path, params, false);
  }
  return data;
}

async function privatePost(path, body = {}, retry = true) {
  const ts = await authTimestamp();
  const bodyStr = JSON.stringify(body);
  const { data } = await client.post(path, body, {
    headers: {
      'X-BAPI-API-KEY': API_KEY,
      'X-BAPI-SIGN': sign(bodyStr, ts),
      'X-BAPI-TIMESTAMP': ts,
      'X-BAPI-RECV-WINDOW': RECV_WINDOW,
      'Content-Type': 'application/json',
    },
  });
  if (retry && data?.retCode === 10002) {
    await syncServerTime(true);
    return privatePost(path, body, false);
  }
  return data;
}

// ─── Public ─────────────────────────────────────────────────────────────────
export const getKline = (symbol, interval = '15', limit = 300, category = 'spot') =>
  client.get('/v5/market/kline', { params: { category, symbol, interval, limit } }).then(r => r.data);

export const getAllTickers = (category = 'spot') =>
  client.get('/v5/market/tickers', { params: { category } }).then(r => r.data);

export const getTicker = (symbol, category = 'spot') =>
  client.get('/v5/market/tickers', { params: { category, symbol } }).then(r => r.data);

// ─── Private ─────────────────────────────────────────────────────────────────
export const getWalletBalance  = (accountType = 'UNIFIED') => privateGet('/v5/account/wallet-balance', { accountType });
export const getPositions      = (category = 'linear', settleCoin = 'USDT') => privateGet('/v5/position/list', { category, settleCoin });
export const getOpenOrders     = (category = 'spot', symbol = '') => privateGet('/v5/order/realtime', { category, ...(symbol && { symbol }) });
export const getOrderHistory   = (category = 'spot', limit = 100) => privateGet('/v5/order/history', { category, limit });
export const getTradeHistory   = (category = 'spot', limit = 100) => privateGet('/v5/execution/list', { category, limit });
export const placeOrder        = (params) => privatePost('/v5/order/create', params);
export const cancelOrder       = (category, symbol, orderId) => privatePost('/v5/order/cancel', { category, symbol, orderId });
export const setLeverage       = (symbol, buyLev, sellLev) => privatePost('/v5/position/set-leverage', { category: 'linear', symbol, buyLeverage: String(buyLev), sellLeverage: String(sellLev) });
