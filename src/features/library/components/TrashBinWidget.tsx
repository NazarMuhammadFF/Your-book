import React from "react";
import styles from "./TrashBinWidget.module.css";

export interface TrashBinWidgetProps {
  trashedCount: number;
  isDragOver?: boolean;
  onClick: () => void;
}

export const TrashBinWidget: React.FC<TrashBinWidgetProps> = ({
  trashedCount,
  isDragOver = false,
  onClick,
}) => {
  return (
    <div
      data-trash-bin="true"
      className={`${styles.trashCanContainer} ${isDragOver ? styles.dragOver : ""}`}
      onClick={onClick}
      aria-label={`Sampah (${trashedCount} buku). Klik untuk membuka tempat sampah.`}
      title="Tempat Sampah — Drag buku ke sini untuk dibuang"
    >
      {/* 3D Physical Trash Can Structure */}
      <div className={styles.trashCan3D}>
        {/* Can Lid Group (Tutup Tong Sampah dengan engsel) */}
        <div className={styles.canLidGroup}>
          <div className={styles.canLidHandle} />
          <div className={styles.canLid} />
        </div>

        {/* Can Inner Cavity Opening */}
        <div className={styles.canOpening} />

        {/* Metallic Canister Body */}
        <div className={styles.canBody}>
          <div className={styles.canRib} />
          <div className={styles.canEmbossIcon}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div className={styles.canRib} />
        </div>

        {/* Base Pedal */}
        <div className={styles.canPedal} />

        {/* Trashed Count Badge */}
        {trashedCount > 0 && (
          <div className={styles.badge}>{trashedCount}</div>
        )}
      </div>

      <span className={styles.label}>
        {isDragOver ? "Lepas ke Sampah" : "Sampah"}
      </span>
    </div>
  );
};
