import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={{ background: '#0F0E0C', minHeight: '100vh', fontFamily: '"Georgia", serif', color: '#F4EFE6' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>

      <nav style={{ padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E1C18' }}>
        <Link href="/" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#F4EFE6', textDecoration: 'none' }}>Advance</Link>
        <Link href="/" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#6A6058', textDecoration: 'none' }}>← BACK</Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 16 }}>LEGAL</div>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 40, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: '#4A4540', marginBottom: 48, fontFamily: 'monospace' }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: `By accessing or using Advance ("the Service") at getadvance.co, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all users, including managers, tour managers, artists, and crew members who access the Service.`,
          },
          {
            title: '2. Description of Service',
            body: `Advance is a tour management platform that uses artificial intelligence to help artist managers, tour managers, and their teams organise tours, manage logistics, and collaborate. Features include document import and extraction, AI-assisted data management, day sheet generation, crew sharing, and related tools.`,
          },
          {
            title: '3. User Accounts',
            body: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account. You must notify us immediately of any unauthorised use of your account. We reserve the right to terminate accounts that violate these terms.`,
          },
          {
            title: '4. Acceptable Use',
            body: `You agree to use the Service only for lawful purposes and in accordance with these terms. You must not use the Service to store or share content that is illegal, harmful, or infringes on the rights of others. You must not attempt to gain unauthorised access to any part of the Service or its related systems. You must not use the Service in any way that could damage, disable, or impair it.`,
          },
          {
            title: '5. Data and Privacy',
            body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these terms by reference. By using the Service, you consent to the collection and use of your data as described in the Privacy Policy. You retain ownership of all data you upload or create using the Service. You grant us a limited licence to process and store your data solely to provide the Service.`,
          },
          {
            title: '6. AI Features',
            body: `The Service uses AI to extract, interpret, and act upon data from documents you provide. While we strive for accuracy, AI extraction is not infallible. You should always review AI-generated output before relying on it for critical decisions. We are not liable for errors in AI-extracted data or for actions taken by the AI assistant on your behalf without your review.`,
          },
          {
            title: '7. Payment and Billing',
            body: `Paid plans are billed monthly or annually as selected. Prices are displayed in Australian dollars unless otherwise stated. We reserve the right to change pricing with 30 days notice. Refunds are provided at our discretion. During any free beta period, no payment is required and features may change without notice.`,
          },
          {
            title: '8. Intellectual Property',
            body: `The Service, including its design, code, and branding, is owned by us and protected by applicable intellectual property laws. You may not copy, modify, or distribute any part of the Service without our express written permission. Your data remains yours — we claim no ownership over content you create or upload.`,
          },
          {
            title: '9. Limitation of Liability',
            body: `To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, lost profits, or disruption to touring operations. Our total liability to you shall not exceed the amount you paid us in the 12 months preceding the claim.`,
          },
          {
            title: '10. Service Availability',
            body: `We aim to provide reliable, uninterrupted access to the Service but do not guarantee 100% uptime. We may perform maintenance, updates, or modifications at any time. We are not liable for any loss or inconvenience caused by downtime or service interruptions.`,
          },
          {
            title: '11. Termination',
            body: `You may cancel your account at any time. We reserve the right to suspend or terminate your account if you violate these terms or engage in conduct harmful to the Service or other users. Upon termination, you may export your data for 30 days before it is deleted.`,
          },
          {
            title: '12. Changes to Terms',
            body: `We may update these terms from time to time. We will notify users of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated terms.`,
          },
          {
            title: '13. Governing Law',
            body: `These terms are governed by the laws of Victoria, Australia. Any disputes shall be resolved in the courts of Victoria, Australia.`,
          },
          {
            title: '14. Contact',
            body: `For questions about these terms, please contact us at hello@getadvance.co.`,
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#F4EFE6' }}>{section.title}</h2>
            <p style={{ fontSize: 14, color: '#8A8580', lineHeight: 1.85 }}>{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
