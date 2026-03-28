import styles from './Card.module.css';

interface CardProps {
    label?: string;
    desc?: string;
    children?: React.ReactNode;
};

export function Card({ label, desc, children }: CardProps) {
    return (        
        <div 
            className={styles.card} 
            style={{
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
            }}
        >
            {label && (
                <>
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider text-shadow-lg">
                        {label}
                    </h2>
                    <p className="text-md font-medium text-gray-700 mb-4 text-shadow-sm">
                        {desc}
                    </p>
                </>
            )}
            {children}
        </div>
    );
}