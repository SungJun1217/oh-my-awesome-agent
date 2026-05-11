/**
 * Session utilities for oh-my-awesome-agent commands.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function compactTask(args: string, fallback: string): string {
	return args.trim() || fallback;
}

export function setCommandSessionName(
	pi: ExtensionAPI,
	command: string,
	args: string,
): void {
	const trimmed = args.trim();
	pi.setSessionName(trimmed ? `${command}: ${trimmed.slice(0, 60)}` : command);
}
