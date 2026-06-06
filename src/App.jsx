import React, { useEffect } from 'react';
import { ThemeProvider, createTheme, Box, CssBaseline } from '@mui/material';
import Header from './components/layout/Header';
import TradingChart from './components/chart/TradingChart';
import Orderbook from './components/trading/Orderbook';
import OrderForm from './components/trading/OrderForm';
import SymbolList from './components/trading/SymbolList';
import PositionsPanel from './components/trading/PositionsPanel';
import Portfolio from './components/portfolio/Portfolio';
import NotificationsPage from './components/notifications/NotificationsPage';
import { useStore, selActiveTab } from './store';
import { useTickerWS, usePrivateData } from './hooks/useBinanceWS';
import { getOrderHistory } from './api/binance';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#f7a600' },
    background: { default: '#06060f', paper: '#0a0a18' },
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#06060f' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});

export default function App() {
  const activeTab    = useStore(selActiveTab);
  const symbol       = useStore(s => s.activeSymbol);
  const category     = useStore(s => s.activeCategory);
  const setOrderHistory = useStore(s => s.setOrderHistory);

  // Keep active symbol ticker live at all times
  useTickerWS(symbol, category);

  // Private data (wallet, positions, orders) via WS
  usePrivateData();

  // Load order history once (no WS for history)
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await getOrderHistory(category === 'linear' ? 'linear' : 'spot', 100);
        setOrderHistory(res?.result?.list || []);
      } catch {}
    }
    loadHistory();
  }, [category]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', bgcolor: '#06060f' }}>
        <Header />

        {/* Trade view */}
        {activeTab === 'trade' && (
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '1px', bgcolor: '#0e0e1e' }}>
            {/* Sidebar */}
            <Box sx={{ width: 195, flexShrink: 0, bgcolor: '#06060f', overflow: 'hidden' }}>
              <SymbolList />
            </Box>

            {/* Center column */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden', bgcolor: '#0e0e1e' }}>
              <Box sx={{ flex: '0 0 62%', overflow: 'hidden', bgcolor: '#06060f' }}>
                <TradingChart />
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: '#06060f', minHeight: 0 }}>
                <PositionsPanel />
              </Box>
            </Box>

            {/* Right column */}
            <Box sx={{ width: 275, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1px', bgcolor: '#0e0e1e' }}>
              <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: '#06060f', minHeight: 0 }}>
                <Orderbook />
              </Box>
              <Box sx={{ flexShrink: 0, height: 440, bgcolor: '#06060f', overflow: 'hidden' }}>
                <OrderForm />
              </Box>
            </Box>
          </Box>
        )}

        {activeTab === 'portfolio' && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Portfolio />
          </Box>
        )}

        {activeTab === 'notifications' && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <NotificationsPage />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
