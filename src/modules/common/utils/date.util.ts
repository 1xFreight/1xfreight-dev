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

export function formatTime(timeString) {
  if (!timeString) return;

  const timeParts = timeString.split(' ');
  const timeMidday = timeParts[1];
  const onlyTime = timeParts[0].split(':');

  // Properly format hours and minutes
  const formattedHours =
    Number(onlyTime[0]) < 10 ? '0' + Number(onlyTime[0]) : onlyTime[0];
  const formattedMinutes =
    Number(onlyTime[1]) < 10 ? '0' + Number(onlyTime[1]) : onlyTime[1];

  return `${formattedHours}:${formattedMinutes} ${timeMidday}`;
}

export function formatDateTime(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);

  const options = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  } as Intl.DateTimeFormatOptions;

  return date.toLocaleString('en-US', options);
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
