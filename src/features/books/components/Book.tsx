import React from "react";
import { motion } from "motion/react";
import styles from "./Book.module.css";
import { Book as IBook } from "../types/book";
import { BookCover } from "./BookCover";
import { transitions } from "../../../design/motion";

export interface BookProps {
  book: IBook;
  onClick?: (book: IBook) => void;
  isInteractive?: boolean;
  scale?: number;
  className?: string;
  showSpineDepth?: boolean;
}

export const Book: React.FC<BookProps> = ({
  book,
  onClick,
  isInteractive = true,
  scale = 1,
  className = "",
  showSpineDepth = true,
}) => {
  const { width = 148, height = 212, thickness = 24, rotationDeg = 0 } = book.dimensions || {};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === "Enter" || e.key === " ") && onClick && isInteractive) {
      e.preventDefault();
      onClick(book);
    }
  };

  return (
    <motion.div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={`Book: ${book.title}`}
      onClick={() => isInteractive && onClick?.(book)}
      onKeyDown={handleKeyDown}
      className={`${styles.bookContainer} ${isInteractive ? styles.interactive : ""} ${className}`}
      style={
        {
          width: width * scale,
          height: height * scale,
          "--book-thickness": `${thickness * scale}px`,
          "--book-rotation": `${rotationDeg}deg`,
        } as React.CSSProperties
      }
      initial={{ rotateZ: rotationDeg }}
      whileHover={
        isInteractive
          ? {
              y: -10,
              rotateZ: 0,
              scale: 1.025,
              transition: transitions.springBook,
            }
          : undefined
      }
      whileTap={
        isInteractive
          ? {
              scale: 0.98,
              y: -4,
              transition: transitions.springControl,
            }
          : undefined
      }
    >
      {/* Dynamic base shelf contact shadow */}
      <div className={styles.shelfShadow} />

      {/* 3D Physical Book Structure */}
      <div className={styles.bookBody}>
        {/* Right side page edge block (thickness & paper lines) */}
        {showSpineDepth && <div className={styles.pageEdgeBlock} />}

        {/* Front Cover Plate */}
        <div className={styles.frontCover}>
          <BookCover cover={book.cover} title={book.title} subtitle={book.subtitle} />
        </div>

        {/* Bottom page edge thickness */}
        {showSpineDepth && <div className={styles.bottomPageEdge} />}
      </div>
    </motion.div>
  );
};
