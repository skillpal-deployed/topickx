// Global type declarations for third-party SDKs injected by script tags

declare global {
    interface Window {
        /**
         * Facebook Pixel tracking function.
         * Injected globally by the Meta Pixel script on landing pages.
         * Declaring here prevents the need for `(window as any).fbq` casts.
         */
        fbq: (...args: unknown[]) => void;
    }
}

export { };
