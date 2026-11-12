import re

# 1. Update PercentileTable.js
with open('frontend/src/components/profile/PercentileTable.js', 'r', encoding='utf-8') as f:
    pt_content = f.read()

pt_target = """export default function PercentileTable({
  percentilesData = [], // [{ metric, label, value, percentile, group }]
  poolDescription = 'Compared against Big 5 positional peers (min 270 minutes)',
  sampleSize = 749,
  position = 'FW'
}) {"""

pt_replacement = """export default function PercentileTable({
  percentilesData = [], // [{ metric, label, value, percentile, group }]
  poolDescription = 'Compared against Big 5 positional peers (min 270 minutes)',
  sampleSize = 749,
  position = 'FW'
}) {
  if (!percentilesData || percentilesData.length === 0) {
    return (
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-5 rounded-xs space-y-4 font-ser">
        <div className="border-b border-[var(--ink)] pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <h3 className="font-disp font-bold text-xl sm:text-2xl text-[var(--ink)]">
              Positional Percentile Benchmark
            </h3>
            <p className="text-xs italic text-[var(--mute)] mt-0.5">
              {poolDescription}
            </p>
          </div>
          <div className="text-xs font-mono text-[var(--mute)] bg-[var(--panel)] px-2.5 py-1 border border-[var(--rule)]">
            Pool: {sampleSize} {position}s
          </div>
        </div>
        <p className="text-xs italic text-[var(--mute)] py-4 text-center">
          No percentile benchmarks available for this selection or playing time threshold.
        </p>
      </div>
    );
  }"""

if pt_target in pt_content:
    pt_content = pt_content.replace(pt_target, pt_replacement, 1)
    with open('frontend/src/components/profile/PercentileTable.js', 'w', encoding='utf-8') as f:
        f.write(pt_content)
    print("PercentileTable.js updated successfully")
else:
    print("WARNING: pt_target not found in PercentileTable.js")

# 2. Update PlayerProfileView.js
with open('frontend/src/components/profile/PlayerProfileView.js', 'r', encoding='utf-8') as f:
    pp_content = f.read()

# Props update
pp_target_props = """export const PlayerProfileView = ({
  player,
  onBack,
  onCompare,
  activeSeason = "2024-2025"
}) => {"""

pp_repl_props = """export const PlayerProfileView = ({
  player,
  onBack,
  onCompare,
  onSelectPlayer,
  activeSeason = "2024-2025"
}) => {"""

pp_content = pp_content.replace(pp_target_props, pp_repl_props, 1)

# Empty state update
empty_target = """  if (!player && !profileData && loading) {
    return (
      <div className="py-24 text-center border border-[var(--rule)] bg-[var(--paper)] animate-pulse">
        <span className="font-disp font-bold text-xl text-[var(--ink)]">Retrieving Player Folio...</span>
      </div>
    );
  }"""

empty_repl = """  if (!player && !profileData) {
    if (loading) {
      return (
        <div className="py-24 text-center border border-[var(--rule)] bg-[var(--paper)] animate-pulse">
          <span className="font-disp font-bold text-xl text-[var(--ink)]">Retrieving Player Folio...</span>
        </div>
      );
    }
    return (
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-12 text-center text-sm font-ser space-y-4">
        <h2 className="font-disp font-bold text-2xl text-[var(--ink)]">No Player Selected</h2>
        <p className="text-xs text-[var(--mute)] italic max-w-md mx-auto">
          Please select a player from the Player Explorer, Scatter Plots, or Leaderboards to inspect their full analytical profile.
        </p>
        <button
          onClick={onBack}
          className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-4 py-2 text-xs font-disp font-bold uppercase tracking-wider hover:opacity-90 inline-block cursor-pointer"
        >
          Return to Player Ledger
        </button>
      </div>
    );
  }"""

pp_content = pp_content.replace(empty_target, empty_repl, 1)

