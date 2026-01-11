import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export type FlashType = "success" | "error" | "info";

export interface FlashMessage {
	message: string;
	type: FlashType;
}

const FLASH_COOKIE_NAME = "flash";

/**
 * Set a flash message that will be displayed on the next page load.
 * The message is stored in a cookie and automatically deleted after being read.
 */
export function setFlash(
	c: Context,
	message: string,
	type: FlashType = "info",
): void {
	const flash: FlashMessage = { message, type };
	setCookie(c, FLASH_COOKIE_NAME, JSON.stringify(flash), {
		path: "/",
		maxAge: 60, // 1 minute max
		httpOnly: true,
		sameSite: "Lax",
	});
}

/**
 * Get and consume the flash message from the cookie.
 * Returns null if no flash message exists.
 * The cookie is automatically deleted after reading.
 */
export function getFlash(c: Context): FlashMessage | null {
	const cookie = getCookie(c, FLASH_COOKIE_NAME);
	if (!cookie) return null;

	try {
		const flash = JSON.parse(cookie) as FlashMessage;
		deleteCookie(c, FLASH_COOKIE_NAME, { path: "/" });
		return flash;
	} catch {
		deleteCookie(c, FLASH_COOKIE_NAME, { path: "/" });
		return null;
	}
}

export const flash = {
	success: (c: Context, message: string) => setFlash(c, message, "success"),
	error: (c: Context, message: string) => setFlash(c, message, "error"),
	info: (c: Context, message: string) => setFlash(c, message, "info"),
};
