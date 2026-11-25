"use client";

import React, {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";
import { workspaceService } from "@/lib/services/workspace.service";
import { proxyAuthService } from "@/lib/services/proxy-auth.service";
import { Workspace } from "@/types/api";
import { useAuth } from "./auth-context";
import { getCookie, setCookie } from "@/lib/utils/cookie-storage";
import { useTheme } from "@/context/theme-context";
import { themeKeyFromValue, type ThemeName } from "@/lib/theme";

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { isAuthenticated, updateUserFromWorkspace } = useAuth();
  const { setTheme } = useTheme();

  const applyWorkspaceTheme = (workspace: Workspace | null) => {
    if (!workspace?.theme) return;
    const mappedTheme = themeKeyFromValue(workspace.theme);
    if (mappedTheme) setTheme(mappedTheme as ThemeName);
  };

  const fetchWorkspaces = async () => {
    const token = proxyAuthService.getToken();
    
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const response = await workspaceService.listWorkspaces();
      
      if (response.success && response.data?.results) {
        setWorkspaces(response.data.results);
        
        // User data is now handled in the auth context during login
          // No need to call updateUserFromWorkspace here as we don't have the username
        
        // If no current workspace is set, set the first one as default
        if (!currentWorkspace && response.data.results.length > 0) {
          const savedWorkspaceIdValue = getCookie('acme_current_workspace_id');
          const savedWorkspaceId = savedWorkspaceIdValue
            ? Number(savedWorkspaceIdValue)
            : null;
          const savedWorkspace = response.data.results.find(
            (w) => w.id === savedWorkspaceId
          );
          const workspaceToSet = savedWorkspace || response.data.results[0];
          setCurrentWorkspaceState(workspaceToSet);
          applyWorkspaceTheme(workspaceToSet);
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    setCookie('acme_current_workspace_id', workspace.id.toString());
    applyWorkspaceTheme(workspace);
  };

  useEffect(() => {
    const savedIdValue = getCookie("workspaceId");
    const savedId = savedIdValue ? Number(savedIdValue) : null;
    if (savedId && workspaces.length > 0) {
      const matched = workspaces.find((ws) => ws.id === savedId);
      if (matched) setCurrentWorkspace(matched);
    }
  }, [workspaces]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
    }
  }, [isAuthenticated]);

  return (
    <WorkspaceContext.Provider 
      value={{ 
        workspaces, 
        currentWorkspace, 
        loading, 
        setCurrentWorkspace, 
        fetchWorkspaces 
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
