export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  eventType: string;
  organizer: {
    id: number;
    name: string;
    avatar: string | null;
  };
  isAllDay: boolean;
  isRecurring: boolean;
  recurringPattern: any;
  attendees: Array<{
    id: number;
    name: string;
    avatar: string | null;
  }>;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurringPattern?: any;
  attendees?: number[];
  color?: string;
}

export type CalendarViewType = 'day' | 'week' | 'month';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export type EventColorMap = {
  [key: string]: {
    bgClass: string;
    textClass: string;
    hoverClass: string;
  };
};

export const eventColors: EventColorMap = {
  blue: {
    bgClass: "bg-blue-100",
    textClass: "text-blue-800",
    hoverClass: "hover:bg-blue-100"
  },
  green: {
    bgClass: "bg-green-100",
    textClass: "text-green-800",
    hoverClass: "hover:bg-green-100"
  },
  purple: {
    bgClass: "bg-purple-100",
    textClass: "text-purple-800",
    hoverClass: "hover:bg-purple-100"
  },
  amber: {
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    hoverClass: "hover:bg-amber-100"
  },
  red: {
    bgClass: "bg-red-100",
    textClass: "text-red-800",
    hoverClass: "hover:bg-red-100"
  },
  pink: {
    bgClass: "bg-pink-100",
    textClass: "text-pink-800",
    hoverClass: "hover:bg-pink-100"
  },
  indigo: {
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-800",
    hoverClass: "hover:bg-indigo-100"
  },
  gray: {
    bgClass: "bg-gray-100",
    textClass: "text-gray-800",
    hoverClass: "hover:bg-gray-100"
  }
};
