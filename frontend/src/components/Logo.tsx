export interface LogoProps {
    fontSize: number;
}

export function Logo({ fontSize }: LogoProps) {
    return (
        <div
            style={{
                fontFamily: 'Anton',
                color: '#ffffff',
                fontWeight: 500,
                fontSize: `${fontSize}px`,
                textShadow: `
                    -2px -2px 2px rgba(0, 0, 0, 1),
                    2px -2px 2px rgba(0, 0, 0, 1),
                    -2px 2px 2px rgba(0, 0, 0, 1),
                    2px 2px 2px rgba(0, 0, 0, 1)
                `,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
            }}
        >
            SingXD
        </div>
    );
}
