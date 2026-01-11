/**
 * ClaudingCopilot - Client-side JavaScript
 * Handles toasts, AJAX actions, and auto-refresh
 */

(() => {
	// ==========================================================================
	// Toast Notifications
	// ==========================================================================

	window.showToast = (message, type) => {
		type = type || "info";
		var container = document.getElementById("toast-container");
		var toast = document.createElement("div");
		toast.className = `toast toast-${type}`;

		var icons = { success: "\u2713", error: "\u2715", info: "\u2139" };
		toast.innerHTML =
			'<span class="toast-icon">' +
			icons[type] +
			"</span>" +
			"<span>" +
			message +
			"</span>" +
			'<button class="toast-close" onclick="this.parentElement.remove()">\u00d7</button>';

		container.appendChild(toast);

		setTimeout(() => {
			toast.classList.add("hiding");
			setTimeout(() => {
				toast.remove();
			}, 300);
		}, 6000);
	};

	// ==========================================================================
	// Content Refresh (AJAX)
	// ==========================================================================

	window.refreshContent = () =>
		fetch(location.href, { headers: { Accept: "text/html" } })
			.then((res) => res.text())
			.then((html) => {
				var parser = new DOMParser();
				var doc = parser.parseFromString(html, "text/html");
				var newContent = doc.getElementById("main-content");
				var oldContent = document.getElementById("main-content");
				if (newContent && oldContent) {
					oldContent.innerHTML = newContent.innerHTML;
				}
			});

	// ==========================================================================
	// API Actions
	// ==========================================================================

	window.apiAction = (url, options) => {
		options = options || {};
		var btn = options.button;
		var originalText = "";

		if (btn) {
			originalText = btn.innerHTML;
			btn.disabled = true;
			btn.innerHTML =
				'<span class="spinner"></span> ' +
				(options.loadingText || "Loading...");
		}

		return fetch(url, {
			method: options.method || "POST",
			headers: { "Content-Type": "application/json" },
			body: options.body ? JSON.stringify(options.body) : undefined,
		})
			.then((res) => res.json().then((data) => ({ ok: res.ok, data: data })))
			.then((result) => {
				if (btn) {
					btn.disabled = false;
					btn.innerHTML = originalText;
				}
				if (result.ok) {
					showToast(options.successMessage || "Action completed!", "success");
					if (options.onSuccess) options.onSuccess(result.data);
					if (options.refresh) refreshContent();
					if (options.redirect) {
						setTimeout(() => {
							location.href = options.redirect;
						}, 1250);
					}
				} else {
					showToast(result.data.error || "An error occurred", "error");
					if (options.onError) options.onError(result.data);
				}
				return result;
			})
			.catch((err) => {
				if (btn) {
					btn.disabled = false;
					btn.innerHTML = originalText;
				}
				showToast(`Network error: ${err.message}`, "error");
			});
	};

	// ==========================================================================
	// Form Submission
	// ==========================================================================

	window.submitForm = (form, options) => {
		options = options || {};
		var formData = new FormData(form);
		var body = {};

		formData.forEach((value, key) => {
			body[key] = value;
		});

		// Handle unchecked checkboxes explicitly
		form.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
			body[cb.name] = cb.checked;
		});

		var btn = form.querySelector('button[type="submit"]');

		return apiAction(options.url || form.action, {
			method: "POST",
			body: body,
			button: btn,
			loadingText: options.loadingText || "Saving...",
			successMessage: options.successMessage,
			onSuccess: options.onSuccess,
			onError: options.onError,
			refresh: options.refresh,
			redirect: options.redirect,
		});
	};

	// ==========================================================================
	// Initialization
	// ==========================================================================

	document.addEventListener("DOMContentLoaded", () => {
		var body = document.body;

		// Auto-refresh polling
		var autoRefresh = body.dataset.autoRefresh;
		if (autoRefresh) {
			var interval = parseInt(autoRefresh, 10) * 1000;
			setInterval(() => {
				var indicator = document.querySelector(
					".polling-indicator span:last-child",
				);
				if (indicator) indicator.textContent = "Refreshing...";
				refreshContent()
					.then(() => {
						if (indicator) indicator.textContent = "Auto-refresh active";
					})
					.catch(() => {
						if (indicator) indicator.textContent = "Refresh failed";
					});
			}, interval);
		}

		// Flash message from server
		var flash = body.dataset.flash;
		if (flash) {
			try {
				var msg = JSON.parse(flash);
				showToast(msg.message, msg.type);
			} catch (e) {
				console.error("Invalid flash data:", e);
			}
		}
	});
})();
