import React, { useState, useEffect, useRef } from 'react';

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

interface WolfChatPanelProps {
  wolfMessages: WolfChatMessage[];
  wolfMates: WolfMate[];
  onSendMessage: (content: string) => void;
  myPlayerId: string;
}

export function WolfChatPanel({ wolfMessages, wolfMates, onSendMessage, myPlayerId }: WolfChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [wolfMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="wolf-chat-panel">
      <div className="wolf-chat-header">
        <h3>🐺 Werewolf Secret Chat</h3>
        <div className="wolf-mates">
          <span>Pack: </span>
          {wolfMates.map((mate, idx) => (
            <span key={mate.id} className="wolf-mate">
              {mate.name}
              {idx < wolfMates.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="wolf-chat-messages">
        {wolfMessages.map((msg, idx) => (
          <div 
            key={`${msg.timestamp}-${idx}`} 
            className={`wolf-message ${msg.playerId === myPlayerId ? 'own-message' : 'other-message'}`}
          >
            <div className="wolf-message-header">
              <span className="wolf-message-author">{msg.playerName}</span>
              <span className="wolf-message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="wolf-message-content">{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="wolf-chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Discuss strategy with your pack..."
          className="wolf-chat-input"
        />
        <button type="submit" className="wolf-chat-send-btn">
          Send
        </button>
      </form>

      <style>{`
        .wolf-chat-panel {
          background: linear-gradient(135deg, #2d1b4e 0%, #1a0f2e 100%);
          border: 2px solid #8b5cf6;
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .wolf-chat-header {
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #8b5cf6;
        }

        .wolf-chat-header h3 {
          margin: 0 0 8px 0;
          color: #a78bfa;
          font-size: 18px;
        }

        .wolf-mates {
          font-size: 14px;
          color: #c4b5fd;
        }

        .wolf-mate {
          color: #e9d5ff;
          font-weight: 500;
        }

        .wolf-chat-messages {
          height: 300px;
          overflow-y: auto;
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .wolf-message {
          margin-bottom: 12px;
          padding: 10px;
          border-radius: 8px;
        }

        .wolf-message.own-message {
          background: rgba(139, 92, 246, 0.3);
          margin-left: 20px;
        }

        .wolf-message.other-message {
          background: rgba(167, 139, 250, 0.2);
          margin-right: 20px;
        }

        .wolf-message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .wolf-message-author {
          color: #e9d5ff;
          font-weight: 600;
        }

        .wolf-message-time {
          color: #c4b5fd;
        }

        .wolf-message-content {
          color: #f3e8ff;
          line-height: 1.5;
        }

        .wolf-chat-input-form {
          display: flex;
          gap: 8px;
        }

        .wolf-chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #8b5cf6;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          color: #f3e8ff;
          font-size: 14px;
        }

        .wolf-chat-input:focus {
          outline: none;
          border-color: #a78bfa;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }

        .wolf-chat-input::placeholder {
          color: #a78bfa;
        }

        .wolf-chat-send-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .wolf-chat-send-btn:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(139, 92, 246, 0.4);
        }

        .wolf-chat-send-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
