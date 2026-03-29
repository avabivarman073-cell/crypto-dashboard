export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20?: number;
  ma50?: number;
  rsi?: number;
}

export interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  timestamp: number;
  symbol: string;
}

export interface BotState {
  balance: number;
  position: number; // amount of asset held
  trades: Trade[];
  isRunning: boolean;
  strategy: 'MA_CROSSOVER' | 'RSI_OVERSOLD';
}
