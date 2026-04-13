import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={{ background: '#F7F3EE', minHeight: '100vh', fontFamily: '"Georgia", serif', color: '#1A1714' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>

      <nav style={{ padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E0D4', background: '#F7F3EE' }}>
        <Link href="/" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#1A1714', textDecoration: 'none' }}>Advance</Link>
        <Link href="/" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#8A8580', textDecoration: 'none' }}>← BACK</Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 16 }}>LEGAL</div>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 40, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>Terms of Use</h1>
        <p style={{ fontSize: 13, color: '#8A8580', marginBottom: 16, fontFamily: 'monospace' }}>Last updated: March 2026</p>
        <div style={{ padding: '12px 16px', background: '#FFF8E6', border: '1px solid #F0C040', borderRadius: 8, marginBottom: 40, fontSize: 13, color: '#7a5800', lineHeight: 1.7 }}>
          Advance is an independent project currently in beta. It is provided as-is, without warranty of any kind. Use it at your own discretion and please back up anything important. We are not responsible for data loss, errors or tour disasters. That said, we will do our best to keep things running smoothly and we genuinely want this to be useful to you.
        </div>

        {[
          {
            title: '1. What this is',
            body: 'Advance is a tour management tool built for artist managers and touring teams. It is an independent project in active development. Features may change, break, or disappear without notice. We appreciate your patience and feedback as we build it out.',
          },
          {
            title: '2. Your account',
            body: 'You are responsible for keeping your login details secure and for anything that happens under your account. Please use a strong password. If you think someone else has access to your account, contact us at hello@getadvance.co straight away.',
          },
          {
            title: '3. Your data',
            body: 'The tour data, contacts, documents and notes you add belong to you. We store them securely to make the product work, but we have no claim over your content. You can request a copy or deletion of your data at any time by emailing hello@getadvance.co.',
          },
          {
            title: '4. Document processing',
            body: 'When you upload or paste documents, they are processed to extract tour information. We do not use your documents for any purpose beyond processing your request. Processing is done in good faith but the results may not always be accurate. Always review what has been extracted before relying on it.',
          },
          {
            title: '5. Fair use',
            body: 'Please use Advance for its intended purpose. Do not attempt to misuse, overload or reverse-engineer the service. We reserve the right to suspend access if we believe the service is being abused.',
          },
          {
            title: '6. No guarantees',
            body: 'This is a beta project. We cannot guarantee the service will always be available, accurate or error-free. We are not liable for any losses, missed flights, botched advances or other consequences arising from use of Advance. Use your judgement and keep your own backups.',
          },
          {
            title: '7. Changes',
            body: 'We may update these terms as the project evolves. We will do our best to let you know if anything significant changes. Continuing to use Advance after changes are posted means you accept the updated terms.',
          },
          {
            title: '8. Get in touch',
            body: 'Questions, concerns, feedback or just want to say hello? Email us at hello@getadvance.co.',
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 700, marginBottom: 10, color: '#1A1714' }}>{section.title}</h2>
            <p style={{ fontSize: 14, color: '#6A6058', lineHeight: 1.85 }}>{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
