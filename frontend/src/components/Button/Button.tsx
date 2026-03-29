import styles from './Button.module.css';

type ButtonVariant = 'default' | 'dark' | 'danger' | 'success';

const variantMap: Record<ButtonVariant, string> = {
    default: styles.default,
    dark: styles.dark,
    danger: styles.danger,
    success: styles.success,
};

type ButtonProps = React.ComponentPropsWithoutRef<'button'> & {
    variant?: ButtonVariant;
    borderless?: boolean;
};

export function Button({ children, className, variant = 'default', borderless = false, ...props }: ButtonProps) {
    return (
        <button
            {...props}
            className={`${styles.button} ${variantMap[variant]} ${borderless ? styles.borderless : ''} ${className ?? ''}`}
        >
            {children}
        </button>
    );
}