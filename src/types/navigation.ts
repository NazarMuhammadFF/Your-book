export type AppScreen = "library" | "workspace";

export type WorkspaceViewMode = "document" | "book";

export interface NavigationState {
  screen: AppScreen;
  activeBookId: string | null;
  workspaceMode: WorkspaceViewMode;
}
