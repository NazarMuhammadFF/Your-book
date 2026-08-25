import React from "react";
import { Trash2, RotateCcw, ArchiveX } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Book } from "../../books/types/book";
import { resolveCoverPalette } from "../../../design/typography";
import styles from "./TrashDrawerModal.module.css";

export interface TrashDrawerModalProps {
  isOpen: boolean;
  trashedBooks: Book[];
  onClose: () => void;
  onRestore: (bookId: string) => void;
  onDeletePermanently: (bookId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashDrawerModal: React.FC<TrashDrawerModalProps> = ({
  isOpen,
  trashedBooks,
  onClose,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tempat Sampah (Trash Bin)"
      maxWidth="560px"
    >
      <div className={styles.modalContent}>
        {trashedBooks.length > 0 && (
          <div className={styles.headerBar}>
            <div className={styles.titleGroup}>
              <span>{trashedBooks.length} buku di dalam tempat sampah</span>
            </div>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={13} />}
              onClick={onEmptyTrash}
            >
              Kosongkan Sampah
            </Button>
          </div>
        )}

        {trashedBooks.length === 0 ? (
          <div className={styles.emptyState}>
            <ArchiveX size={36} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Tempat sampah kosong.</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Drag buku dari rak ke ikon tempat sampah di kanan bawah untuk memindahkannya ke sini.
            </p>
          </div>
        ) : (
          <div className={styles.bookList}>
            {trashedBooks.map((book) => {
              const palette = resolveCoverPalette(book.cover.paletteId);
              const customImg = book.cover.customImageUrl;

              return (
                <div key={`trash-item-${book.id}`} className={styles.bookItem}>
                  <div className={styles.bookInfo}>
                    <div
                      className={styles.bookCoverPreview}
                      style={{
                        backgroundImage: customImg ? `url("${customImg}")` : undefined,
                        backgroundColor: customImg ? undefined : palette.primary,
                      }}
                    />
                    <div className={styles.textGroup}>
                      <span className={styles.bookTitle}>{book.title}</span>
                      <span className={styles.bookMeta}>
                        {book.format === "pdf" ? "PDF E-Book" : "Catatan Tulis"}
                        {book.cover.authorName && ` • ${book.cover.authorName}`}
                      </span>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RotateCcw size={13} />}
                      onClick={() => onRestore(book.id)}
                      title="Kembalikan buku ke rak Bookshelf"
                    >
                      Pulihkan
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 size={13} />}
                      onClick={() => onDeletePermanently(book.id)}
                      title="Hapus buku secara permanen"
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
