export const isDateValid = (date, validUntil) => {
  const currentDate = new Date(date);
  const validUntilDate = new Date(validUntil);

  return (
    (currentDate.getFullYear() === validUntilDate.getFullYear() &&
      currentDate.getMonth() === validUntilDate.getMonth() &&
      currentDate.getDate() === validUntilDate.getDate()) ||
    currentDate < validUntilDate
  );
};

export function formatDate(dateString) {
  if (!dateString) return;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return;

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  // @ts-ignore
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function chatDateFormat(dateString) {
  const date = new Date(dateString);

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}.${month}.${year} - ${hours}:${minutes}`;
}