# Remove hardcoded fake percentiles (85, 82, 74, 78, 88, 70)
percentile_target = """  // Fallback percentiles data if dedicated endpoint not yet populated
  const defaultPercentilesData = [
    { metric: 'Gls_90', label: 'Goals / 90', group: 'Scoring', value: per90.goals_per_90, percentile: profileData?.percentiles?.goals_per_90?.percentile ?? 85 },
    { metric: 'xG_90', label: 'Expected Goals / 90', group: 'Scoring', value: per90.xg_per_90, percentile: profileData?.percentiles?.xg_per_90?.percentile ?? 82 },
    { metric: 'Ast_90', label: 'Assists / 90', group: 'Creating', value: per90.assists_per_90, percentile: profileData?.percentiles?.assists_per_90?.percentile ?? 74 },
    { metric: 'xAG_90', label: 'Expected Assisted Goals / 90', group: 'Creating', value: per90.xag_per_90, percentile: profileData?.percentiles?.xag_per_90?.percentile ?? 78 },
    { metric: 'PrgC_90', label: 'Progressive Carries / 90', group: 'Progressing', value: (totals.progressive_carries / (totals.nineties || 1)), percentile: profileData?.percentiles?.progressive_carries?.percentile ?? 88 },
    { metric: 'PrgP_90', label: 'Progressive Passes / 90', group: 'Progressing', value: (totals.progressive_passes / (totals.nineties || 1)), percentile: profileData?.percentiles?.progressive_passes?.percentile ?? 70 }
  ];

  const resolvedPercentiles = percentilesList.length > 0 ? percentilesList : defaultPercentilesData;"""

percentile_repl = """  // Verified percentiles data from dedicated endpoint or profileData
  const resolvedPercentiles = percentilesList.length > 0
    ? percentilesList
    : (profileData?.percentiles
      ? [
          { metric: 'Gls_90', label: 'Goals / 90', group: 'Scoring', value: per90.goals_per_90, percentile: profileData.percentiles.goals_per_90?.percentile },
          { metric: 'xG_90', label: 'Expected Goals / 90', group: 'Scoring', value: per90.xg_per_90, percentile: profileData.percentiles.xg_per_90?.percentile },
          { metric: 'Ast_90', label: 'Assists / 90', group: 'Creating', value: per90.assists_per_90, percentile: profileData.percentiles.assists_per_90?.percentile },
          { metric: 'xAG_90', label: 'Expected Assisted Goals / 90', group: 'Creating', value: per90.xag_per_90, percentile: profileData.percentiles.xag_per_90?.percentile },
          { metric: 'PrgC_90', label: 'Progressive Carries / 90', group: 'Progressing', value: (totals.progressive_carries / (totals.nineties || 1)), percentile: profileData.percentiles.progressive_carries?.percentile },
          { metric: 'PrgP_90', label: 'Progressive Passes / 90', group: 'Progressing', value: (totals.progressive_passes / (totals.nineties || 1)), percentile: profileData.percentiles.progressive_passes?.percentile }
        ].filter(p => p.percentile !== undefined && p.percentile !== null)
      : []);"""

pp_content = pp_content.replace(percentile_target, percentile_repl, 1)

# SimilarPlayers onSelectPlayer call
similar_target = """          onSelectPlayer={(pId) => {
            window.location.hash = `#profile/${encodeURIComponent(pId)}`;
          }}"""

similar_repl = """          onSelectPlayer={(target) => {
            if (onSelectPlayer) {
              onSelectPlayer(target);
            } else {
              const targetId = typeof target === 'object' ? (target.id || target.record_id || target.Player || target.name) : target;
              if (targetId && targetId !== 'undefined' && targetId !== 'null') {
                window.location.hash = `#profile/${encodeURIComponent(targetId)}`;
              }
            }
          }}"""

pp_content = pp_content.replace(similar_target, similar_repl, 1)

with open('frontend/src/components/profile/PlayerProfileView.js', 'w', encoding='utf-8') as f:
    f.write(pp_content)
