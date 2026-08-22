import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";
import { transitions, motionVariants } from "../../design/motion";
import { IconButton } from "./IconButton";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "780px",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <motion.div
            className={styles.backdrop}
            variants={motionVariants.modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.fast}
            onClick={onClose}
          />
          <div className={styles.container}>
            <motion.div
              className={styles.card}
              style={{ maxWidth }}
              variants={motionVariants.modalCard}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitions.springModal}
            >
              {(title || description) && (
                <div className={styles.header}>
                  <div className={styles.headerText}>
                    {title && <h2 className={styles.title}>{title}</h2>}
                    {description && <p className={styles.description}>{description}</p>}
                  </div>
                  <IconButton
                    icon={<X size={18} />}
                    label="Close dialog"
                    variant="ghost"
                    onClick={onClose}
                  />
                </div>
              )}
              <div className={styles.content}>{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
