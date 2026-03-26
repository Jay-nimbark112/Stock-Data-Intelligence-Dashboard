import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './App.css';

// Using 127.0.0.1 is more reliable for Docker-to-Browser communication on Windows
const API_BASE = "http://127.0.0.1:5000";

function App() {
  const [selected, setSelected] = useState("WIPRO.NS");
  const [companies, setCompanies] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({});
  const [insights, setInsights] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial load for companies and market insights
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [compRes, insRes] = await Promise.all([
          axios.get(`${API_BASE}/companies`),
          axios.get(`${API_BASE}/insights`)
        ]);
        setCompanies(compRes.data.companies);
        setInsights(insRes.data);
      } catch (err) {
        setError("Could not connect to the backend. Ensure Docker is running.");
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch specific stock data when selection or timeframe changes
  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      try {
        const [dataRes, sumRes] = await Promise.all([
          axios.get(`${API_BASE}/data/${selected}?days=${days}`),
          axios.get(`${API_BASE}/summary/${selected}`)
        ]);
        setChartData(dataRes.data.history);
        setSummary(sumRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching stock details", err);
        setLoading(false);
      }
    };
    fetchStockData();
  }, [selected, days]);

  if (error) return <div className="error-screen">{error}</div>;

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2 style={{color: '#10b981', letterSpacing: '2px'}}>STOCKLY</h2>
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
            <p style={{color: '#6ee7b7', fontWeight: 'bold'}}>MARKET PULSE</p>
            <div className="pulse-item gainer">
              ↑ {insights.top_gainer.symbol} (+{insights.top_gainer.change}%)
            </div>
            <div className="pulse-item loser">
              ↓ {insights.top_loser.symbol} ({insights.top_loser.change}%)
            </div>
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="header-section">
          <h1>{selected.split('.')[0]} Dashboard</h1>
          <p>Real-time Machine Learning Analysis</p>
        </div>

        <div className="filter-group">
          <button className={`filter-btn ${days === 30 ? 'active' : ''}`} onClick={() => setDays(30)}>30 Days</button>
          <button className={`filter-btn ${days === 90 ? 'active' : ''}`} onClick={() => setDays(90)}>90 Days</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <small>LIVE PRICE</small>
            <div className="stat-value">₹{summary.current_price || '---'}</div>
          </div>
          <div className="stat-card">
            <small>VOLATILITY</small>
            <div className="stat-value highlight">{summary.volatility || '0'}%</div>
          </div>
          <div className="stat-card">
            <small>MARKET CORR.</small>
            <div className="stat-value secondary">{summary.market_correlation || '0.0'}</div>
          </div>
        </div>

        <div className="chart-box">
          {loading ? (
            <div className="loader">Analyzing Market Trends...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="Date" stroke="#6ee7b7" fontSize={10} tickFormatter={(str) => str.split(' ')[0]} />
                <YAxis stroke="#6ee7b7" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{background: '#061612', border: '1px solid #10b981', color: '#fff'}} />
                <Legend verticalAlign="top" height={36}/>
                <Line name="Actual Price" type="monotone" dataKey="Close" stroke="#10b981" strokeWidth={3} dot={false} animationDuration={1000} />
                <Line name="7-Day Moving Avg" type="monotone" dataKey="MA_7" stroke="#6366f1" strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;