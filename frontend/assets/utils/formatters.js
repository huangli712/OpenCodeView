export function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(date) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0 && m === 0) return "0 minutes";

  const parts = [];
  if (h > 0) parts.push(`${h} hours`);
  if (m > 0) parts.push(`${m} minutes`);

  return parts.join(" ");
}

export function formatRole(role) {
  const roleMap = {
    "user": "User",
    "assistant": "Assistant",
    "system": "System"
  };
  return roleMap[role] || role;
}

export function truncate(str, length) {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + "...";
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
