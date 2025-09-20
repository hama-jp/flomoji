interface ConversationEntry {
  id: string;
  type: 'user' | 'assistant';
  message: string;
  suggestions?: any[];
  timestamp: Date;
  metadata?: any;
}

interface SuggestionRecord {
  id: string;
  suggestion: any;
  status: 'pending' | 'applied' | 'rejected';
  timestamp: Date;
}

interface MemoryContext {
  conversationHistory: ConversationEntry[];
  lastWorkflowDiff?: any;
  userPreferences?: {
    preferredModel?: string;
    defaultTemplates?: string[];
    autoApprove?: boolean;
  };
  sessionId: string;
  workflowId?: string;
}

export class CopilotMemory {
  private conversations: ConversationEntry[] = [];
  private suggestions: Map<string, SuggestionRecord> = new Map();
  private context: MemoryContext;
  private maxHistorySize = 100;
  private storageKey = 'copilot-memory';

  constructor() {
    this.context = {
      conversationHistory: [],
      sessionId: this.generateSessionId(),
    };
    this.loadFromStorage();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  addConversation(entry: Omit<ConversationEntry, 'id'>): void {
    const conversationEntry: ConversationEntry = {
      ...entry,
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.conversations.push(conversationEntry);

    // Store suggestions if present
    if (entry.suggestions) {
      entry.suggestions.forEach(suggestion => {
        this.suggestions.set(suggestion.id, {
          id: suggestion.id,
          suggestion,
          status: 'pending',
          timestamp: new Date(),
        });
      });
    }

    // Trim history if it exceeds max size
    if (this.conversations.length > this.maxHistorySize) {
      this.conversations = this.conversations.slice(-this.maxHistorySize);
    }

    this.context.conversationHistory = this.conversations;
    this.saveToStorage();
  }

  getSuggestion(suggestionId: string): any | undefined {
    return this.suggestions.get(suggestionId)?.suggestion;
  }

  markSuggestionApplied(suggestionId: string): void {
    const record = this.suggestions.get(suggestionId);
    if (record) {
      record.status = 'applied';
      this.saveToStorage();
    }
  }

  markSuggestionRejected(suggestionId: string): void {
    const record = this.suggestions.get(suggestionId);
    if (record) {
      record.status = 'rejected';
      this.saveToStorage();
    }
  }

  getContext(): MemoryContext {
    return {
      ...this.context,
      conversationHistory: this.getRecentConversations(10),
    };
  }

  getRecentConversations(limit: number = 10): ConversationEntry[] {
    return this.conversations.slice(-limit);
  }

  getConversationHistory(): ConversationEntry[] {
    return [...this.conversations];
  }

  getSuggestionHistory(): SuggestionRecord[] {
    return Array.from(this.suggestions.values());
  }

  setUserPreferences(preferences: MemoryContext['userPreferences']): void {
    this.context.userPreferences = {
      ...this.context.userPreferences,
      ...preferences,
    };
    this.saveToStorage();
  }

  getUserPreferences(): MemoryContext['userPreferences'] {
    return this.context.userPreferences;
  }

  setWorkflowId(workflowId: string): void {
    this.context.workflowId = workflowId;
    this.saveToStorage();
  }

  setLastWorkflowDiff(diff: any): void {
    this.context.lastWorkflowDiff = diff;
    this.saveToStorage();
  }

  clear(): void {
    this.conversations = [];
    this.suggestions.clear();
    this.context = {
      conversationHistory: [],
      sessionId: this.generateSessionId(),
      userPreferences: this.context.userPreferences, // Preserve user preferences
    };
    this.saveToStorage();
  }

  clearSession(): void {
    this.conversations = [];
    this.suggestions.clear();
    this.context.conversationHistory = [];
    this.context.sessionId = this.generateSessionId();
    this.saveToStorage();
  }

  export(): any {
    return {
      conversations: this.conversations,
      suggestions: Array.from(this.suggestions.entries()).map(([_, record]) => ({
        ...record,
      })),
      context: this.context,
      exportedAt: new Date().toISOString(),
    };
  }

  import(data: any): void {
    try {
      if (data.conversations) {
        this.conversations = data.conversations.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp),
        }));
      }

      if (data.suggestions) {
        this.suggestions.clear();
        data.suggestions.forEach((record: any) => {
          this.suggestions.set(record.id, {
            ...record,
            timestamp: new Date(record.timestamp),
          });
        });
      }

      if (data.context) {
        this.context = {
          ...data.context,
          conversationHistory: this.conversations,
        };
      }

      this.saveToStorage();
    } catch (error) {
      console.error('Failed to import memory data:', error);
      throw new Error('Invalid memory data format');
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        conversations: this.conversations.map(c => ({
          ...c,
          timestamp: c.timestamp.toISOString(),
        })),
        suggestions: Array.from(this.suggestions.entries()).map(([_, record]) => ({
          ...record,
          timestamp: record.timestamp.toISOString(),
        })),
        context: {
          ...this.context,
          conversationHistory: [], // Don't duplicate in storage
        },
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save copilot memory:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.import(data);
      }
    } catch (error) {
      console.error('Failed to load copilot memory:', error);
    }
  }

  // Analytics and insights
  getStatistics(): {
    totalConversations: number;
    userMessages: number;
    assistantMessages: number;
    totalSuggestions: number;
    appliedSuggestions: number;
    rejectedSuggestions: number;
    pendingSuggestions: number;
    sessionDuration: number;
  } {
    const userMessages = this.conversations.filter(c => c.type === 'user').length;
    const assistantMessages = this.conversations.filter(c => c.type === 'assistant').length;

    const suggestionStats = Array.from(this.suggestions.values()).reduce(
      (acc, record) => {
        acc.total++;
        if (record.status === 'applied') acc.applied++;
        else if (record.status === 'rejected') acc.rejected++;
        else acc.pending++;
        return acc;
      },
      { total: 0, applied: 0, rejected: 0, pending: 0 }
    );

    const sessionStart = this.conversations[0]?.timestamp || new Date();
    const sessionDuration = Date.now() - sessionStart.getTime();

    return {
      totalConversations: this.conversations.length,
      userMessages,
      assistantMessages,
      totalSuggestions: suggestionStats.total,
      appliedSuggestions: suggestionStats.applied,
      rejectedSuggestions: suggestionStats.rejected,
      pendingSuggestions: suggestionStats.pending,
      sessionDuration,
    };
  }

  // Search functionality
  search(query: string): ConversationEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.conversations.filter(conv =>
      conv.message.toLowerCase().includes(lowerQuery)
    );
  }

  // Get conversations by date range
  getConversationsByDateRange(startDate: Date, endDate: Date): ConversationEntry[] {
    return this.conversations.filter(conv =>
      conv.timestamp >= startDate && conv.timestamp <= endDate
    );
  }
}