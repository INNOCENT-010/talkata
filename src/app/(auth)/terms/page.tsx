export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: August 2026</p>

      {[
        {
          title: "Service",
          body: "Talkata provides AI-powered text-to-speech generation. You pay for credits which are used to generate audio. Credits do not expire."
        },
        {
          title: "Acceptable use",
          body: "You may not use Talkata to generate content that is illegal, defamatory, harassing, or infringes on intellectual property rights. You are responsible for the text you submit."
        },
        {
          title: "Credits and payments",
          body: "Credits are non-refundable except in cases of technical failure on our end. If a generation fails due to our systems, credits are automatically refunded to your account."
        },
        {
          title: "Audio ownership",
          body: "You own the audio files you generate. Talkata claims no rights over your generated content. Audio files are automatically deleted after 30 days — download anything you want to keep."
        },
        {
          title: "Service availability",
          body: "We aim for high availability but do not guarantee 100% uptime. We are not liable for losses resulting from service interruptions."
        },
        {
          title: "Account termination",
          body: "We reserve the right to terminate accounts that violate these terms. Unused credits will not be refunded upon termination for policy violations."
        },
        {
          title: "Contact",
          body: "For questions about these terms contact hello@talkata.ink"
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