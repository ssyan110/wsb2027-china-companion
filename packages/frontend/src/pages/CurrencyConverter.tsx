import { useEffect, useState, useCallback } from 'react';
import { getDb } from '../lib/db';
import type { ExchangeRateCache } from '@wsb/shared';

/** Pure conversion function exported for property testing. */
export function convertCurrency(amount: number, rate: number, direction: 'cny-to-usd' | 'usd-to-cny'): number {
  if (rate <= 0 || !Number.isFinite(rate)) return 0;
  if (!Number.isFinite(amount)) return 0;
  if (direction === 'cny-to-usd') {
    return amount / rate;
  }
  return amount * rate;
}

const FALLBACK_RATE = 7.25;
const RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

export default function CurrencyConverter() {
  const [rate, setRate] = useState<number>(FALLBACK_RATE);
  const [rateDate, setRateDate] = useState<string>('');
  const [cny, setCny] = useState<string>('');
  const [usd, setUsd] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadRate() {
      const db = await getDb();

      // Try cache first
      const cached = await db.get('exchangeRate', 'latest');
      if (cached && !cancelled) {
        setRate(cached.rate);
        setRateDate(cached.fetched_at);
      }

      // Check if cached rate is less than 24h old
      const isFresh = cached && (Date.now() - new Date(cached.fetched_at).getTime()) < 24 * 60 * 60 * 1000;
      if (isFresh) return;

      try {
        const res = await fetch(RATE_API_URL);
        if (res.ok) {
          const data = await res.json();
          const cnyRate = data?.rates?.CNY ?? FALLBACK_RATE;
          const now = new Date().toISOString();
          if (!cancelled) {
            setRate(cnyRate);
            setRateDate(now);
          }
          const cacheEntry: ExchangeRateCache = { rate: cnyRate, fetched_at: now };
          await db.put('exchangeRate', cacheEntry, 'latest');
        }
      } catch {
        // use cached or fallback
      }
    }

    loadRate();
    return () => { cancelled = true; };
  }, []);

  const handleCnyChange = useCallback((value: string) => {
    setCny(value);
    const num = parseFloat(value);
    if (value === '' || isNaN(num)) {
      setUsd('');
      return;
    }
    setUsd(convertCurrency(num, rate, 'cny-to-usd').toFixed(2));
  }, [rate]);

  const handleUsdChange = useCallback((value: string) => {
    setUsd(value);
    const num = parseFloat(value);
    if (value === '' || isNaN(num)) {
      setCny('');
      return;
    }
    setCny(convertCurrency(num, rate, 'usd-to-cny').toFixed(2));
  }, [rate]);

  return (
    <div className="currency-page" role="main" aria-label="Currency converter">
      <h1 className="currency-title">Currency Converter</h1>

      <div className="currency-fields">
        <div className="currency-field">
          <label htmlFor="cny-input" className="currency-label">CNY (¥)</label>
          <input
            id="cny-input"
            type="number"
            inputMode="decimal"
            className="currency-input"
            value={cny}
            onChange={(e) => handleCnyChange(e.target.value)}
            placeholder="0.00"
            aria-label="Amount in Chinese Yuan"
          />
        </div>

        <div className="currency-swap" aria-hidden="true">⇄</div>

        <div className="currency-field">
          <label htmlFor="usd-input" className="currency-label">USD ($)</label>
          <input
            id="usd-input"
            type="number"
            inputMode="decimal"
            className="currency-input"
            value={usd}
            onChange={(e) => handleUsdChange(e.target.value)}
            placeholder="0.00"
            aria-label="Amount in US Dollars"
          />
        </div>
      </div>

      <div className="currency-rate-info" aria-label="Exchange rate information">
        <p className="currency-rate">1 USD = {rate.toFixed(4)} CNY</p>
        {rateDate && (
          <p className="currency-rate-date">
            Rate updated: {new Date(rateDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
