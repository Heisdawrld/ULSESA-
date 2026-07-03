/**
 * ULSESA Support – WhatsApp helpers.
 *
 * All support / complaints / contact-help CTAs across the platform route to a
 * direct WhatsApp chat with the developer (David) at +234 811 702 4699.
 *
 * The Nigerian number 08117024699 → drop the leading 0 and prefix with 234
 * to form the wa.me international format: 2348117024699.
 */

/** Direct wa.me link with no pre-filled message. */
export const SUPPORT_WHATSAPP_URL = "https://wa.me/2348117024699"

/** The friendly Nigerian display form of David's number. */
export const SUPPORT_PHONE_DISPLAY = "08117024699"

/** International form used by wa.me (no +, no spaces). */
export const SUPPORT_PHONE_INTERNATIONAL = "2348117024699"

/**
 * Build a wa.me URL with an optional pre-filled, URL-encoded message.
 *
 * @example
 * supportWhatsAppUrl("Hi David, I need help with the ULSESA portal.")
 * // → "https://wa.me/2348117024699?text=Hi%20David%2C%20I%20need%20..."
 */
export function supportWhatsAppUrl(message?: string): string {
  if (!message) return SUPPORT_WHATSAPP_URL
  return `https://wa.me/${SUPPORT_PHONE_INTERNATIONAL}?text=${encodeURIComponent(message)}`
}

/** Pre-baked support messages for common contexts. */
export const SUPPORT_MESSAGES = {
  general: "Hi David, I need help with the ULSESA portal.",
  account: "Hi David, I'm having trouble with my ULSESA account.",
  complaint: "Hi David, I'd like to make a complaint about...",
  password: "Hi David, I forgot my ULSESA portal password and need help resetting it.",
  question: "Hi David, I have a question about ULSESA.",
} as const
