/**
 * Static preview build (`NEXT_PUBLIC_STATIC_PREVIEW=1`, see scripts/build-preview.mjs): the page runs without the
 * Node server, so everything that needs it stays off and says so — analysis runs in the browser, tracking shows the
 * example timeline, expert requests cannot be sent, nothing is measured. Normal builds never set the flag.
 */
export const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === '1';
