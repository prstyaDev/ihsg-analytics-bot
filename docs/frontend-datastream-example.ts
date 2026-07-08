/**
 * Frontend Example - Vercel AI SDK DataStream Protocol Parser
 * 
 * Cara menggunakan endpoint /api/chat dengan format DataStream Protocol
 * yang sudah diperbaiki.
 */

// ============================================================================
// EXAMPLE 1: Basic Fetch with Manual Parsing
// ============================================================================
async function sendMessageBasic(message: string, token: string) {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    throw new Error(error.error || 'Request failed');
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.startsWith('0:')) {
        // Text chunk - format: 0:"text content"
        const textJson = line.substring(2); // Remove "0:" prefix
        const text = JSON.parse(textJson); // Parse escaped JSON string
        fullText += text;
        console.log('Received:', text);
      } else if (line.startsWith('d:')) {
        // Done marker - format: d:{"finishReason":"stop"}
        const doneData = JSON.parse(line.substring(2));
        console.log('Stream finished:', doneData);
        
        if (doneData.fallback) {
          console.warn('⚠️ Response from fallback AI provider');
        }
      } else if (line.startsWith('e:')) {
        // Error marker - format: e:{"error":"ERROR_CODE"}
        const errorData = JSON.parse(line.substring(2));
        console.error('Stream error:', errorData);
        throw new Error(errorData.error);
      }
    }
  }

  return fullText;
}

// ============================================================================
// EXAMPLE 2: React Hook with Real-time Updates
// ============================================================================
import { useState, useCallback } from 'react';

function useChatStream(token: string) {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    setError(null);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          message,
          messages: messages, // Send conversation history
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add empty assistant message that will be updated
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('0:')) {
            const textJson = line.substring(2);
            const text = JSON.parse(textJson);
            assistantMessage += text;
            
            // Update assistant message in real-time
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: assistantMessage }
            ]);
          } else if (line.startsWith('d:')) {
            const doneData = JSON.parse(line.substring(2));
            console.log('Stream complete:', doneData);
          } else if (line.startsWith('e:')) {
            const errorData = JSON.parse(line.substring(2));
            throw new Error(errorData.error);
          }
        }
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message);
      
      // Remove empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [token, messages]);

  return { messages, isLoading, error, sendMessage };
}

// Usage in component:
function ChatComponent() {
  const token = 'your-jwt-token-here';
  const { messages, isLoading, error, sendMessage } = useChatStream(token);

  return (
    <div>
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <input 
        type="text" 
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !isLoading) {
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        disabled={isLoading}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Error Handling Best Practices
// ============================================================================
async function sendMessageWithErrorHandling(message: string, token: string) {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 401:
          console.error('Authentication failed:', errorData);
          // Redirect to login or request new token
          throw new Error('Please login again');
          
        case 403:
          console.error('Token invalid or expired:', errorData);
          console.log('Hint:', errorData.hint);
          // Generate new token: npm run token <userId> <chatId> <duration>
          throw new Error('Session expired. Please refresh your token.');
          
        case 400:
          console.error('Bad request:', errorData);
          throw new Error('Invalid message format');
          
        case 500:
          console.error('Server error:', errorData);
          throw new Error('Server error. Please try again later.');
          
        default:
          throw new Error(errorData.error || 'Unknown error');
      }
    }

    // Process stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('0:')) {
          const text = JSON.parse(line.substring(2));
          result += text;
        } else if (line.startsWith('e:')) {
          const error = JSON.parse(line.substring(2));
          throw new Error(error.error);
        }
      }
    }

    return result;

  } catch (error: any) {
    console.error('Chat request failed:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error
      throw new Error('Network error. Please check your connection.');
    }
    
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: TypeScript Types
// ============================================================================
type DataStreamChunk = 
  | { type: 'text'; content: string }
  | { type: 'done'; finishReason: string; fallback?: boolean }
  | { type: 'error'; error: string };

function parseDataStreamLine(line: string): DataStreamChunk | null {
  if (line.startsWith('0:')) {
    const text = JSON.parse(line.substring(2));
    return { type: 'text', content: text };
  } else if (line.startsWith('d:')) {
    const data = JSON.parse(line.substring(2));
    return { 
      type: 'done', 
      finishReason: data.finishReason,
      fallback: data.fallback 
    };
  } else if (line.startsWith('e:')) {
    const data = JSON.parse(line.substring(2));
    return { type: 'error', error: data.error };
  }
  return null;
}

async function sendMessageTyped(message: string, token: string): Promise<string> {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parsed = parseDataStreamLine(line);
      
      if (parsed?.type === 'text') {
        fullText += parsed.content;
      } else if (parsed?.type === 'done') {
        console.log('Stream finished:', parsed.finishReason);
        if (parsed.fallback) {
          console.warn('⚠️ Fallback provider was used');
        }
      } else if (parsed?.type === 'error') {
        throw new Error(parsed.error);
      }
    }
  }

  return fullText;
}

export { 
  sendMessageBasic, 
  useChatStream, 
  sendMessageWithErrorHandling,
  sendMessageTyped,
  parseDataStreamLine,
  type DataStreamChunk 
};
