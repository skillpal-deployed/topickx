// Global type declarations for third-party SDKs injected by script tags

declare global {
    interface Window {
        /**
         * Facebook Pixel tracking function.
         * Injected globally by the Meta Pixel script on landing pages.
         * Declaring here prevents the need for `(window as any).fbq` casts.
         */
        fbq: (...args: unknown[]) => void;

        /**
         * Google Tag / Analytics / Ads tracking function.
         * Injected globally by gtag.js via layout.tsx and per-landing-page scripts.
         * Declaring here prevents the need for `(window as any).gtag` casts.
         */
        gtag: (...args: unknown[]) => void;

        /**
         * Google Tag Manager dataLayer array.
         */
        dataLayer: unknown[];
    }
}

export { };
