import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
    { role: 'bot', content: 'Hello! I am the E.R.I.S.E. Club Assistant. How can I help you learn more about our club, events, or renewable energy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: userMessage,
        config: {
          systemInstruction: `You are a helpful assistant for the E.R.I.S.E. (Engineers For renewable Energy 'Innovation & Environmental sustainability') scientific club. 
          The club is located at the Higher National School of Renewable Energies, Environment, and Sustainable Development in Batna, Algeria.
          Answer questions about the club, its mission, renewable energy, and environmental sustainability. Keep answers concise, friendly, and helpful.`
        }
      });

      setMessages(prev => [...prev, { role: 'bot', content: response.text || 'Sorry, I could not generate a response.' }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I am having trouble connecting right now. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-accent btn-on-accent rounded-full shadow-lg flex items-center justify-center hover:bg-accent-muted transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-surface rounded-2xl shadow-2xl border border-subtle flex flex-col overflow-hidden z-50 h-[500px] max-h-[80vh]">
          {/* Header */}
          <div className="bg-accent btn-on-accent p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">E.R.I.S.E. Assistant</h3>
              <p className="text-xs opacity-90">Ask me anything about the club</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="opacity-90 hover:opacity-100 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dominant">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-accent btn-on-accent rounded-tr-sm' 
                    : 'bg-surface text-primary border border-subtle shadow-sm rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface text-primary border border-subtle shadow-sm rounded-2xl rounded-tl-sm p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-xs text-muted">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-surface border-t border-subtle">
            <div className="flex items-center gap-2 bg-dominant rounded-full p-1 pr-2 border border-default focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-sm outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 rounded-full bg-accent btn-on-accent flex items-center justify-center disabled:opacity-50 hover:bg-accent-muted transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
