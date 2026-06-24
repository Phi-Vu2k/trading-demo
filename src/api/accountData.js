import { getWalletBalance, getOpenOrders, getOrderHistory } from './binance';

export async function refreshAccountData(category, setters) {
  const [bal, spotOrders, linearOrders, histRes] = await Promise.all([
    getWalletBalance(),
    getOpenOrders('spot'),
    getOpenOrders('linear'),
    getOrderHistory(category === 'linear' ? 'linear' : 'spot', 100),
  ]);

  const list = bal?.result?.list?.[0];
  if (list) {
    setters.setWallet(
      list.coin || [],
      parseFloat(list.totalEquity || 0),
      parseFloat(list.totalPerpUPL || 0)
    );
  }

  setters.setOpenOrders([
    ...(spotOrders?.result?.list || []),
    ...(linearOrders?.result?.list || []),
  ]);
  setters.setOrderHistory(histRes?.result?.list || []);
}

