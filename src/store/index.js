import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ─── Notification helpers ────────────────────────────────────────────────────
let _notifId = 0;
export function mkNotif(type, title, msg, extra = {}) {
  return { id: ++_notifId, type, title, msg, ts: Date.now(), read: false, ...extra };
}

// ─── Main store ──────────────────────────────────────────────────────────────
export const useStore = create(
  subscribeWithSelector((set, get) => ({

    // ── Navigation ──────────────────────────────────────────────────────────
    activeTab: 'trade',   // 'trade' | 'portfolio' | 'notifications' | 'history'
    setActiveTab: (t) => set({ activeTab: t }),

    // ── Market ──────────────────────────────────────────────────────────────
    activeSymbol:   'BTCUSDT',
    activeCategory: 'spot',        // 'spot' | 'linear'
    setSymbol:      (s) => set({ activeSymbol: s, orderPrice: '' }),
    setCategory:    (c) => set({ activeCategory: c }),

    // ── Tickers map  symbol -> tickerObj ────────────────────────────────────
    tickers: {},
    setTicker: (symbol, data) =>
      set(s => ({ tickers: { ...s.tickers, [symbol]: { ...s.tickers[symbol], ...data } } })),

    // ── Orderbook ────────────────────────────────────────────────────────────
    orderbook: { a: [], b: [], ts: 0 },
    setOrderbook: (ob) => set({ orderbook: ob }),
    patchOrderbook: (delta) =>
      set(s => {
        const merge = (old, updates) => {
          const map = new Map(old.map(r => [r[0], r[1]]));
          updates.forEach(([p, q]) => { if (parseFloat(q) === 0) map.delete(p); else map.set(p, q); });
          return [...map.entries()].map(([p, q]) => [p, q]);
        };
        return {
          orderbook: {
            a: merge(s.orderbook.a, delta.a || []).sort((x, y) => parseFloat(x[0]) - parseFloat(y[0])),
            b: merge(s.orderbook.b, delta.b || []).sort((x, y) => parseFloat(y[0]) - parseFloat(x[0])),
            ts: delta.ts || s.orderbook.ts,
          },
        };
      }),

    // ── Account ──────────────────────────────────────────────────────────────
    walletCoins:  [],   // [{ coin, equity, availableToWithdraw, unrealisedPnl, ... }]
    totalEquity:  0,
    totalPnl:     0,
    setWallet: (coins, total, pnl) => set({ walletCoins: coins, totalEquity: total, totalPnl: pnl }),

    positions:    [],
    setPositions: (p) => set({ positions: p }),

    openOrders:   [],
    setOpenOrders:(o) => set({ openOrders: o }),

    orderHistory: [],
    setOrderHistory: (h) => set({ orderHistory: h }),

    // ── Order form ───────────────────────────────────────────────────────────
    orderSide:  'Buy',
    orderType:  'Limit',
    orderPrice: '',
    orderQty:   '',
    leverage:   10,
    tpEnabled:  false,
    slEnabled:  false,
    tpPrice:    '',
    slPrice:    '',
    setOrderSide:  (v) => set({ orderSide: v }),
    setOrderType:  (v) => set({ orderType: v }),
    setOrderPrice: (v) => set({ orderPrice: v }),
    setOrderQty:   (v) => set({ orderQty: v }),
    setLeverage:   (v) => set({ leverage: v }),
    setTpEnabled:  (v) => set({ tpEnabled: v }),
    setSlEnabled:  (v) => set({ slEnabled: v }),
    setTpPrice:    (v) => set({ tpPrice: v }),
    setSlPrice:    (v) => set({ slPrice: v }),

    // ── Notifications ────────────────────────────────────────────────────────
    notifications: [],
    unreadCount:   0,
    pushNotif: (n) =>
      set(s => ({
        notifications: [n, ...s.notifications].slice(0, 200),
        unreadCount:   s.unreadCount + 1,
      })),
    markAllRead: () =>
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      })),
    clearNotifs: () => set({ notifications: [], unreadCount: 0 }),
  }))
);

// ─── Granular selectors (prevent full re-render) ─────────────────────────────
export const selSymbol       = s => s.activeSymbol;
export const selCategory     = s => s.activeCategory;
export const selTicker       = symbol => s => s.tickers[symbol];
export const selOrderbook    = s => s.orderbook;
export const selWallet       = s => ({ coins: s.walletCoins, total: s.totalEquity, pnl: s.totalPnl });
export const selPositions    = s => s.positions;
export const selOpenOrders   = s => s.openOrders;
export const selOrderHistory = s => s.orderHistory;
export const selOrderForm    = s => ({
  side: s.orderSide, type: s.orderType, price: s.orderPrice,
  qty: s.orderQty, leverage: s.leverage,
  tpEnabled: s.tpEnabled, slEnabled: s.slEnabled, tpPrice: s.tpPrice, slPrice: s.slPrice,
});
export const selNotifs       = s => s.notifications;
export const selUnread       = s => s.unreadCount;
export const selActiveTab    = s => s.activeTab;
