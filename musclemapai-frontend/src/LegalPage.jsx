import { Link, useLocation } from "react-router-dom";
import bg from "./background-minimal.png";

const LAST_UPDATED = "September 7, 2026";

function PrivacyPolicy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <h2>What this covers</h2>
      <p>
        This policy explains how MuscleMap AI collects, uses, stores, and shares
        information when you use the service. MuscleMap AI is a general
        wellness and fitness assistant, not a healthcare provider.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account information, including your email address and authentication data.</li>
        <li>Messages, conversation titles, preferences, and settings you submit.</li>
        <li>Fitness, wellness, body-area, and injury information you choose to include in a conversation.</li>
        <li>Technical information needed to operate and protect the service, such as request and rate-limit information.</li>
        <li>Limited usage information through Vercel Analytics, subject to Vercel&apos;s policies.</li>
      </ul>

      <h2>How we use information</h2>
      <p>
        We use information to authenticate you, provide and personalize the
        service, generate responses, remember context when you enable AI memory,
        prevent abuse, maintain security, troubleshoot failures, and improve the
        product. We do not use your conversations to make medical decisions.
      </p>

      <h2>Service providers</h2>
      <p>
        We use Supabase for authentication and account data, Vercel for hosting
        and analytics, and third-party AI providers to generate responses. Your
        prompts may be sent to those AI providers to fulfill your request. We
        expect providers to process information only as needed to provide their
        services, but no internet service can guarantee absolute security.
      </p>

      <h2>Storage and deletion</h2>
      <p>
        Conversations and optional AI memory are associated with your account.
        You can delete individual conversations, clear AI memory, or delete your
        account from Account Settings. Account deletion is intended to remove
        your account and associated service data, subject to limited records we
        may retain when required by law or needed to prevent fraud and abuse.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        delete, restrict, or export personal information, or object to certain
        processing. Contact us at support@musclemap.ai to make a request. We may
        need to verify your identity before responding.
      </p>

      <h2>Children</h2>
      <p>
        The service is not directed to children under 13, and we do not
        knowingly collect personal information from them.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update this policy as the service changes. We will update the
        date above and provide additional notice when appropriate. Questions can
        be sent to support@musclemap.ai.
      </p>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <h2>Agreement</h2>
      <p>
        By creating an account or using MuscleMap AI, you agree to these Terms
        of Service and our Privacy Policy. If you do not agree, do not use the
        service.
      </p>

      <h2>Wellness information only</h2>
      <p>
        MuscleMap AI provides general fitness and wellness information. It does
        not provide medical advice, diagnosis, treatment, or emergency services.
        Do not rely on a response for an injury, medical condition, medication,
        or urgent situation. Consult a qualified healthcare professional, and
        seek emergency help when appropriate. Stop an activity if it causes pain
        or concerning symptoms.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for keeping your credentials secure and for activity
        under your account. Provide accurate information, use only one account
        for yourself, and tell us promptly if you believe your account has been
        compromised.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not abuse, disrupt, reverse engineer, scrape, overload, or attempt to
        bypass security controls; submit unlawful or harmful material; infringe
        another person&apos;s rights; or use the service to provide professional
        medical care or make decisions that could harm someone.
      </p>

      <h2>Your content</h2>
      <p>
        You retain rights to content you submit. You give us the limited rights
        needed to host, process, secure, and display that content to provide the
        service. You are responsible for having the rights to submit it and for
        not including information about another person without permission.
      </p>

      <h2>AI-generated responses</h2>
      <p>
        Responses may be incomplete, inaccurate, or inappropriate. Review them
        critically and use your own judgment. We do not guarantee that any
        response is correct, safe, available, or suitable for your circumstances.
      </p>

      <h2>Availability and liability</h2>
      <p>
        The service is provided on an "as is" and "as available" basis to the
        fullest extent permitted by law. To the fullest extent permitted by law,
        MuscleMap AI is not liable for indirect, incidental, special,
        consequential, or punitive damages arising from your use of the service.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        We may suspend or terminate access for violating these terms, creating
        risk, or as needed to operate the service. You may stop using the
        service and delete your account at any time.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms by posting a revised version with a new date.
        Continued use after an update means you accept the revised terms.
        Questions can be sent to support@musclemap.ai.
      </p>
    </>
  );
}

export default function LegalPage() {
  const { pathname } = useLocation();
  const isPrivacy = pathname === "/privacy";

  return (
    <div className="page legal-page" style={{ backgroundImage: `url(${bg})` }}>
      <main className="legal-card">
        <div className="legal-content">
          {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
        </div>
        <div className="legal-footer">
          <Link to="/">Back to MuscleMap AI</Link>
          <span aria-hidden="true">·</span>
          <Link to={isPrivacy ? "/terms" : "/privacy"}>
            {isPrivacy ? "Terms of Service" : "Privacy Policy"}
          </Link>
        </div>
      </main>
    </div>
  );
}