import { JSDOM } from "jsdom";
import type { Plugin } from "vite";

export default function runableAnalyticsPlugin(): Plugin {
	return {
		name: "runable-analytics-plugin",
		enforce: "pre",
		async transformIndexHtml(html) {
			const applicationId = process.env.APPLICATION_ID ?? "";
			// Only inject in Runable sandbox (APPLICATION_ID is set, not empty, and not localhost)
			if (!applicationId || applicationId === "localhost") {
				return html;
			}

			const dom = new JSDOM(html);
			const doc = dom.window.document;
			const head = doc.head;

			const hostname = `${applicationId}-website`;

			const script = doc.createElement("script");
			script.defer = true;
			script.src = "/runable.js";
			script.dataset.hostname = hostname;
			script.dataset.url = "https://r.lilstts.com/events";
			head.appendChild(script);

			return dom.serialize();
		},
	};
}
