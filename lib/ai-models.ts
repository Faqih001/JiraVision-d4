// AI Model Configuration and Services
// This file contains the configuration and services for interacting with AI models

// Define the types of AI models supported by our application
export enum AIModelType {
  GRANITE = 'granite',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
}

// Configuration for different AI models
export const AI_MODELS = {
  [AIModelType.GRANITE]: {
    name: 'IBM Granite',
    version: '3.3-8B',
    description: 'Supports multilingual dialogs, code-related tasks, function-calling, and long-context tasks.',
    supportedLanguages: [
      'English', 'German', 'Spanish', 'French', 'Japanese', 'Portuguese', 
      'Arabic', 'Czech', 'Italian', 'Korean', 'Dutch', 'Chinese'
    ],
  },
  [AIModelType.OPENAI]: {
    name: 'OpenAI GPT-4',
    version: '4',
    description: 'Powerful general-purpose language model with strong reasoning capabilities.',
    supportedLanguages: ['English', 'Multilingual'],
  },
  [AIModelType.CLAUDE]: {
    name: 'Anthropic Claude',
    version: '3',
    description: 'Good at complex instructions, reasoning, and creative writing.',
    supportedLanguages: ['English', 'Multilingual'],
  },
  [AIModelType.GEMINI]: {
    name: 'Google Gemini',
    version: '1.0',
    description: 'Multimodal capabilities with strong coding and reasoning abilities.',
    supportedLanguages: ['English', 'Multilingual'],
  },
  [AIModelType.MISTRAL]: {
    name: 'Mistral',
    version: 'large',
    description: 'Efficient language model with good performance for its size.',
    supportedLanguages: ['English', 'French', 'Spanish', 'German', 'Italian'],
  }
}

// Interface for chat messages
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Settings for AI model configuration
export interface AIModelSettings {
  model: AIModelType;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  thinking?: boolean;
}

// Default settings
export const DEFAULT_AI_SETTINGS: AIModelSettings = {
  model: AIModelType.GRANITE,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  thinking: false,
}

// User preference for AI model settings
export interface UserAIPreferences {
  userId: number;
  preferredModel: AIModelType;
  settings: AIModelSettings;
}

// Function to generate AI response based on messages and settings
export async function generateAIResponse(
  messages: ChatMessage[], 
  settings: AIModelSettings = DEFAULT_AI_SETTINGS
): Promise<string> {
  try {
    // Call our backend API endpoint that handles AI model interactions
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        settings,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate AI response');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling AI generate API:', error);
    return `Error: Unable to connect to the ${AI_MODELS[settings.model].name} service. Please try again later.`;
  }
}

// Function to get user's AI model preferences
export async function getUserAIPreferences(userId: number): Promise<UserAIPreferences> {
  try {
    // In production, this would fetch from the database
    // For now, we'll simulate an API call
    const response = await fetch(`/api/users/${userId}/ai-preferences`);
    
    if (!response.ok) {
      // If no preferences found, return default settings
      return {
        userId,
        preferredModel: AIModelType.GRANITE,
        settings: DEFAULT_AI_SETTINGS,
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user AI preferences:', error);
    // Return default preferences in case of error
    return {
      userId,
      preferredModel: AIModelType.GRANITE,
      settings: DEFAULT_AI_SETTINGS,
    };
  }
}

// Function to save user's AI model preferences
export async function saveUserAIPreferences(
  userId: number, 
  preferences: Partial<UserAIPreferences>
): Promise<boolean> {
  try {
    // In production, this would save to the database
    const response = await fetch(`/api/users/${userId}/ai-preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error saving user AI preferences:', error);
    return false;
  }
}