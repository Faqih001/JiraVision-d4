// API client for chat endpoints
const API_BASE = '/api';

// Fetch all chats for the current user
export async function fetchChats() {
  try {
    const response = await fetch(`${API_BASE}/chat`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
}

// Fetch messages for a specific chat
export async function fetchMessages(chatId: string) {
  try {
    const response = await fetch(`${API_BASE}/chat/messages?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// Create a new chat (individual or group)
export async function createChat(data: {
  type: 'individual' | 'group';
  name: string;
  participants: number[];
  avatar?: string;
  message?: string;
}) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

// Send a message via HTTP (fallback for when WebSocket is not available)
export async function sendMessage(data: {
  chatId: string;
  content: string;
  type: string;
  replyToId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}) {
  try {
    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Edit a message
export async function editMessage(messageId: string, content: string) {
  try {
    const response = await fetch(`${API_BASE}/chat/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
}

// Delete a message
export async function deleteMessage(messageId: string) {
  try {
    const response = await fetch(`${API_BASE}/chat/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

// React to a message
export async function reactToMessage(messageId: string, emoji: string) {
  try {
    const response = await fetch(`${API_BASE}/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error reacting to message:', error);
    throw error;
  }
}

// Mark a chat as read
export async function markChatAsRead(chatId: string) {
  try {
    const response = await fetch(`${API_BASE}/chat/${chatId}/read`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error marking chat as read:', error);
    throw error;
  }
}

// Archive or unarchive a chat
export async function toggleArchiveChat(chatId: string, isArchived: boolean) {
  try {
    const response = await fetch(`${API_BASE}/chat/${chatId}/archive`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isArchived }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error toggling archive status:', error);
    throw error;
  }
}

// Mute or unmute a chat
export async function toggleMuteChat(chatId: string, isMuted: boolean) {
  try {
    const response = await fetch(`${API_BASE}/chat/${chatId}/mute`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isMuted }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error toggling mute status:', error);
    throw error;
  }
}

// Fetch users for creating chats
export async function fetchUsers() {
  try {
    const response = await fetch(`${API_BASE}/user`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
} 