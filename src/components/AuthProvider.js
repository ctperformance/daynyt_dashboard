'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'client'
  const [userProjects, setUserProjects] = useState([]);
  const [memberships, setMemberships] = useState([]);

  const fetchUserData = useCallback(async (userId) => {
    try {
      // Fetch organization memberships
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('id, role, organization_id')
        .eq('user_id', userId);

      if (membersError) {
        console.error('Error fetching memberships:', membersError);
        return;
      }

      setMemberships(members || []);

      // Determine role
      const isAdmin = (members || []).some(
        (m) => m.role === 'super_admin' || m.role === 'agency_admin'
      );
      setUserRole(isAdmin ? 'admin' : 'client');

      // Fetch projects for user's organizations
      const orgIds = [...new Set((members || []).map((m) => m.organization_id))];
      if (orgIds.length > 0) {
        const { data: projects, error: projError } = await supabase
          .from('projects')
          .select('id, name, slug, organization_id, created_at, addons')
          .in('organization_id', orgIds)
          .order('name');

        if (projError) {
          console.error('Error fetching projects:', projError);
        } else {
          setUserProjects(projects || []);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, [supabase]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchUserData(s.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchUserData(s.user.id);
        } else {
          setUserRole(null);
          setUserProjects([]);
          setMemberships([]);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProjects([]);
    setMemberships([]);
  }, [supabase]);

  const value = {
    supabase,
    user,
    session,
    loading,
    userRole,
    userProjects,
    memberships,
    signOut,
    isAdmin: userRole === 'admin',
    isClient: userRole === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
