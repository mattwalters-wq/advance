"use client";
import Link from "next/link";

const INK = "#1a1a1a";
const CREAM = "#F5F0E8";
const SLATE = "#5A5A6E";

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif", fontSize: 16, color: INK, marginBottom: 8 }}>{title}</h3>
    <div style={{ fontSize: 13, color: INK + "CC", lineHeight: 1.7 }}>{children}</div>
  </div>
);

export default function TermsPage() {
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
          terms of use
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 32 }}>
          last updated: march 2026
        </div>

        <Section title="welcome">
          by using stamps land you agree to these terms. if you don't agree, please don't use the platform. it's pretty simple - be a good human and we'll all have a great time.
        </Section>

        <Section title="your account">
          you're responsible for keeping your login details secure. one account per person. don't share your account or let others post on your behalf. if you think someone has accessed your account, reset your password immediately.
        </Section>

        <Section title="community guidelines">
          stamps land is a positive space for fans of The Stamps. when you post, comment, or interact, please be respectful to other members and the band. don't post spam, hate speech, harassment, explicit content, or anything illegal. don't impersonate the band or other members. we reserve the right to remove content or accounts that violate these guidelines.
        </Section>

        <Section title="your content">
          when you post on stamps land, you retain ownership of your content. however, you grant us a licence to display it within the platform. don't post content you don't have the rights to (e.g. copyrighted music, images you didn't take). you can delete your own posts at any time.
        </Section>

        <Section title="stamps and rewards">
          stamps are earned through activity on the platform and have no monetary value. they cannot be exchanged for cash. reward tiers are subject to availability and may change. the band reserves the right to modify the stamps system, reward tiers, and point values at any time. physical rewards (t-shirts, vinyl) are subject to shipping availability.
        </Section>

        <Section title="the band's content">
          content posted by The Stamps (including exclusive content, voice memos, demos, and images) is their intellectual property. don't redistribute, record, screenshot, or share exclusive content outside of stamps land.
        </Section>

        <Section title="availability">
          we aim to keep stamps land running smoothly but can't guarantee 100% uptime. we may need to take the platform offline for maintenance occasionally.
        </Section>

        <Section title="changes">
          we may update these terms from time to time. we'll notify you of significant changes through the app.
        </Section>

        <Section title="contact">
          questions about these terms? reach out to the stamps management team.
        </Section>
      </div>
    </div>
  );
}
