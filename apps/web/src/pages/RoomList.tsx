import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Room {
  roomId: string;
  status: string;
}

export function RoomList() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/rooms');
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms.map((id: string) => ({ roomId: id, status: 'active' })));
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🐺 AI Werewolf Game</h1>
        <p style={{ color: '#aaa' }}>Play Werewolf with AI players powered by DeepSeek-V3</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button className="primary" onClick={() => navigate('/create')}>
          Create New Game
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Active Games</h2>
        
        {loading ? (
          <p>Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p style={{ color: '#aaa' }}>No active games. Create one to get started!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rooms.map((room) => (
              <div
                key={room.roomId}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{room.roomId}</div>
                  <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Status: {room.status}</div>
                </div>
                <button
                  className="secondary"
                  onClick={() => navigate(`/room/${room.roomId}`)}
                >
                  Join Game
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

