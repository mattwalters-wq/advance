"use client";
import Link from "next/link";

const INK = "#1a1a1a";
const CREAM = "#F5F0E8";
const SLATE = "#5A5A6E";
const OFF_WHITE = "#FAF8F4";
const DARK_CREAM = "#EDE6D8";

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif", fontSize: 16, color: INK, marginBottom: 8 }}>{title}</h3>
    <div style={{ fontSize: 13, color: INK + "CC", lineHeight: 1.7 }}>{children}</div>
  </div>
);

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px 80px" }}>
        <Link href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, textDecoration: "none", display: "block", marginBottom: 24 }}>
          ← back to stamps land
        </Link>

        <div style={{
          fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif",
          fontSize: 28, color: INK, fontWeight: 900, marginBottom: 6,
        }}>
          privacy policy
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 32 }}>
          last updated: march 2026
        </div>

        <Section title="who we are">
          stamps land is a community platform operated by The Stamps and their management team. we take your privacy seriously and want you to understand how we handle your information.
        </Section>

        <Section title="what we collect">
          when you sign up, we collect your email address and display name. if you sign in with Google, we receive your name and email from your Google account. we also collect content you create (posts, comments, images), your stamp balance and activity, and your city if you choose to add it to your profile. for reward claims that involve physical items, we collect shipping details (name, address, city, country, postcode).
        </Section>

        <Section title="how we use it">
          we use your information to run stamps land - showing your posts, tracking your stamps, delivering rewards, and sending you notifications within the app. we use your email to authenticate your account and send password reset links. if you subscribe to our mailing list on the landing page, we use your email to send occasional updates about new music, shows, and drops.
        </Section>

        <Section title="what we don't do">
          we don't sell your data to anyone. we don't share your information with advertisers. we don't use your data for targeted advertising. we don't track you across other websites.
        </Section>

        <Section title="where your data lives">
          your data is stored securely on Supabase (hosted on AWS in the Sydney region). images you upload are stored in Supabase Storage. the app is hosted on Vercel.
        </Section>

        <Section title="your rights">
          you can edit your profile information at any time. you can delete your own posts and comments. if you want to delete your account entirely, contact us and we'll remove all your data. if you're in the EU, you have additional rights under GDPR including the right to access, rectify, and erase your personal data.
        </Section>

        <Section title="cookies">
          we use essential cookies to keep you logged in. we don't use tracking cookies or analytics cookies.
        </Section>

        <Section title="children">
          stamps land is not intended for users under 13. if you're under 13, please don't sign up.
        </Section>

        <Section title="changes">
          if we make significant changes to this policy, we'll let you know through the app. your continued use of stamps land after changes means you accept the updated policy.
        </Section>

        <Section title="contact">
          questions about your privacy? reach out to the stamps management team.
        </Section>
      </div>
    </div>
  );
}
