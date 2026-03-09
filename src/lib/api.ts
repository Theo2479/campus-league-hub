/**
 * CSRF-aware fetch wrapper. Drop-in replacement for fetch().
 * Reads the csrf_token cookie and sends it as X-CSRF-Token header
 * on all requests. Always includes credentials.
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Read CSRF token from cookie
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

    const headers = new Headers(options.headers || {});
    if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });
}
