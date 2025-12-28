import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PACKS = ['FOX', 'FREEMASON', 'HUNTER', 'FANATIC', 'WHITE_WOLF'];

interface ProgressState {
  step: string;
  current: number;
  total: number;
  message: string;
}

export function RoomCreate() {
  const navigate = useNavigate();
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [randomStart, setRandomStart] = useState(false);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  const togglePack = (pack: string) => {
    setSelectedPacks(prev =>
      prev.includes(pack) ? prev.filter(p => p !== pack) : [...prev, pack]
    );
  };

  const handleCreate = async () => {
    setCreating(true);
    setProgress({ step: 'initializing', current: 0, total: 10, message: 'Initializing game...' });
    
    try {
      const response = await fetch('http://localhost:4000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numPlayers: 11,
          numAI: 10,
          packs: randomStart ? [] : selectedPacks,
          randomStart,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProgress({ step: 'complete', current: 10, total: 10, message: 'Game created successfully!' });
        setTimeout(() => {
          navigate(`/room/${data.roomId}`);
        }, 500);
      } else {
        alert(`Failed to create room: ${data.error}`);
        setCreating(false);
        setProgress(null);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Make sure the server is running.');
      setCreating(false);
      setProgress(null);
    }
  };

  // Simulate progress updates (in real implementation, this would come from WebSocket)
  useEffect(() => {
    if (!creating || !progress) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (!prev || prev.current >= prev.total) return prev;
        
        const newCurrent = prev.current + 1;
        const messages = [
          'Setting up game room...',
          'Generating AI personas (1/10)...',
          'Generating AI personas (3/10)...',
          'Generating AI personas (5/10)...',
          'Generating AI personas (7/10)...',
          'Generating AI personas (9/10)...',
          'Generating AI personas (10/10)...',
          'Assigning roles...',
          'Initializing game state...',
          'Finalizing...',
        ];
        
        return {
          ...prev,
          current: newCurrent,
          message: messages[newCurrent - 1] || 'Processing...',
        };
      });
    }, 800);

    return () => clearInterval(interval);
  }, [creating, progress]);

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <button className="secondary" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Create New Game</h1>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Game Settings</h3>
          <div style={{ color: '#aaa' }}>
            <div>Players: 11 (1 Human + 10 AI)</div>
            <div>Base Roles: Werewolf×2, Seer, Medium, Madman, Knight, Villager×5</div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <input
              type="checkbox"
              id="randomStart"
              checked={randomStart}
              onChange={(e) => setRandomStart(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            <label htmlFor="randomStart">Random Start (Auto-select packs)</label>
          </div>
        </div>

        {!randomStart && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Role Expansion Packs</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Select role packs to add special roles to the game
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {PACKS.map(pack => (
                <label
                  key={pack}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: selectedPacks.includes(pack) ? '#3a3a5e' : '#2a2a3e',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: selectedPacks.includes(pack) ? '2px solid #6c63ff' : '2px solid transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPacks.includes(pack)}
                    onChange={() => togglePack(pack)}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{pack}</div>
                    <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                      {getPackDescription(pack)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          className="primary"
          onClick={handleCreate}
          disabled={creating}
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
        >
          {creating ? 'Creating...' : 'Create Game'}
        </button>

        {/* Progress Indicator */}
        {creating && progress && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#2a2a3e', borderRadius: '8px' }}>
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#6c63ff', marginBottom: '0.5rem' }}>
                {progress.message}
              </div>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                {progress.current} / {progress.total}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              background: '#1a1a2e',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(progress.current / progress.total) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6c63ff 0%, #a855f7 100%)',
                transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Loading Animation */}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #333',
                borderTop: '4px solid #6c63ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function getPackDescription(pack: string): string {
  const descriptions: Record<string, string> = {
    FOX: 'Third-party faction that wins if alive at game end',
    FREEMASON: 'Two villagers who know each other\'s identity',
    HUNTER: 'Takes one random player when killed',
    FANATIC: 'Madman who appears as werewolf to seer',
    WHITE_WOLF: 'Werewolf who appears as human to seer',
  };
  return descriptions[pack] || '';
}

