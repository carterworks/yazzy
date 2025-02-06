window.addNotification = function addNotification(message) {
	const $notificationsList = document.getElementById("notifications");
	if (!$notificationsList) {
		return;
	}
	const $notification = document.createElement("div");
	$notification.setAttribute("role", "alert");
	$notification.classList.add(
		"fixed",
		"rounded",
		"bottom-0",
		"right-0",
		"p-4",
		"m-4",
		"drop-shadow",
		"border",
		"bg-paper",
		"border-base-100",
		"dark:bg-base-900",
		"dark:border-base-900",
	);
	$notification.textContent = message;
	$notificationsList.appendChild($notification);
	setTimeout(() => {
		$notification.remove();
	}, 5000);
};
