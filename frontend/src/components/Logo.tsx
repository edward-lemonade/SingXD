export function Logo() {
    return (
        <div
            style={{
                fontFamily: 'Anton',
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '100px',
                textShadow: `
                    0 0 4px rgba(255, 255, 255, 0.9),
                    -1px 0 0 rgba(0, 0, 0, 0.5),
                    1px 0 0 rgba(0, 0, 0, 0.5)
                `,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
            }}
        >
            SingXD
        </div>
    );
}