print("PlayerProfileView.js updated successfully")

# 3. Update App.js
with open('frontend/src/App.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

app_hash_target = """      if (['dashboard', 'explorer', 'plots', 'leaderboards', 'compare', 'browse', 'profile', 'data'].includes(tab)) {
        setCurrentTab(tab);
      }
      if (tab === 'profile') {
        const rawParam = parts[1] ? decodeURIComponent(parts[1]).trim() : '';
        if (!rawParam || rawParam === 'undefined' || rawParam === 'null') {
          window.location.hash = '#explorer';
          return;
        }
        api.getPlayers({ season: activeSeason, search: rawParam, limit: 1 })
          .then(res => {
            const p = res?.data?.[0] || res?.[0];
            if (p) {
              setSelectedPlayer(p);
            } else {
              api.getPlayer(rawParam, activeSeason)
                .then(pRes => {
                  const iden = pRes?.data?.identity || pRes?.identity;
                  if (iden) {
                    setSelectedPlayer({
                      id: iden.id,
                      Player: iden.name,
                      Squad: iden.squad,
                      Comp: iden.competition,
                      Pos: iden.position,
                      Age: iden.age,
                      Min: iden.minutes
                    });
                  }
                }).catch(() => {});
            }
          }).catch(() => {});
      }"""

app_hash_repl = """      if (tab === 'profile') {
        const rawParam = parts[1] ? decodeURIComponent(parts[1]).trim() : '';
        if (!rawParam || rawParam === 'undefined' || rawParam === 'null') {
          setCurrentTab('explorer');
          window.location.hash = '#explorer';
          return;
        }
        setCurrentTab('profile');
        api.getPlayers({ season: activeSeason, search: rawParam, limit: 1 })
          .then(res => {
            const p = res?.data?.[0] || res?.[0];
            if (p) {
              setSelectedPlayer(p);
            } else {
              api.getPlayer(rawParam, activeSeason)
                .then(pRes => {
                  const iden = pRes?.data?.identity || pRes?.identity;
                  if (iden) {
                    setSelectedPlayer({
                      id: iden.id,
                      Player: iden.name,
                      Squad: iden.squad,
                      Comp: iden.competition,
                      Pos: iden.position,
                      Age: iden.age,
                      Min: iden.minutes
                    });
                  } else {
                    setCurrentTab('explorer');
                    window.location.hash = '#explorer';
                  }
                }).catch(() => {
                  setCurrentTab('explorer');
                  window.location.hash = '#explorer';
                });
            }
          }).catch(() => {
            setCurrentTab('explorer');
            window.location.hash = '#explorer';
          });
      } else if (['dashboard', 'explorer', 'plots', 'leaderboards', 'compare', 'browse', 'data'].includes(tab)) {
        setCurrentTab(tab);
      }"""

app_profile_view_target = """      {/* 6. Player Dossier / Profile */}
      {currentTab === 'profile' && (
        <PlayerProfileView
          player={selectedPlayer}
          onBack={() => {
            setCurrentTab('explorer');
            window.location.hash = '#explorer';
          }}
          onCompare={handleAddToCompare}
          activeSeason={activeSeason}
        />
      )}"""

app_profile_view_repl = """      {/* 6. Player Dossier / Profile */}
      {currentTab === 'profile' && (
        <PlayerProfileView
          player={selectedPlayer}
          onBack={() => {
            setCurrentTab('explorer');
            window.location.hash = '#explorer';
          }}
          onCompare={handleAddToCompare}
          onSelectPlayer={handleSelectPlayer}
          activeSeason={activeSeason}
        />
      )}"""

app_content = app_content.replace(app_hash_target, app_hash_repl, 1)
app_content = app_content.replace(app_profile_view_target, app_profile_view_repl, 1)

with open('frontend/src/App.js', 'w', encoding='utf-8') as f:
    f.write(app_content)
print("App.js updated successfully")
