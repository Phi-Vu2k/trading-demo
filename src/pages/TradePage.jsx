import React from 'react';
import { Box } from '@mui/material';
import TradingChart from '../components/chart/TradingChart';
import Orderbook from '../components/trading/Orderbook';
import OrderForm from '../components/trading/OrderForm';
import SymbolList from '../components/trading/SymbolList';
import PositionsPanel from '../components/trading/PositionsPanel';

export default function TradePage() {
  return (
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
  );
}