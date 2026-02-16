// Converted to Server Component for better performance

import LegalLayout from "@/components/LegalLayout";

export default function RefundPolicyPage() {
    return (
        <LegalLayout title="Refund Policy" lastUpdated="February 2025">
            <section>
                <p>
                    TopickX offers refunds under specific circumstances outlined below. We strive to ensure our clients are satisfied with our multi-platform marketing services.
                </p>

                <h2>1. Eligibility for Refunds</h2>

                <h3>1.1 Service Issues</h3>
                <p>Refunds may be granted if services were not delivered as described, technical issues prevented service delivery, or we failed to meet our service obligations.</p>

                <h3>1.2 Time Period</h3>
                <p>Refund requests must be submitted within <strong>30 days</strong> of service payment.</p>

                <h3>1.3 Non-Refundable Items</h3>
                <ul>
                    <li>Ad spend budgets (paid directly to Google/Meta)</li>
                    <li>Completed setup work</li>
                    <li>Custom creative services (if purchased)</li>
                    <li>Used service periods</li>
                    <li>Third-party service fees</li>
                </ul>

                <h2>2. Refund Process</h2>
                <p>
                    Submit refund requests to: <strong>hello@topickx.com</strong>. Please include your account information, invoice details, the reason for the request, and any supporting documentation.
                </p>
                <p>
                    We review requests within 5-7 business days, and approved refunds are processed within 14 business days to the original payment method.
                </p>

                <h2>3. Partial Refunds</h2>
                <p>
                    Partial refunds may be offered for unused service portions, when partial service was delivered, or as goodwill gestures for service issues.
                </p>

                <h2>4. Cancellation vs. Refund</h2>
                <ul>
                    <li><strong>Cancellation:</strong> Stops future billing (requires 30 days notice).</li>
                    <li><strong>Refund:</strong> Returns money for services already paid.</li>
                </ul>

                <h2>5. Contact</h2>
                <p><strong>Email:</strong> hello@topickx.com</p>
            </section>
        </LegalLayout>
    );
}
