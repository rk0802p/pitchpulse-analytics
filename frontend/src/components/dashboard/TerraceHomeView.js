import React from 'react';
import { 
  Trophy, 
  Users, 
  Target, 
  Zap, 
  ArrowUpRight, 
  Compass, 
  TrendingUp, 
  Activity,
  Layers
} from 'lucide-react';
import SplitFlapScoreboard from '../common/SplitFlapScoreboard';
import ExpectedGoalsFigure from './ExpectedGoalsFigure';
import ShotMapFigure from './ShotMapFigure';
import LeagueTableAlmanac from '../leaderboards/LeagueTableAlmanac';
import StatCard from '../common/StatCard';

export const TerraceHomeView = ({
  metadata,
  topScorer,
  topAssister,
  topProgression,
  onNavigate,
  onSelectPlayer,
  onSelectTeam
}) => {
  return (
    <div className="space-y-12">
      {/* Editorial Introduction & Scoreboard Hero */}
      <section id="matchday-hero">
        <div className="border-b border-[var(--ink)] pb-2 mb-4 flex items-baseline justify-between">
          <span className="font-disp font-bold text-sm tracking-wider uppercase text-[var(--mute)]">
            Matchday Feature & Live Pulse
          </span>
          <span className="text-xs italic text-[var(--mute)]">
            Opta feed synced • 45+2’
          </span>
        </div>

        {/* Vintage Split Flap Scoreboard */}
        <div className="flex justify-center sm:justify-start">
          <SplitFlapScoreboard 
            homeTeam="ARSENAL"
            awayTeam="CHELSEA"
            homeScore={2}
            awayScore={1}
            matchStatus="SECOND HALF"
            matchMinute={74}
          />
        </div>

        <p className="italic text-sm text-[var(--mute)] max-w-2xl mt-3">
          74’ Last shot: Gabriel Martinelli, 0.41 xG, converted. The Gunners maintain an aggressive counter-pressing structure with 14 shots recorded in the box.
        </p>

        {/* Figures 1 & 2 (Expected Goals & Shot Map) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-start border-t border-[var(--rule)] pt-6">
          <ExpectedGoalsFigure 
            homeTeam="Arsenal"
            awayTeam="Chelsea"
          />
          <ShotMapFigure 
            homeTeam="Arsenal"
            awayTeam="Chelsea"
          />
        </div>
      </section>

      {/* KPI Almanac Strip: 4 Key Leaders & League Indicators */}
      <section id="key-indicators">
        <div className="border-t-2 border-[var(--ink)] pt-3 pb-2 flex items-baseline justify-between mb-4">
          <h2 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
            Key Figures of the Current Campaign
          </h2>
          <span className="text-xs italic text-[var(--mute)]">
            Verified FBref standard & advanced metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Leading Marksman"
            value={topScorer?.Gls ?? 18}
            subtext={topScorer ? `${topScorer.Player} (${topScorer.Squad || topScorer.Team})` : "Erling Haaland (Man City)"}
            delta={+2.4}
            deltaType="positive"
            sparklineData={[12, 14, 15, 15, 16, 17, 18]}
            onClick={() => topScorer && onSelectPlayer && onSelectPlayer(topScorer)}
          />

          <StatCard
            title="Chief Creator"
            value={topAssister?.Ast ?? 12}
            subtext={topAssister ? `${topAssister.Player} (${topAssister.Squad || topAssister.Team})` : "Bukayo Saka (Arsenal)"}
            delta={+1.1}
            deltaType="positive"
            sparklineData={[6, 8, 9, 9, 10, 11, 12]}
            onClick={() => topAssister && onSelectPlayer && onSelectPlayer(topAssister)}
          />

          <StatCard
            title="Progressive Carries"
            value={topProgression?.PrgC ?? 114}
            subtext={topProgression ? `${topProgression.Player} (${topProgression.Squad || topProgression.Team})` : "Jérémy Doku (Man City)"}
            delta={+18}
            deltaType="positive"
            sparklineData={[80, 85, 92, 98, 104, 114]}
            onClick={() => topProgression && onSelectPlayer && onSelectPlayer(topProgression)}
          />

          <StatCard
            title="Campaign Volume"
            value={metadata?.total_players ? metadata.total_players.toLocaleString() : "542"}
            subtext="Registered First-Team Players"
            delta={0}
            deltaType="neutral"
            sparklineData={[520, 525, 530, 538, 542]}
          />
        </div>
      </section>

      {/* Almanac Standings Table */}
      <section id="division-table">
        <LeagueTableAlmanac 
          onSelectTeam={onSelectTeam}
        />
      </section>

      {/* Editorial Methodology & Glossary Section */}
      <section id="glossary" className="border-t-2 border-[var(--ink)] pt-6">
        <h2 className="font-disp font-bold text-2xl text-[var(--ink)] tracking-tight mb-2">
          Methodology & How to Read the Ledger
        </h2>
        <p className="text-xs text-[var(--mute)] italic mb-6">
          Principles governing modern football statistical collection, spatial metrics, and probability models.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-ser">
          <div className="border-t border-[var(--rule)] pt-2">
            <dt className="font-bold italic text-[var(--ink)]">Expected Goals (xG)</dt>
            <dd className="text-xs text-[var(--mute)] mt-1 leading-relaxed">
              The historical probability (0.0 to 1.0) that a given shot results in a goal based on distance, angle, body part, assist type, and goalkeeper positioning. An unpressured penalty kick is rated at ~0.76 xG.
            </dd>
          </div>

          <div className="border-t border-[var(--rule)] pt-2">
            <dt className="font-bold italic text-[var(--ink)]">Expected Goal Difference (xGD)</dt>
            <dd className="text-xs text-[var(--mute)] mt-1 leading-relaxed">
              Expected goals scored minus expected goals conceded. It strips out finishing variance and goalkeeping streaks to provide a more reliable indicator of true underlying team quality.
            </dd>
          </div>

          <div className="border-t border-[var(--rule)] pt-2">
            <dt className="font-bold italic text-[var(--ink)]">Progressive Carries (PrgC)</dt>
            <dd className="text-xs text-[var(--mute)] mt-1 leading-relaxed">
              Continuous ball carries that move the ball at least 10 yards towards the opponent’s goal line, or any carry into the penalty area, excluding movements originating in the defensive 50%.
            </dd>
          </div>

          <div className="border-t border-[var(--rule)] pt-2">
            <dt className="font-bold italic text-[var(--ink)]">Progressive Passes (PrgP)</dt>
            <dd className="text-xs text-[var(--mute)] mt-1 leading-relaxed">
              Completed forward passes that advance the ball at least 10 yards toward the opponent goal or into the box, excluding passes originating from the defending 40% of the pitch.
            </dd>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TerraceHomeView;
