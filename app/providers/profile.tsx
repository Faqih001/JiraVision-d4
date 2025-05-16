'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Profile {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  status: string;
  skills: string[];
  utilization: number;
}

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // TODO: Replace with actual API call
        const mockProfile: Profile = {
          id: 1,
          name: 'Current User',
          email: 'user@example.com',
          avatar: '',
          role: 'Admin',
          department: 'Management',
          status: 'active',
          skills: ['Management', 'Leadership'],
          utilization: 100
        };

        setProfile(mockProfile);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context.profile;
}
