import React from "react";
import { motion } from "motion/react";
import styles from "./SegmentedControl.module.css";
import { transitions } from "../../design/motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  name?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
  name = "segmented-control",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`${styles.container} ${styles[size]} ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`${styles.segment} ${isSelected ? styles.selected : ""}`}
          >
            {isSelected && (
              <motion.div
                layoutId={`pill-${name}`}
                className={styles.activePill}
                transition={transitions.springControl}
              />
            )}
            <span className={styles.content}>
              {option.icon && <span className={styles.icon}>{option.icon}</span>}
              <span className={styles.label}>{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
