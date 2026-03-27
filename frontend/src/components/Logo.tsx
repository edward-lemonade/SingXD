export function Logo() {
    return (
        <div
            style={{
                fontFamily: 'Anton',
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '100px',
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
