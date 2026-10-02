import React, { useState } from 'react';
import { Trip, Bus } from '@college-bus/shared';
import {
  Navigation,
  Gauge,
  Clock3,
  CheckCircle2,
  CalendarDays,
  ChevronDown,
  Download,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface ReportsProps {
  trips?: Trip[];
  buses?: Bus[];
}

export const Reports: React.FC<ReportsProps> = ({ trips = [], buses = [] }) => {
  const [period, setPeriod] = useState('This week');

  const reportSeries =
    period === 'This month'
      ? [31, 36, 28, 41, 34, 39, 29]
      : period === 'This term'
      ? [38, 34, 42, 37, 44, 40, 46]
      : [26, 34, 29, 38, 31, 36, 23];

  const reportDays =
    period === 'This term'
      ? ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']
      : period === 'This month'
      ? ['1–4', '5–8', '9–12', '13–16', '17–20', '21–24', '25–30']
      : ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];

  const totalDistance = (buses.length * 48.6).toFixed(1);

  const exportCSV = () => {
    const headers = ['Metric', 'Value', 'Benchmark'];
    const rows = [
      ['"Distance covered"', `"${totalDistance} km"`, '"+8.6% vs previous"'],
      ['"Fleet utilization"', '"78%"', '"+3.1%"'],
      ['"Average trip time"', '"44 min"', '"-2 min"'],
      ['"On-time departures"', '"94.2%"', '"+4.2%"'],
    ];
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> PERFORMANCE OVERVIEW
          </span>
          <h1>
            Reports &amp; analytics<span className="headline-period">.</span>
          </h1>
          <p>See how the campus fleet is performing and where operational service can improve.</p>
        </div>
        <div className="report-actions">
          <label className="select-wrap">
            <CalendarDays size={14} />
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option>This week</option>
              <option>This month</option>
              <option>This term</option>
            </select>
            <ChevronDown size={13} />
          </label>
          <button className="button button-quiet" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. 4 KPI Metric Cards */}
      <div className="report-kpi-grid">
        <div className="panel report-kpi">
          <div className="report-kpi-icon green">
            <Navigation size={17} />
          </div>
          <small>Distance covered</small>
          <strong>{totalDistance} km</strong>
          <span>Across recorded campus trips</span>
          <i className="report-delta">
            <TrendingUp size={12} />
            +8.6% <small>vs. prev.</small>
          </i>
        </div>

        <div className="panel report-kpi">
          <div className="report-kpi-icon blue">
            <Gauge size={17} />
          </div>
          <small>Bus utilization</small>
          <strong>78%</strong>
          <span>Average passenger seat occupancy</span>
          <i className="report-delta">
            <TrendingUp size={12} />
            +3.1% <small>vs. prev.</small>
          </i>
        </div>

        <div className="panel report-kpi">
          <div className="report-kpi-icon violet">
            <Clock3 size={17} />
          </div>
          <small>Average trip time</small>
          <strong>44 min</strong>
          <span>Morning &amp; evening shift average</span>
          <i className="report-delta">
            <TrendingUp size={12} />
            −2 min <small>improved</small>
          </i>
        </div>

        <div className="panel report-kpi">
          <div className="report-kpi-icon amber">
            <CheckCircle2 size={17} />
          </div>
          <small>On-time departures</small>
          <strong>94.2%</strong>
          <span>Against scheduled corridor start</span>
          <i className="report-delta">
            <TrendingUp size={12} />
            +4.2% <small>vs. prev.</small>
          </i>
        </div>
      </div>

      {/* 3. Middle Visuals Grid: Bar Chart + Ring Chart */}
      <div className="reports-grid">
        <div className="panel report-chart-panel">
          <div className="panel-header">
            <div>
              <h2>Daily trip summary</h2>
              <p>{period} · completed routes by day</p>
            </div>
            <span className="chart-legend">
              <i /> Completed trips
            </span>
          </div>
          <div className="bar-chart">
            <div className="bar-y-labels">
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>
            <div className="bar-plot">
              {reportSeries.map((v, i) => (
                <div className="bar-day" key={i}>
                  <div className="bar-stack">
                    <i style={{ height: `${v * 2.1}px` }} />
                    <b style={{ height: `${(44 - v) * 1.2}px` }} />
                  </div>
                  <span>{reportDays[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel utilization-panel">
          <div className="panel-header">
            <div>
              <h2>Fleet utilization</h2>
              <p>Passenger capacity in active service</p>
            </div>
          </div>
          <div className="utilization-ring">
            <svg viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="54" className="ring-track" />
              <circle cx="70" cy="70" r="54" className="ring-progress" />
            </svg>
            <div>
              <strong>
                78<span>%</span>
              </strong>
              <small>avg. occupancy</small>
            </div>
          </div>
          <div className="utilization-legend">
            <span>
              <i className="legend-high" /> High utilization <strong>4 buses</strong>
            </span>
            <span>
              <i className="legend-mid" /> Balanced <strong>3 buses</strong>
            </span>
            <span>
              <i className="legend-low" /> Standby reserve <strong>2 buses</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Route Performance Table */}
      <div className="panel route-performance">
        <div className="panel-header">
          <div>
            <h2>Corridor performance</h2>
            <p>On-time arrivals and student commuter demand</p>
          </div>
          <button className="text-action" onClick={() => window.print()}>
            Print full report <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Trips this period</th>
                <th>On-time</th>
                <th>Avg. occupancy</th>
                <th>Distance</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'North Loop Express', trips: 18, onTime: 96, occ: 84, dist: '18.4 km', trend: '+4%' },
                { name: 'East Connector', trips: 16, onTime: 92, occ: 78, dist: '22.1 km', trend: '+2%' },
                { name: 'South Gate Corridor', trips: 14, onTime: 88, occ: 82, dist: '16.8 km', trend: '+1%' },
                { name: 'West Express', trips: 12, onTime: 94, occ: 76, dist: '25.6 km', trend: '+5%' },
                { name: 'Airport Road', trips: 8, onTime: 91, occ: 62, dist: '31.2 km', trend: '+3%' },
              ].map((r, i) => (
                <tr key={r.name}>
                  <td>
                    <span className="route-table-title">
                      <i className={`route-color-dot route-color-${i}`} />
                      {r.name}
                    </span>
                  </td>
                  <td>{r.trips}</td>
                  <td>
                    <div className="performance-cell">
                      <strong>{r.onTime}%</strong>
                      <span>
                        <i style={{ width: `${r.onTime}%` }} />
                      </span>
                    </div>
                  </td>
                  <td>{r.occ}%</td>
                  <td>{r.dist}</td>
                  <td>
                    <span className="chart-positive">
                      <TrendingUp size={13} />
                      {r.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
