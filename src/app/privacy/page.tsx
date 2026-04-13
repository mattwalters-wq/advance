import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div style={{ background: '#F7F3EE', minHeight: '100vh', fontFamily: '"Georgia", serif', color: '#1A1714' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>

      <nav style={{ padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E0D4', background: '#F7F3EE' }}>
        <Link href="/" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#1A1714', textDecoration: 'none' }}>Advance</Link>
        <Link href="/" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#8A8580', textDecoration: 'none' }}>← BACK</Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 16 }}>LEGAL</div>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 40, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: '#8A8580', marginBottom: 40, fontFamily: 'monospace' }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Who we are',
            body: 'Advance is an independent project based in Victoria, Australia. It is a tour management tool in active beta development. If you have any privacy questions, email us at hello@getadvance.co.',
          },
          {
            title: '2. What we collect',
            body: 'When you create an account we collect your name and email address. When you use the product we store the tour data you create: shows, travel, hotels, contacts, notes and any documents you upload or paste. We also collect basic usage information like which pages you visit, to help us improve the product.',
          },
          {
            title: '3. How we use it',
            body: 'We use your data to run the product and make it work. We do not sell your data. We do not use it for advertising. We do not share it with third parties except for the services listed below that are needed to run the product.',
          },
          {
            title: '4. Document processing',
            body: 'Documents and text you submit for import are sent to Anthropic\'s Claude to extract tour information. This processing happens in good faith. We do not use your content for any purpose beyond processing your request. Submitted content is not retained beyond what is needed to process your request.',
          },
          {
            title: '5. Third-party services',
            body: 'Advance uses Supabase to store your data and third-party services to process documents. These services have their own privacy policies. We have chosen them carefully and use them only for what is needed to run the product. If we add Stripe for payments in future, that will be noted here.',
          },
          {
            title: '6. Data security',
            body: 'Your data is stored with encryption in transit and at rest. Access is restricted to your account. That said, no system is completely secure and this is a beta project. Please use a strong password and do not store anything you would consider critically sensitive.',
          },
          {
            title: '7. Your rights',
            body: 'You can ask us to export, correct or delete your data at any time. Just email hello@getadvance.co and we will sort it out promptly. If you close your account, your data is retained for 30 days in case you change your mind, then deleted.',
          },
          {
            title: '8. Cookies',
            body: 'We use only essential cookies to keep you logged in. No tracking cookies, no advertising cookies.',
          },
          {
            title: '9. Changes',
            body: 'If we make significant changes to this policy we will let you know by email or in the product. The date at the top of this page shows when it was last updated.',
          },
          {
            title: '10. Contact',
            body: 'For any privacy questions email hello@getadvance.co.',
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
