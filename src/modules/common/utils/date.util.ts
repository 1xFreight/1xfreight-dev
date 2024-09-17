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
