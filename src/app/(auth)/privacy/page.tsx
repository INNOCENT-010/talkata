export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: August 2026</p>

      {[
        {
          title: "What we collect",
          body: "We collect your email address, name, and the text you submit for voice generation. We store generated audio files temporarily for 30 days."
        },
        {
          title: "How we use it",
          body: "Your data is used solely to provide the Talkata service — generating audio from your text, managing your account and credits, and sending transactional emails about your generations."
        },
        {
          title: "Your audio",
          body: "Audio files you generate are stored on Cloudflare R2 and automatically deleted after 30 days. We do not use your text or audio for training AI models."
        },
        {
          title: "Third parties",
          body: "We use Supabase for authentication and database, Cloudflare R2 for storage, Paystack for payments, and Resend for email. None of your data is sold to third parties."
        },
        {
          title: "Your rights",
          body: "You can delete your account and all associated data at any time by contacting us at hello@talkata.ink. We will process deletion requests within 7 days."
        },
        {
          title: "Contact",
          body: "For privacy questions contact hello@talkata.ink"
        }
      ].map(({ title, body }) => (
        <div key={title} className="mb-8">
          <h2 className="text-white font-semibold text-lg mb-2">{title}</h2>
          <p className="text-white/50 leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  )
}