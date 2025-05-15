export function formatToUserFriendlyDateTime(dateInput) {
  if (!dateInput) {
    return '';
  }

  const date = new Date(dateInput);

  const pad = (num) => (num < 10 ? '0' + num : num);

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1); // Months are zero-based
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds} Uhr`;
} 