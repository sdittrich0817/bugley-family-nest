// Email-safe equivalents of the Bugley tokens in src/styles.css.
export const emailBrand = {
  ink: '#23283F', glow: '#FFC94D', muted: '#596174', border: '#E4E7EC',
  body: { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: '0' },
  container: { maxWidth: '560px', padding: '32px 24px' },
  title: { color: '#23283F', fontFamily: 'Nunito, Arial, sans-serif', fontSize: '26px', fontWeight: '800', lineHeight: '1.3', margin: '24px 0 20px' },
  text: { color: '#23283F', fontSize: '16px', lineHeight: '1.65', margin: '0 0 20px' },
  button: { backgroundColor: '#FFC94D', color: '#23283F', fontWeight: '700', fontSize: '16px', borderRadius: '8px', padding: '14px 24px', textDecoration: 'none' },
  footer: { color: '#596174', fontSize: '13px', lineHeight: '1.6', margin: '24px 0 0' },
} as const