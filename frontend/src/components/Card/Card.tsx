import styles from './Card.module.css';

export function Card({ children }: { children?: React.ReactNode }) {
    return (
        <div className={styles.outer}>
            <div className={styles.card}>
                {children}
            </div>
        </div>
    );
}