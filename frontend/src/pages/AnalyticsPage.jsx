import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

function extractCode(input) {
  const value = input.trim();
  if (!value) {
    return '';
  }

  try {
    const parsed = new URL(value);
    return parsed.pathname.replace(/^\//, '');
  } catch (error) {
    return value;
  }
}

function AnalyticsPage() {
  const { shortCode: routeShortCode } = useParams();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatted = useMemo(
    () =>
      history.map((point) => ({
        ...point,
        label: new Date(point.hour).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit'
        })
      })),
    [history]
  );

  const fetchAnalytics = async (shortCode) => {
    if (!shortCode) {
      setError('Enter a short code or full short URL.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${baseUrl}/api/analytics/${shortCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setTotalClicks(data.total_clicks);
      setHistory(data.history || []);
    } catch (fetchError) {
      setError(fetchError.message);
      setTotalClicks(0);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetch = async (event) => {
    event.preventDefault();
    const shortCode = extractCode(input);

    await fetchAnalytics(shortCode);
  };

  useEffect(() => {
    if (!routeShortCode) {
      return;
    }

    setInput(routeShortCode);
    fetchAnalytics(routeShortCode);
  }, [routeShortCode]);

  return (
    <section className="card card-analytics">
      <h2>Hourly click analytics</h2>
      <p className="muted">Track click volume aggregated by hour from stream-processed events.</p>

      <form className="inline-form" onSubmit={handleFetch}>
        <input
          type="text"
          placeholder="Paste short code or full short URL"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Fetch analytics'}
        </button>
      </form>

      <p className="total-clicks">Total Clicks: {totalClicks}</p>
      {error && <p className="error-text">{error}</p>}

      <div data-testid="analytics-chart" className="chart-wrapper">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(33, 36, 59, 0.2)" />
            <XAxis dataKey="label" minTickGap={20} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#ee6c4d"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default AnalyticsPage;
