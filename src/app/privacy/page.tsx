import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div style={{ background: '#0F0E0C', minHeight: '100vh', fontFamily: '"Georgia", serif', color: '#F4EFE6' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>

      <nav style={{ padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E1C18' }}>
        <Link href="/" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#F4EFE6', textDecoration: 'none' }}>Advance</Link>
        <Link href="/" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#6A6058', textDecoration: 'none' }}>← BACK</Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 16 }}>LEGAL</div>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 40, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: '#4A4540', marginBottom: 48, fontFamily: 'monospace' }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Who We Are',
            body: `Advance ("we", "us", "our") operates the tour management platform at getadvance.co. We are based in Victoria, Australia. For privacy-related enquiries, contact us at hello@getadvance.co.`,
          },
          {
            title: '2. What Data We Collect',
            body: `We collect information you provide directly: your name, email address, and password when you create an account; tour and artist data you enter or import, including show schedules, travel details, hotel bookings, and contact information; documents you upload for AI processing; messages you send through the AI assistant; and payment information processed securely through our payment provider (we do not store card details directly).\n\nWe also collect usage data automatically: pages visited, features used, browser and device type, IP address, and crash reports. This helps us improve the Service.`,
          },
          {
            title: '3. How We Use Your Data',
            body: `We use your data to provide and operate the Service; to process documents and extract tour information using AI; to send important account and service notifications; to improve the Service through aggregated, anonymised usage analysis; to respond to support requests; and to process payments.\n\nWe do not sell your data to third parties. We do not use your data for advertising purposes.`,
          },
          {
            title: '4. AI Processing',
            body: `Documents and messages you submit are processed by Anthropic's Claude AI to extract and interpret tour information. Data sent to Claude is processed in accordance with Anthropic's privacy policy and data processing terms. We do not use your data to train AI models. Processed documents are not retained beyond what is needed to complete the extraction.`,
          },
          {
            title: '5. Data Storage and Security',
            body: `Your data is stored securely using Supabase, a cloud database service. Data is stored in servers located in the United States. We use industry-standard encryption for data in transit and at rest. Access to your data is restricted to you and team members you explicitly invite. We implement reasonable security measures, but no system is completely secure — please use a strong, unique password.`,
          },
          {
            title: '6. Data Sharing',
            body: `We share your data with a small number of trusted third-party services necessary to operate the platform: Supabase for data storage, Anthropic for AI processing, and Stripe for payment processing. We may also share data if required by law or to protect our legal rights. We do not share your data with any other parties.`,
          },
          {
            title: '7. Crew Share Links',
            body: `When you generate a crew share link for a tour, that link provides read-only access to certain tour information without requiring a login. You control who you share these links with. We recommend treating these links as semi-private and not posting them publicly.`,
          },
          {
            title: '8. Your Rights',
            body: `You have the right to access the personal data we hold about you; to correct inaccurate data; to request deletion of your data; to export your data in a portable format; and to withdraw consent for optional data processing at any time.\n\nTo exercise any of these rights, contact us at hello@getadvance.co. We will respond within 30 days.`,
          },
          {
            title: '9. Data Retention',
            body: `We retain your data for as long as your account is active. If you cancel your account, we retain your data for 30 days to allow for export, after which it is permanently deleted. Aggregated, anonymised usage data may be retained indefinitely.`,
          },
          {
            title: '10. Cookies',
            body: `We use essential cookies to keep you logged in and to maintain your session. We do not use advertising or tracking cookies. You can configure your browser to block cookies, but this may prevent the Service from working correctly.`,
          },
          {
            title: '11. Children',
            body: `The Service is not directed at children under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.`,
          },
          {
            title: '12. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time. We will notify users of significant changes via email or in-app notification. The date at the top of this page reflects when it was last updated.`,
          },
          {
            title: '13. Contact',
            body: `For privacy questions or concerns, contact us at hello@getadvance.co. For formal privacy complaints in Australia, you may also contact the Office of the Australian Information Commissioner at oaic.gov.au.`,
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#F4EFE6' }}>{section.title}</h2>
            {section.body.split('\n\n').map((para, pi) => (
              <p key={pi} style={{ fontSize: 14, color: '#8A8580', lineHeight: 1.85, marginBottom: pi < section.body.split('\n\n').length - 1 ? 14 : 0 }}>{para}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
