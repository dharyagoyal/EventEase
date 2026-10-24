export function displayNameFromEmail(email) {
  if (!email || typeof email !== "string") {
    return "there";
  }

  const atIndex = email.indexOf("@");
  const localPart = atIndex !== -1 ? email.slice(0, atIndex) : email;

  const parts = localPart
    .split(/[._\-\d]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "there";
  }

  return parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}
