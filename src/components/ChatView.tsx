import React from "react";
import { useState, useRef, useEffect } from 'react'

import { Send, Bot, User, AlertCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'

import llmService from '../services/llmService'
import StorageService from '../services/storageService'

interface ChatHistoryItem {
  id: string;
  message: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
  isError?: boolean;
}

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatHistoryItem[]>([
    {
      id: '1',
      role: 'assistant',
      message: 'Hello! Welcome to 🌊 flomoji. How can I help you today?',
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatHistoryItem = {
      id: Date.now().toString(),
      role: 'user',
      message: inputValue,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await llmService.sendMessage(inputValue)
      
      const botMessage: ChatHistoryItem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: response,
        timestamp: new Date().toLocaleTimeString()
      }
      
      setMessages(prev => [...prev, botMessage])
      
      // チャット履歴をローカルストレージに保存
      const chatHistory = StorageService.getChatHistory([])
      const updatedHistory = [...chatHistory, userMessage, botMessage]
      StorageService.setChatHistory(updatedHistory, 100) // 最新100件のみ保存
      
    } catch (error: any) {
      console.error('LLM API Error:', error)
      setError(error.message)
      
      const errorMessage: ChatHistoryItem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: `An error occurred: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearChat = () => {
    if (confirm('Clear chat history?')) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          message: 'Chat history cleared. Let\'s start a new conversation!',
          timestamp: new Date().toLocaleTimeString()
        }
      ])
      StorageService.remove(StorageService.KEYS.CHAT_HISTORY)
      setError(null)
    }
  }

  // コンポーネントマウント時にチャット履歴を復元
  useEffect(() => {
    const history = StorageService.getChatHistory([])
    if (history.length > 0) {
      setMessages(history)
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* エラー表示 */}
      {error && (
        <Alert variant={"default" as const} className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <br />
            <span className="text-sm">Please check your API key and endpoint in settings.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* チャット履歴 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] ${ 
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : message.isError 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-white'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  {message.role === 'assistant' && (
                    <Bot className={`h-5 w-5 mt-0.5 ${message.isError ? 'text-red-500' : 'text-gray-500'}`} />
                  )}
                  {message.role === 'user' && (
                    <User className="h-5 w-5 mt-0.5 text-white" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm whitespace-pre-wrap ${ 
                      message.isError ? 'text-red-800' : ''
                    }`}>
                      {message.message}
                    </p>
                    <p className={`text-xs mt-1 ${ 
                      message.role === 'user' 
                        ? 'text-blue-100' 
                        : message.isError 
                          ? 'text-red-400' 
                          : 'text-gray-400'
                    }`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-white">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-gray-500" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">Generating response...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="flex space-x-2">
        <Input type="text"
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your message..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          variant="default"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          size={'icon' as const}
          className=""
        >
          <Send className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleClearChat}
          variant={'outline' as const}
          size={'icon' as const}
          disabled={isLoading}
          title="Clear chat history"
          className=""
        >
          <Bot className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default ChatView

