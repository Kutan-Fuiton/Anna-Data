/**
 * URL Utilities
 * Handles username-based URL generation and validation
 */

/**
 * Convert display name to URL-friendly slug
 * "John Doe" → "johndoe"
 */
export function nameToSlug(displayName: string | null | undefined): string {
    if (!displayName) return 'user';
    return displayName
        .toLowerCase()
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/[^a-z0-9]/g, ''); // Remove special characters
}

/**
 * Get the student panel URL for a user
 */
export function getStudentUrl(displayName: string | null | undefined): string {
    return `/${nameToSlug(displayName)}`;
}

/**
 * Get the admin panel URL for a user
 */
export function getAdminUrl(displayName: string | null | undefined): string {
    return `/${nameToSlug(displayName)}/admin`;
}
