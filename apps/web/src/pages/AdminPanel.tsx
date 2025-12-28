import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface RoleAssignment {
  playerId: string;
  role: string;
}

interface Player {
  id: string;
  name: string;
  isAlive: boolean;
}

interface WolfMessage {
  playerName: string;
  content: string;
  timestamp: number;
}

export function AdminPanel() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<any>(null);
  const [wolfMessages, setWolfMessages] = useState<WolfMessage[]>([]);
  const [internalEvents, setInternalEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWolfChat, setShowWolfChat] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    if (roomId) {
      loadAdminData();
      const interval = setInterval(loadAdminData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [roomId]);

  const loadAdminData = async () => {
    try {
      // Fetch game state with role assignments
      const stateResponse = await fetch(`http://localhost:4000/api/admin/games/${roomId}/state`);
      const stateData = await stateResponse.json();
      
      if (stateData.success) {
        setGameState(stateData.gameState);
      }

      // Fetch wolf chat logs
      const wolfResponse = await fetch(`http://localhost:4000/api/admin/games/${roomId}/wolf-chat`);
      const wolfData = await wolfResponse.json();
      
      if (wolfData.success) {
        setWolfMessages(wolfData.wolfMessages);
      }

      // Fetch internal events
      const eventsResponse = await fetch(`http://localhost:4000/api/admin/games/${roomId}/private-actions`);
      const eventsData = await eventsResponse.json();
      
      if (eventsData.success) {
        setInternalEvents(eventsData.internalEvents);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading admin panel...</h2>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Game not found</h2>
        <button onClick={() => navigate('/')} className="primary">
          Go Home
        </button>
      </div>
    );
  }

  const roleAssignments = new Map<string, string>(gameState.roleAssignments || []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🔧 Admin Panel - Game {roomId}</h1>
        <button onClick={() => navigate('/')} className="secondary">
          Back to Home
        </button>
      </div>

      {/* Game State Overview */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Game State</h2>
        <p><strong>Phase:</strong> {gameState.phase}</p>
        <p><strong>Day Number:</strong> {gameState.dayNumber}</p>
        <p><strong>Alive Players:</strong> {gameState.alivePlayers?.length || 0}</p>
        {gameState.winner && <p><strong>Winner:</strong> {gameState.winner}</p>}
      </div>

      {/* Role Assignments */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>🎭 Role Assignments</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #444' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Player</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {gameState.players?.map((player: Player) => (
              <tr key={player.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '0.5rem' }}>{player.name}</td>
                <td style={{ padding: '0.5rem', color: '#6c63ff', fontWeight: 'bold' }}>
                  {roleAssignments.get(player.id) || 'Unknown'}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  {player.isAlive ? '✅ Alive' : '💀 Dead'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Wolf Chat Logs */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>🐺 Wolf Chat Logs ({wolfMessages.length})</h2>
          <button 
            onClick={() => setShowWolfChat(!showWolfChat)}
            className="secondary"
          >
            {showWolfChat ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showWolfChat && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem', background: '#1e1e2e', borderRadius: '8px' }}>
            {wolfMessages.length === 0 ? (
              <p style={{ color: '#aaa' }}>No wolf chat messages yet</p>
            ) : (
              wolfMessages.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                  <div style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                    {msg.playerName} <span style={{ color: '#666', fontSize: '0.8rem' }}>
                      ({new Date(msg.timestamp).toLocaleTimeString()})
                    </span>
                  </div>
                  <div>{msg.content}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Internal Events */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>📜 Internal Events ({internalEvents.length})</h2>
          <button 
            onClick={() => setShowEvents(!showEvents)}
            className="secondary"
          >
            {showEvents ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showEvents && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem', background: '#1e1e2e', borderRadius: '8px' }}>
            {internalEvents.length === 0 ? (
              <p style={{ color: '#aaa' }}>No internal events logged yet</p>
            ) : (
              internalEvents.map((event, idx) => (
                <div key={idx} style={{ marginBottom: '1rem', padding: '0.5rem', background: '#2a2a3e', borderRadius: '4px' }}>
                  <div style={{ color: '#6c63ff', fontWeight: 'bold' }}>
                    {event.eventType}
                  </div>
                  <pre style={{ fontSize: '0.8rem', color: '#aaa', margin: '0.5rem 0 0 0', overflow: 'auto' }}>
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
