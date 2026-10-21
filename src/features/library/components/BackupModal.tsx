import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import styles from "./BackupModal.module.css";

export type ImportOutcome =
  | { ok: true; added: number; skipped: number }
  | { ok: false; message: string };

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookCount: number;
  onExport: () => void;
  onImport: (fileText: string) => ImportOutcome;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  bookCount,
  onExport,
  onImport,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const handleExport = () => {
    try {
      onExport();
      setStatus({ tone: "ok", text: "Backup dibuat. Cek folder Unduhan Anda." });
    } catch (e) {
      setStatus({
        tone: "error",
        text: `Backup gagal: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const outcome = onImport(await file.text());
      setStatus(
        outcome.ok
          ? {
              tone: "ok",
              text: `${outcome.added} buku dipulihkan, ${outcome.skipped} dilewati karena sudah ada.`,
            }
          : { tone: "error", text: outcome.message }
      );
    } catch (err) {
      setStatus({
        tone: "error",
        text: `File tidak bisa dibaca: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Backup & Pulihkan"
      description="Simpan salinan perpustakaan Anda ke satu file, atau pulihkan dari file backup."
      maxWidth="460px"
    >
      <div className={styles.body}>
        <section className={styles.section}>
          <p className={styles.text}>
            Ekspor {bookCount} buku (termasuk yang ada di tempat sampah) beserta posisi rak ke file JSON.
          </p>
          <Button variant="primary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
            Ekspor Backup
          </Button>
        </section>

        <section className={styles.section}>
          <p className={styles.text}>
            Pulihkan dari file backup. Buku yang sudah ada tidak akan ditimpa; hanya buku yang belum ada yang ditambahkan.
          </p>
          <Button
            variant="ghost"
            size="sm"
            icon={<Upload size={14} />}
            onClick={() => fileRef.current?.click()}
          >
            Pulihkan dari File
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className={styles.hiddenInput}
          />
        </section>

        {status && (
          <p
            className={status.tone === "error" ? styles.statusError : styles.statusOk}
            role={status.tone === "error" ? "alert" : "status"}
          >
            {status.text}
          </p>
        )}
      </div>
    </Modal>
  );
};
