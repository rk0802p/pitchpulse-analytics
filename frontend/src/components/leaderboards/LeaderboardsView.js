import React, { useState, useEffect } from 'react';
import DataTable from '../common/DataTable';
import api from '../../services/api';

export const LeaderboardsView = ({
  activeSeason = "2024-2025",
  onSelectPlayer
}) => {
  const [activeTab, setActiveTab] = useState("Gls"); // Gls, Ast, xG, PrgC, PrgP
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: "Gls", label: "Goals (Gls)" },
    { id: "Ast", label: "Assists (Ast)" },
    { id: "xG", label: "Expected Goals (xG)" },
    { id: "PrgC", label: "Prog. Carries (PrgC)" },
    { id: "PrgP", label: "Prog. Passes (PrgP)" }
  ];

  useEffect(() => {
    setLoading(true);
    api.getPlayers({
      season: activeSeason,
      sort_by: activeTab,
      order: 'desc',
      limit: 20
    })
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setLeaders(res.data);
        } else if (Array.isArray(res)) {
          setLeaders(res);
        } else {
          setLeaders([]);
        }
      })
      .catch(err => {
        console.error("Error fetching leaders:", err);
        setLeaders([]);
      })
      .finally(() => setLoading(false));
  }, [activeSeason, activeTab]);

  const columns = [
    {
      key: "Player",
      label: "Player Name",
      render: (val, row) => (
        <div>
          <span className="font-semibold text-[var(--ink)]">{val}</span>
          <span className="text-[11px] text-[var(--mute)] ml-2">{row.Squad || row.Team} • {row.Pos}</span>
        </div>
      )
    },
    { key: "Pos", label: "Position" },
    { key: "Squad", label: "Club" },
    { key: "90s", label: "90s" },
    { key: "Gls", label: "Gls" },
    { key: "xG", label: "xG" },
    { key: "Ast", label: "Ast" },
    { key: "xAG", label: "xAG" },
    { key: "PrgC", label: "PrgC" },
    { key: "PrgP", label: "PrgP" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-[var(--ink)] pb-3">
        <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none">
          League Leaderboards & Statistical Ranks
        </h2>
        <p className="text-xs italic text-[var(--mute)] mt-1">
          Top performers across attacking production, creative vision, and ball progression in Vol. {activeSeason}.
        </p>

        {/* Tab Selection */}
        <div className="flex gap-2 sm:gap-4 mt-4 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-disp font-bold text-sm sm:text-base px-3 py-1 border transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                  : 'border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={leaders}
        loading={loading}
        title={`Top 20 • ${tabs.find(t => t.id === activeTab)?.label}`}
        subtitle="Ranked in descending order by primary category"
        onRowClick={onSelectPlayer}
        sortBy={activeTab}
        sortOrder="desc"
      />
    </div>
  );
};

export default LeaderboardsView;
