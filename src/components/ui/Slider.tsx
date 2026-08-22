import React from "react";
import styles from "./Slider.module.css";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  valueDisplay?: string | number;
  helperText?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ label, valueDisplay, helperText, id, className = "", ...props }, ref) => {
    const sliderId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`${styles.wrapper} ${className}`}>
        <div className={styles.header}>
          <label htmlFor={sliderId} className={styles.label}>
            {label}
          </label>
          {valueDisplay !== undefined && <span className={styles.valueDisplay}>{valueDisplay}</span>}
        </div>
        <input
          ref={ref}
          id={sliderId}
          type="range"
          className={styles.slider}
          {...props}
        />
        {helperText && <span className={styles.helperText}>{helperText}</span>}
      </div>
    );
  }
);

Slider.displayName = "Slider";
