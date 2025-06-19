'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  property: any;
  onSendMessage?: (message: string) => Promise<string>;
}

export function AIChat({ property, onSendMessage }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI property advisor. I can help you analyze "${property.title}" and answer any questions about its investment potential, market trends, or neighborhood details. What would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // If custom onSendMessage is provided, use it
      let response: string;
      if (onSendMessage) {
        response = await onSendMessage(userMessage.content);
      } else {
        // Otherwise, use mock responses
        response = await getMockResponse(userMessage.content, property);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const getMockResponse = async (query: string, prop: any): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const lowerQuery = query.toLowerCase();

    // Price-related queries
    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('expensive')) {
      const pricePerSqft = Math.round(prop.price / prop.squareFeet);
      return `The property is listed at $${prop.price.toLocaleString()}${prop.listingType === 'For Rent' ? ' per month' : ''}. That's approximately $${pricePerSqft} per square foot, which is ${Math.random() > 0.5 ? 'competitive' : 'reasonable'} for the ${prop.city} market. Based on recent comparables in the area, this pricing appears to be ${Math.random() > 0.5 ? 'at market value' : 'slightly below market value'}.`;
    }

    // Investment queries
    if (lowerQuery.includes('investment') || lowerQuery.includes('roi') || lowerQuery.includes('return')) {
      const monthlyRent = prop.listingType === 'For Sale' ? Math.round(prop.price * 0.005) : prop.price;
      const annualROI = ((monthlyRent * 12) / prop.price * 100).toFixed(1);
      return `This property shows strong investment potential. With an estimated rental income of $${monthlyRent.toLocaleString()}/month, you could expect an annual ROI of approximately ${annualROI}%. The ${prop.city} market has shown consistent appreciation of 3-5% annually over the past 5 years.`;
    }

    // Location queries
    if (lowerQuery.includes('location') || lowerQuery.includes('neighborhood') || lowerQuery.includes('area')) {
      return `The property is located in ${prop.city}, ${prop.state}, which is known for its ${
        prop.city === 'Austin' ? 'thriving tech scene and vibrant culture' :
        prop.city === 'Miami' ? 'beautiful beaches and international business hub' :
        prop.city === 'New York' ? 'world-class amenities and career opportunities' :
        'growing economy and quality of life'
      }. The neighborhood offers excellent access to shopping, dining, and public transportation. School ratings in the area average 7-8/10.`;
    }

    // Property features
    if (lowerQuery.includes('bedroom') || lowerQuery.includes('bathroom') || lowerQuery.includes('size')) {
      return `This property features ${prop.bedrooms} bedroom${prop.bedrooms !== 1 ? 's' : ''} and ${prop.bathrooms} bathroom${prop.bathrooms !== 1 ? 's' : ''} across ${prop.squareFeet.toLocaleString()} square feet. The layout is ${prop.squareFeet / prop.bedrooms > 500 ? 'spacious' : 'efficient'}, offering ${Math.round(prop.squareFeet / prop.bedrooms)} sq ft per bedroom on average.`;
    }

    // Market trends
    if (lowerQuery.includes('market') || lowerQuery.includes('trend')) {
      return `The ${prop.city} real estate market is currently ${Math.random() > 0.5 ? 'favoring sellers' : 'balanced'} with average days on market of ${20 + Math.floor(Math.random() * 40)}. Property values in this area have appreciated ${3 + Math.random() * 4}% over the past year. Given current interest rates and market conditions, this is a ${Math.random() > 0.5 ? 'good' : 'reasonable'} time to ${prop.listingType === 'For Sale' ? 'buy' : 'rent'}.`;
    }

    // Default response with suggestions
    return `I'd be happy to help you analyze this property further. You can ask me about:
• Investment potential and ROI calculations
• Market trends and pricing analysis
• Neighborhood amenities and lifestyle factors
• Comparison with similar properties
• Future appreciation potential

What specific aspect would you like to explore?`;
  };

  const suggestedQuestions = [
    "What's the investment potential?",
    "How does the price compare to similar properties?",
    "Tell me about the neighborhood",
    "What are the market trends for this area?"
  ];

  return (
    <div className="flex flex-col h-[500px]">
      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.role === 'user'
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "bg-grey-100 text-grey-900"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={cn(
                  "text-xs mt-1 opacity-70",
                  message.role === 'user' ? "text-white" : "text-grey-600"
                )}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-grey-200 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-grey-600" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-grey-100 rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-grey-600" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-grey-600 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setInput(question);
                  inputRef.current?.focus();
                }}
                className="text-xs px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this property..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-grey-500 mt-2 text-center">
          Powered by Claude AI • Pro feature
        </p>
      </div>
    </div>
  );
}