/**
 * Field names shared by the public feedback form and the route that receives it.
 * Deliberately neutral-looking: a honeypot named "honeypot" is a honeypot no bot falls
 * into. Kept in its own module so the renderer does not have to pull in the server-only
 * token code.
 */
export const HONEYPOT_FIELD = "company";
