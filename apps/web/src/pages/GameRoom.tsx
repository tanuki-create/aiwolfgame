import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WolfChatPanel } from '../components/WolfChatPanel';

interface Player {
  id: string;
  name: string;
  isAlive: boolean;
}

interface Message {
  id: string;
  playerName: string;
  content: string;
  timestamp: number;
}

interface WolfChatMessage {
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
}

interface WolfMate {
  id: string;
  name: string;
}

export function GameRoom() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [phase, setPhase] = useState('LOBBY');
  const [dayNumber, setDayNumber] = useState(0);
  const [canStartGame, setCanStartGame] = useState(false);
  const [myRole, setMyRole] = useState<string>('');
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string>('');
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedNightTarget, setSelectedNightTarget] = useState<string>('');
  const [hasActed, setHasActed] = useState(false);
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState<number>(0);
  const [phaseDeadline, setPhaseDeadline] = useState<number>(0);
  const [wolfMessages, setWolfMessages] = useState<WolfChatMessage[]>([]);
  const [wolfMates, setWolfMates] = useState<WolfMate[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseDeadline > 0) {
        const remaining = Math.max(0, Math.floor((phaseDeadline - Date.now()) / 1000));
        setPhaseTimeRemaining(remaining);
      } else {
        setPhaseTimeRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseDeadline]);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });

      const data = await response.json();
      if (data.success) {
        setToken(data.token);
        setUserId(data.userId);
        setJoined(true);
        connectWebSocket(data.token);
      } else {
        alert(`Failed to join: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room');
    }
  };

  const connectWebSocket = (token: string) => {
    const websocket = new WebSocket(`ws://localhost:4000/ws?token=${token}`);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleServerEvent(data);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket closed');
    };

    setWs(websocket);
  };

  const handleServerEvent = (event: any) => {
    console.log('Received event:', event);

    switch (event.type) {
      case 'ROOM_STATE':
        // Update game state
        setPhase(event.payload.phase);
        setDayNumber(event.payload.dayNumber);
        setPlayers(event.payload.players);
        setPhaseDeadline(event.payload.phaseDeadline || 0); // Set deadline
        // Can start game if in LOBBY and we have players
        setCanStartGame(event.payload.phase === 'LOBBY' && event.payload.players.length > 0);
        break;

      case 'MESSAGE':
      case 'SYSTEM_MESSAGE':
        // Add new message
        setMessages(prev => [...prev, {
          id: event.payload.id || `sys_${Date.now()}`,
          playerName: event.payload.playerName || '🎮 Game Master',
          content: event.payload.content || event.payload.message,
          timestamp: event.payload.timestamp || event.timestamp,
        }]);
        break;

      case 'PHASE_CHANGE':
        setPhase(event.payload.phase);
        setDayNumber(event.payload.dayNumber || dayNumber);
        setPhaseDeadline(event.payload.phaseDeadline || 0); // Update deadline on phase change
        // Reset vote and action state on phase change
        setHasVoted(false);
        setSelectedVoteTarget('');
        setHasActed(false);
        setSelectedNightTarget('');
        // Add phase change message
        if (event.payload.message) {
          setMessages(prev => [...prev, {
            id: `phase_${Date.now()}`,
            playerName: '📢 System',
            content: event.payload.message,
            timestamp: event.timestamp || Date.now(),
          }]);
        }
        break;

      case 'ROLE_ASSIGNED':
        // Store role privately
        setMyRole(event.payload.role);
        setMessages(prev => [...prev, {
          id: `role_${Date.now()}`,
          playerName: '🎭 Role Assignment',
          content: event.payload.message,
          timestamp: event.timestamp || Date.now(),
        }]);
        break;

      case 'WOLF_CHAT_START':
        // Receive wolf pack information
        setWolfMates(event.payload.wolves);
        break;

      case 'WOLF_CHAT_MESSAGE':
        // Add wolf chat message
        setWolfMessages(prev => [...prev, {
          playerId: event.payload.playerId,
          playerName: event.payload.playerName,
          content: event.payload.content,
          timestamp: event.payload.timestamp,
        }]);
        break;

      case 'VOTE_RECORDED':
        setHasVoted(true);
        setMessages(prev => [...prev, {
          id: `vote_${Date.now()}`,
          playerName: '✅ System',
          content: 'Your vote has been recorded.',
          timestamp: event.timestamp || Date.now(),
        }]);
        break;

      case 'VOTE_RESULT':
        setMessages(prev => [...prev, {
          id: `voteresult_${Date.now()}`,
          playerName: '⚖️ Execution',
          content: event.payload.message,
          timestamp: event.timestamp || Date.now(),
        }]);
        break;

      case 'NIGHT_ACTION_RECORDED':
        setHasActed(true);
        setMessages(prev => [...prev, {
          id: `action_${Date.now()}`,
          playerName: '✅ System',
          content: event.payload.message,
          timestamp: event.timestamp || Date.now(),
        }]);
        break;

      case 'DIVINATION_RESULT':
      case 'MEDIUM_RESULT':
        setMessages(prev => [...prev, {
          id: `result_${Date.now()}`,
          playerName: '🔮 Result',
          content: event.payload.message,
          timestamp: event.timestamp || Date.now(),
        }]);
        break;

      case 'GAME_OVER':
        setMessages(prev => [...prev, {
          id: `gameover_${Date.now()}`,
          playerName: '🏆 Game Over',
          content: event.payload.message,
          timestamp: event.timestamp || Date.now(),
        }]);
        break;

      case 'ERROR':
        alert(event.payload.message);
        break;
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !ws) return;

    ws.send(JSON.stringify({
      type: 'SEND_MESSAGE',
      payload: {
        content: inputMessage,
      },
    }));

    setInputMessage('');
  };

  const sendWolfChatMessage = (content: string) => {
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'WOLF_CHAT_MESSAGE',
      payload: {
        content,
      },
    }));
  };

  const submitVote = () => {
    if (!selectedVoteTarget || !ws || hasVoted) return;

    ws.send(JSON.stringify({
      type: 'VOTE',
      payload: { targetId: selectedVoteTarget },
    }));
  };

  const submitNightAction = () => {
    if (!selectedNightTarget || !ws || hasActed || !myRole) return;

    const actionType = myRole === 'SEER' ? 'DIVINE' : myRole === 'KNIGHT' ? 'GUARD' : null;
    if (!actionType) return;

    ws.send(JSON.stringify({
      type: 'NIGHT_ACTION',
      payload: {
        actionType,
        targetId: selectedNightTarget,
      },
    }));
  };

  const handleStartGame = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!data.success) {
        alert(`Failed to start game: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game');
    }
  };

  if (!joined) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', marginTop: '4rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Join Game</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              style={{ width: '100%' }}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <button className="primary" onClick={handleJoin} style={{ width: '100%' }}>
            Join Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#2a2a3e', padding: '1rem 2rem', borderBottom: '2px solid #444' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>🐺 AI Werewolf Game</h2>
            <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
              Day {dayNumber} • {phase.replace(/_/g, ' ')}
              {myRole && <span style={{ marginLeft: '1rem', color: '#6c63ff', fontWeight: 'bold' }}>
                🎭 Your Role: {myRole}
              </span>}
              {phaseTimeRemaining > 0 && (
                <span style={{ 
                  marginLeft: '1rem', 
                  color: phaseTimeRemaining < 30 ? '#ff6b6b' : '#4ecdc4',
                  fontWeight: 'bold'
                }}>
                  ⏱️ {Math.floor(phaseTimeRemaining / 60)}:{String(phaseTimeRemaining % 60).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {canStartGame && phase === 'LOBBY' && (
              <button className="primary" onClick={handleStartGame}>
                Start Game
              </button>
            )}
            <button className="secondary" onClick={() => navigate('/')}>
              Leave Game
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Players Panel */}
        <div style={{ width: '250px', background: '#2a2a3e', borderRight: '2px solid #444', padding: '1rem', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>Players ({players.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map(player => (
              <div
                key={player.id}
                style={{
                  padding: '0.5rem',
                  background: player.isAlive ? '#3a3a5e' : '#444',
                  borderRadius: '6px',
                  opacity: player.isAlive ? 1 : 0.5,
                  border: player.isAlive ? '1px solid #6c63ff' : '1px solid #666',
                }}
              >
                <div style={{ 
                  fontWeight: 'bold',
                  textDecoration: player.isAlive ? 'none' : 'line-through',
                }}>
                  {player.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                  {player.isAlive ? '✅ Alive' : '💀 Dead'}
                </div>
              </div>
            ))}
          </div>

          {/* Voting Panel */}
          {phase === 'DAY_VOTE' && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#1e1e2e', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: '#6c63ff' }}>🗳️ Cast Your Vote</h4>
              <select
                value={selectedVoteTarget}
                onChange={(e) => setSelectedVoteTarget(e.target.value)}
                disabled={hasVoted}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  background: '#2a2a3e',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: 'white',
                }}
              >
                <option value="">Select player...</option>
                {players.filter(p => p.isAlive && p.id !== userId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                className="primary"
                onClick={submitVote}
                disabled={!selectedVoteTarget || hasVoted}
                style={{ width: '100%' }}
              >
                {hasVoted ? '✓ Voted' : 'Submit Vote'}
              </button>
            </div>
          )}

          {/* Night Action Panel */}
          {phase === 'NIGHT_ACTIONS' && (myRole === 'SEER' || myRole === 'KNIGHT') && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#1e1e2e', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: '#6c63ff' }}>
                {myRole === 'SEER' ? '🔮 Divine' : '🛡️ Protect'}
              </h4>
              <select
                value={selectedNightTarget}
                onChange={(e) => setSelectedNightTarget(e.target.value)}
                disabled={hasActed}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  background: '#2a2a3e',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: 'white',
                }}
              >
                <option value="">Select player...</option>
                {players.filter(p => p.isAlive && (myRole === 'SEER' || p.id !== userId)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                className="primary"
                onClick={submitNightAction}
                disabled={!selectedNightTarget || hasActed}
                style={{ width: '100%' }}
              >
                {hasActed ? '✓ Done' : 'Submit Action'}
              </button>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Wolf Chat Panel - Only visible to werewolves during NIGHT_WOLF_CHAT */}
          {myRole === 'WEREWOLF' && phase === 'NIGHT_WOLF_CHAT' && (
            <div style={{ padding: '1rem' }}>
              <WolfChatPanel
                wolfMessages={wolfMessages}
                wolfMates={wolfMates}
                onSendMessage={sendWolfChatMessage}
                myPlayerId={userId}
              />
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', marginTop: '2rem' }}>
                No messages yet. Start the discussion!
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#6c63ff' }}>
                    {msg.playerName}
                  </div>
                  <div>{msg.content}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '1rem', borderTop: '2px solid #444', background: '#2a2a3e' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                style={{ flex: 1 }}
              />
              <button className="primary" onClick={sendMessage}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

