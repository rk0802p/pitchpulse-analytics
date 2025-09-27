import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styled, { ThemeProvider } from 'styled-components';
import { themeConfig, defaultTheme } from './theme/themeConfig';
import GlobalStyles from './theme/GlobalStyles';
import PlayerProfile from './components/PlayerProfile';
import PlayerComparison from './components/PlayerComparison';
import LeagueLeaders from './components/LeagueLeaders';

const API_BASE_URL = 'http://localhost:5000';

// Styled Components for Data-Driven Sports Dashboard
const DashboardContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.modes[props.theme.mode].backgrounds.primary};
  transition: background-color 0.4s ease;
`;

const Header = styled.header`
  background: ${props => props.theme.modes[props.theme.mode].backgrounds.secondary};
  border-bottom: 2px solid ${props => 
    props.theme.league && props.theme.leagues[props.theme.league] 
      ? props.theme.leagues[props.theme.league].colors.primary 
      : props.theme.modes[props.theme.mode].borders.primary};
  padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
  box-shadow: ${props => props.theme.shadows.sm};
  transition: border-color 0.4s ease;
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.md};
`;

const Title = styled.h1`
  font-size: ${props => props.theme.typography.fontSize['3xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.theme.modes[props.theme.mode].text.primary};
  margin: 0;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.kpi.success}20;
  color: ${props => props.theme.kpi.success};
  border-radius: ${props => props.theme.borderRadius.lg};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const ThemeToggle = styled.button`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.modes[props.theme.mode].backgrounds.tertiary};
  color: ${props => props.theme.modes[props.theme.mode].text.primary};
  border: 1px solid ${props => props.theme.modes[props.theme.mode].borders.primary};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  
  &:hover {
    background: ${props => props.theme.modes[props.theme.mode].backgrounds.primary};
  }
`;

const NavButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  flex-wrap: wrap;
`;

const NavButton = styled.button`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  background: ${props => props.theme.kpi.highlight};
  color: white;
  border-radius: ${props => props.theme.borderRadius.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  transition: all ${props => props.theme.transitions.base};
  
  &:hover {
    background: ${props => props.theme.kpi.success};
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};
`;

const Section = styled.section`
  margin-bottom: ${props => props.theme.spacing['2xl']};
`;

const SectionTitle = styled.h2`
  font-size: ${props => props.theme.typography.fontSize['2xl']};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.modes[props.theme.mode].text.primary};
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
`;

const LeaguesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const LeagueCard = styled.div`
  background: ${props => props.theme.modes[props.theme.mode].backgrounds.secondary};
  border: 2px solid ${props => props.selected ? 
    props.theme.leagues[props.leagueKey]?.colors.primary || props.theme.kpi.highlight : 
    props.theme.modes[props.theme.mode].borders.primary};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.base};
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
    border-color: ${props => props.theme.leagues[props.leagueKey]?.colors.primary || props.theme.kpi.highlight};
  }
  
  ${props => props.selected && `
    background: ${props.theme.leagues[props.leagueKey]?.colors.primary || props.theme.kpi.highlight}10;
    box-shadow: ${props.theme.shadows.md};
  `}
`;

const LeagueTitle = styled.h3`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.modes[props.theme.mode].text.primary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const SelectedIndicator = styled.div`
  position: absolute;
  top: ${props => props.theme.spacing.md};
  right: ${props => props.theme.spacing.md};
  background: ${props => props.theme.kpi.success};
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const TeamsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const TeamCard = styled.div`
  background: ${props => props.theme.modes[props.theme.mode].backgrounds.secondary};
  border: 1px solid ${props => props.selected ? 
    props.theme.kpi.highlight : 
    props.theme.modes[props.theme.mode].borders.primary};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.base};
  text-align: center;
  
  &:hover {
    border-color: ${props => props.theme.kpi.highlight};
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  ${props => props.selected && `
    background: ${props.theme.kpi.highlight}10;
    border-color: ${props.theme.kpi.highlight};
  `}
`;

const PlayersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${props => props.theme.spacing.lg};
`;

const PlayerCard = styled.div`
  background: ${props => props.theme.modes[props.theme.mode].backgrounds.secondary};
  border: 1px solid ${props => props.theme.modes[props.theme.mode].borders.primary};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.base};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
    border-color: ${props => props.theme.kpi.highlight};
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const PlayerName = styled.h4`
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.modes[props.theme.mode].text.primary};
  margin: 0;
`;

const PlayerPosition = styled.span`
  background: ${props => props.theme.kpi.highlight}20;
  color: ${props => props.theme.kpi.highlight};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const PlayerStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.modes[props.theme.mode].text.secondary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.modes[props.theme.mode].text.primary};
`;

const KPIStat = styled(StatValue)`
  color: ${props => props.theme.kpi.highlight};
  font-size: ${props => props.theme.typography.fontSize.lg};
