import React from 'react';
import { Box } from '@mui/material';
import Portfolio from '../components/portfolio/Portfolio';

export default function PortfolioPage() {
  return (
    <Box sx={{ flex: 1, overflow: 'hidden' }}>
      <Portfolio />
    </Box>
  );
}