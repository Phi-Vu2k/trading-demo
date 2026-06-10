import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, Box, CssBaseline } from '@mui/material';
import Header from './components/layout/Header';
import TradePage from './pages/TradePage';
import PortfolioPage from './pages/PortfolioPage';
import NotificationsPage from './pages/NotificationsPage';
import NotifSnackbar from './components/notifications/NotifSnackbar';
import { useStore } from './store';
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
        <Routes>
          <Route path="/" element={<TradePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
        <NotifSnackbar />
      </Box>
    </ThemeProvider>
  );
}