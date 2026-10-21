import styles from "./StorageBanner.module.css";

interface StorageBannerProps {
  message: string;
  onDismiss: () => void;
}

export function StorageBanner({ message, onDismiss }: StorageBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <span>{message}</span>
      <button type="button" className={styles.dismiss} onClick={onDismiss}>
        Tutup
      </button>
    </div>
  );
}