`;

const AnalyzeButton = styled.button`
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background: ${props => props.theme.modes[props.theme.mode].backgrounds.tertiary};
  color: ${props => props.theme.modes[props.theme.mode].text.primary};
  border: 1px solid ${props => props.theme.modes[props.theme.mode].borders.primary};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  
  &:hover {
    background: ${props => props.theme.kpi.highlight};
    color: white;
    border-color: ${props => props.theme.kpi.highlight};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: ${props => props.theme.spacing.md};
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.theme.modes[props.theme.mode].borders.primary};
  border-top: 3px solid ${props => props.theme.kpi.highlight};
  border-radius: 50%;
  animation: spin 1s linear infinite;
`;

const ErrorContainer = styled.div`
  background: ${props => props.theme.kpi.error}10;
  border: 1px solid ${props => props.theme.kpi.error};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.xl};
  text-align: center;
`;

const ErrorTitle = styled.h2`
  color: ${props => props.theme.kpi.error};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const RefreshButton = styled.button`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  background: ${props => props.theme.kpi.error};
  color: white;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-top: ${props => props.theme.spacing.md};
  
  &:hover {
    background: ${props => props.theme.kpi.error}dd;
  }
`;

function App() {
  // Theme state
  const [themeMode, setThemeMode] = useState(defaultTheme.mode);

  // Data states
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerComparison, setShowPlayerComparison] = useState(false);
  const [showLeagueLeaders, setShowLeagueLeaders] = useState(false);

  // Theme toggle function
  const toggleTheme = useCallback(() => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Get league key for theme colors
  const getLeagueKey = useCallback((leagueName) => {
    const leagueMap = {
      'Premier League': 'premier-league',
      'La Liga': 'la-liga',
      'Serie A': 'serie-a',
      'Bundesliga': 'bundesliga'
    };
    return leagueMap[leagueName] || 'premier-league';
  }, []);

  // Create the theme object that matches what styled components expect
  const currentTheme = {
    mode: themeMode,
    league: selectedLeague ? getLeagueKey(selectedLeague) : null,
    ...themeConfig
  };

  // Load initial data (API status and leagues)
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check API status
        await axios.get(`${API_BASE_URL}/api/`);

        // Load leagues
        const leaguesResponse = await axios.get(`${API_BASE_URL}/api/leagues`);
        
        if (leaguesResponse.data.error) {
          setError(`Backend Error: ${leaguesResponse.data.message || leaguesResponse.data.error}`);
          return;
        }

        setLeagues(leaguesResponse.data);
        console.log('Loaded leagues:', leaguesResponse.data);

      } catch (err) {
        console.error('Initialization error:', err);
        setError(`Failed to initialize: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load teams when league is selected
  useEffect(() => {
    const loadTeams = async () => {
      if (!selectedLeague) {
        setTeams([]);
        setSelectedTeam('');
        setPlayers([]);
        return;
      }

      setLoadingTeams(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/teams/${encodeURIComponent(selectedLeague)}`);
        setTeams(response.data);
        setSelectedTeam(''); // Reset team selection
        setPlayers([]); // Reset players
        console.log(`Loaded teams for ${selectedLeague}:`, response.data);
      } catch (err) {
        console.error('Error loading teams:', err);
        setError(`Failed to load teams for ${selectedLeague}: ${err.message}`);
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeams();
  }, [selectedLeague]);

  // Load players when team is selected
  useEffect(() => {
    const loadPlayers = async () => {
      if (!selectedLeague || !selectedTeam) {
        setPlayers([]);
        return;
      }

      setLoadingPlayers(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/players/${encodeURIComponent(selectedLeague)}/${encodeURIComponent(selectedTeam)}`
        );
        setPlayers(response.data);
        console.log(`Loaded players for ${selectedTeam}:`, response.data);
      } catch (err) {
        console.error('Error loading players:', err);
        setError(`Failed to load players for ${selectedTeam}: ${err.message}`);
      } finally {
        setLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [selectedLeague, selectedTeam]);

  // Handler functions
  const handlePlayerClick = useCallback((player) => {
    setSelectedPlayer(player);
  }, []);

  const closePlayerProfile = useCallback(() => {
    setSelectedPlayer(null);
  }, []);

  const handleShowPlayerComparison = useCallback(() => {
    setShowPlayerComparison(true);
  }, []);

  const closePlayerComparison = useCallback(() => {
    setShowPlayerComparison(false);
  }, []);

  const handleShowLeagueLeaders = useCallback(() => {
    setShowLeagueLeaders(true);
  }, []);

  const closeLeagueLeaders = useCallback(() => {
    setShowLeagueLeaders(false);
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={currentTheme}>
        <GlobalStyles />
        <DashboardContainer>
          <Header>
            <HeaderContent>
              <Title>⚽ Sports Analytics Dashboard</Title>
              <StatusBadge>🔄 Loading...</StatusBadge>
            </HeaderContent>
          </Header>
          <MainContent>
            <LoadingContainer>
              <Spinner />
              <h2>Initializing Application...</h2>
            </LoadingContainer>
          </MainContent>
        </DashboardContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyles />
      <DashboardContainer>
        <Header>
          <HeaderContent>
            <Title>⚽ Sports Analytics Dashboard</Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <StatusBadge>
                ✅ API Connected
              </StatusBadge>
              <ThemeToggle onClick={toggleTheme}>
                {themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </ThemeToggle>
            </div>
          </HeaderContent>
          <NavButtons>
            <NavButton onClick={handleShowPlayerComparison}>
              🔍 Compare Players
            </NavButton>
            <NavButton onClick={handleShowLeagueLeaders}>
              🏆 League Leaders
            </NavButton>
          </NavButtons>
        </Header>
        
        <MainContent>
          {error && (
            <ErrorContainer>
              <ErrorTitle>⚠️ Connection Error</ErrorTitle>
              <p>{error}</p>
              <RefreshButton onClick={() => window.location.reload()}>
                🔄 Refresh Application
              </RefreshButton>
            </ErrorContainer>
          )}

          {/* League Selection */}
          <Section>
            <SectionTitle>
              🏆 Select League
            </SectionTitle>
            <LeaguesGrid>
              {leagues.map(league => {
                const leagueKey = getLeagueKey(league);
                return (
                  <LeagueCard 
                    key={league}
                    leagueKey={leagueKey}
                    selected={selectedLeague === league}
                    onClick={() => setSelectedLeague(league)}
                  >
                    <LeagueTitle>{league}</LeagueTitle>
                    {selectedLeague === league && (
                      <SelectedIndicator>✓ Selected</SelectedIndicator>
                    )}
                  </LeagueCard>
                );
              })}
            </LeaguesGrid>
          </Section>

          {/* Team Selection */}
          {selectedLeague && (
            <Section>
              <SectionTitle>
                🏟️ Teams in {selectedLeague}
              </SectionTitle>
              {loadingTeams ? (
                <LoadingContainer>
                  <Spinner />
                  <span>Loading teams...</span>
                </LoadingContainer>
              ) : (
                <TeamsGrid>
                  {teams.map(team => (
                    <TeamCard 
                      key={team}
                      selected={selectedTeam === team}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <h4>{team}</h4>
                      {selectedTeam === team && (
                        <SelectedIndicator>✓</SelectedIndicator>
                      )}
                    </TeamCard>
                  ))}
                </TeamsGrid>
              )}
            </Section>
          )}

          {/* Players Display */}
          {selectedLeague && selectedTeam && (
            <Section>
              <SectionTitle>
                👥 {selectedTeam} Squad
              </SectionTitle>
              {loadingPlayers ? (
                <LoadingContainer>
                  <Spinner />
                  <span>Loading players...</span>
                </LoadingContainer>
              ) : (
                <PlayersGrid>
                  {players.map((player, index) => (
                    <PlayerCard 
                      key={player.Rk || index}
                      onClick={() => handlePlayerClick(player)}
                    >
                      <PlayerHeader>
                        <PlayerName>{player.Player || 'Unknown Player'}</PlayerName>
                        <PlayerPosition>{player.Pos || 'N/A'}</PlayerPosition>
                      </PlayerHeader>
                      
                      <PlayerStats>
                        <StatItem>
                          <StatLabel>Age</StatLabel>
                          <StatValue>{player.Age || 'N/A'}</StatValue>
                        </StatItem>
                        <StatItem>
                          <StatLabel>Nation</StatLabel>
                          <StatValue>{player.Nation || 'N/A'}</StatValue>
                        </StatItem>
                        <StatItem>
                          <StatLabel>Matches</StatLabel>
                          <StatValue>{player.MP || '0'}</StatValue>
                        </StatItem>
                        <StatItem>
                          <StatLabel>Minutes</StatLabel>
                          <StatValue>{player.Min || '0'}</StatValue>
                        </StatItem>
                        {(player.Gls !== undefined || player.Ast !== undefined) && (
                          <>
                            <StatItem>
                              <StatLabel>Goals</StatLabel>
                              <KPIStat>{player.Gls || '0'}</KPIStat>
                            </StatItem>
                            <StatItem>
                              <StatLabel>Assists</StatLabel>
                              <KPIStat>{player.Ast || '0'}</KPIStat>
                            </StatItem>
                          </>
                        )}
                      </PlayerStats>
                      
                      <AnalyzeButton>
                        📊 View Analytics
                      </AnalyzeButton>
                    </PlayerCard>
                  ))}
                </PlayersGrid>
              )}
            </Section>
          )}
        </MainContent>

        {/* Modals */}
        {selectedPlayer && (
          <PlayerProfile 
            player={selectedPlayer} 
            onClose={closePlayerProfile} 
          />
        )}
        
        {showPlayerComparison && (
          <PlayerComparison 
            onClose={closePlayerComparison} 
          />
        )}
        
        {showLeagueLeaders && (
          <LeagueLeaders 
            onClose={closeLeagueLeaders} 
          />
        )}
      </DashboardContainer>
    </ThemeProvider>
  );
}

export default App;
