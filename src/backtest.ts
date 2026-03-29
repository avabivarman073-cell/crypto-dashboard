import { Candle, Trade, BotState } from "./types";

export function runBacktest(
  data: Candle[],
  initialBalance: number,
  strategy: 'MA_CROSSOVER' | 'RSI_OVERSOLD'
): BotState {
  let balance = initialBalance;
  let position = 0;
  const trades: Trade[] = [];

  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];

    if (strategy === 'MA_CROSSOVER') {
      if (!isNaN(current.ma20!) && !isNaN(current.ma50!) && !isNaN(prev.ma20!) && !isNaN(prev.ma50!)) {
        // Buy: MA20 crosses above MA50
        if (prev.ma20! <= prev.ma50! && current.ma20! > current.ma50! && balance > 0) {
          position = balance / current.close;
          balance = 0;
          trades.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'BUY',
            price: current.close,
            amount: position,
            timestamp: current.time,
            symbol: 'BTCUSDT'
          });
        }
        // Sell: MA20 crosses below MA50
        else if (prev.ma20! >= prev.ma50! && current.ma20! < current.ma50! && position > 0) {
          balance = position * current.close;
          trades.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'SELL',
            price: current.close,
            amount: position,
            timestamp: current.time,
            symbol: 'BTCUSDT'
          });
          position = 0;
        }
      }
    } else if (strategy === 'RSI_OVERSOLD') {
      if (!isNaN(current.rsi!)) {
        // Buy: RSI < 30
        if (current.rsi! < 30 && balance > 0) {
          position = balance / current.close;
          balance = 0;
          trades.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'BUY',
            price: current.close,
            amount: position,
            timestamp: current.time,
            symbol: 'BTCUSDT'
          });
        }
        // Sell: RSI > 70
        else if (current.rsi! > 70 && position > 0) {
          balance = position * current.close;
          trades.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'SELL',
            price: current.close,
            amount: position,
            timestamp: current.time,
            symbol: 'BTCUSDT'
          });
          position = 0;
        }
      }
    }
  }

  return {
    balance,
    position,
    trades,
    isRunning: false,
    strategy
  };
}
