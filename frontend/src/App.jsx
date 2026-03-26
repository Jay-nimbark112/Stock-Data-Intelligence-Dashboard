import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './App.css';

// ✅ FIX: Use deployed backend (Render)
// 👉 fallback to env variable for flexibility
const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://stock-data-intelligence-dashboard-1-mf9y.onrender.com";

function App() {
  const [selected, setSelected] = useState("WIPRO.NS");
  const [companies, setCompanies] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({});
  const [insights, setInsights] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch companies + insights
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [compRes, insRes] = await Promise.all([
          axios.get(`${API_BASE}/companies`),
          axios.get(`${API_BASE}/insights`)
        ]);

        setCompanies(compRes.data.companies || []);
        setInsights(insRes.data);
      } catch (err) {
        setError("⚠️ Cannot connect to backend (check deployment)");
        console.error(err);
      }
    };

    fetchInitialData();
  }, []);

  // ✅ Fetch stock data
  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);

      try {
        const [dataRes, sumRes] = await Promise.all([
          axios.get(`${API_BASE}/data/${selected}?days=${days}`),
          axios.get(`${API_BASE}/summary/${selected}`)
        ]);

        setChartData(dataRes.data.history || []);
        setSummary(sumRes.data || {});
      } catch (err) {
        console.error("Stock fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [selected, days]);

  if (error) return <div className="error-screen">{error}</div>;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <h2 style={{ color: '#10b981', letterSpacing: '2px' }}>STOCKLY</h2>

        <div className="nav-list">
          {companies.map(c => (
            <button
              key={c.symbol}
              className={`nav-btn ${selected === c.symbol ? 'active' : ''}`}
              onClick={() => setSelected(c.symbol)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {insights && (
          <div className="market-pulse">
            <p style={{ color: '#6ee7b7', fontWeight: 'bold' }}>MARKET PULSE</p>

            <div className="pulse-item gainer">
              ↑ {insights.top_gainer?.symbol} (+{insights.top_gainer?.change}%)
            </div>

            <div className="pulse-item loser">
              ↓ {insights.top_loser?.symbol} ({insights.top_loser?.change}%)
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="main-content">
        <div className="header-section">
          <h1>{selected.split('.')[0]} Dashboard</h1>
          <p>Real-time Machine Learning Analysis</p>
        </div>

        {/* Filters */}
        <div className="filter-group">
          <button
            className={`filter-btn ${days === 30 ? 'active' : ''}`}
            onClick={() => setDays(30)}
          >
            30 Days
          </button>

          <button
            className={`filter-btn ${days === 90 ? 'active' : ''}`}
            onClick={() => setDays(90)}
          >
            90 Days
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <small>LIVE PRICE</small>
            <div className="stat-value">
              ₹{summary.current_price || '---'}
            </div>
          </div>

          <div className="stat-card">
            <small>VOLATILITY</small>
            <div className="stat-value highlight">
              {summary.volatility || '0'}%
            </div>
          </div>

          <div className="stat-card">
            <small>MARKET CORR.</small>
            <div className="stat-value secondary">
              {summary.market_correlation || '0.0'}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="chart-box">
          {loading ? (
            <div className="loader">Analyzing Market Trends...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                
                <XAxis
                  dataKey="Date"
                  stroke="#6ee7b7"
                  fontSize={10}
                />

                <YAxis
                  stroke="#6ee7b7"
                  fontSize={10}
                  domain={['auto', 'auto']}
                />

                <Tooltip
                  contentStyle={{
                    background: '#061612',
                    border: '1px solid #10b981',
                    color: '#fff'
                  }}
                />

                <Legend />

                <Line
                  name="Actual Price"
                  type="monotone"
                  dataKey="Close"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />

                <Line
                  name="7-Day Moving Avg"
                  type="monotone"
                  dataKey="MA_7"
                  stroke="#6366f1"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;