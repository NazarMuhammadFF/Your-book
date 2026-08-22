import React from "react";
import { ArrowLeft, FileText, BookOpen, Sliders } from "lucide-react";
import styles from "./WorkspaceHeader.module.css";
import { Book } from "../../books/types/book";
import { WorkspaceViewMode } from "../../../types/navigation";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { Button } from "../../../components/ui/Button";
import { COVER_PALETTES } from "../../../design/typography";

export interface WorkspaceHeaderProps {
  book: Book;
  viewMode: WorkspaceViewMode;
  onViewModeChange: (mode: WorkspaceViewMode) => void;
  onBackToLibrary: () => void;
  onOpenSettings?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  book,
  viewMode,
  onViewModeChange,
  onBackToLibrary,
  onOpenSettings,
}) => {
  const palette = COVER_PALETTES.find((p) => p.id === book.cover.paletteId) || COVER_PALETTES[0];

  return (
    <header className={styles.header}>
      {/* Left: Back button & Book Badge */}
      <div className={styles.leftGroup}>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={onBackToLibrary}
          aria-label="Back to Library"
        >
          Library
        </Button>

        <div className={styles.divider} />

        <div className={styles.bookBadge}>
          <div
            className={styles.colorDot}
            style={{ backgroundColor: palette.primary }}
            title={`Cover: ${palette.name}`}
          />
          <div className={styles.bookInfo}>
            <span className={styles.bookTitle}>{book.title}</span>
            {book.subtitle && <span className={styles.bookSubtitle}>{book.subtitle}</span>}
          </div>
        </div>
      </div>

      {/* Center: Tactile Document / Book View Mode Toggle */}
      <div className={styles.centerGroup}>
        <SegmentedControl<WorkspaceViewMode>
          name="workspace-view"
          value={viewMode}
          onChange={onViewModeChange}
          options={[
            {
              value: "document",
              label: "Document View",
              icon: <FileText size={15} />,
            },
            {
              value: "book",
              label: "Book View",
              icon: <BookOpen size={15} />,
            },
          ]}
        />
      </div>

      {/* Right: Book Settings & Typographic Indicator */}
      <div className={styles.rightGroup}>
        <span className={styles.typographyIndicator}>
          {book.typography.fontFamilyId.toUpperCase()} • {book.typography.fontSize}px
        </span>

        {onOpenSettings && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Sliders size={14} />}
            onClick={onOpenSettings}
            aria-label="Book Settings"
            style={{ marginLeft: "8px" }}
          >
            Settings
          </Button>
        )}
      </div>
    </header>
  );
};
