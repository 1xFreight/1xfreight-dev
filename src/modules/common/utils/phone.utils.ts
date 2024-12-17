export function formatPhoneNumber(number) {
  if (!number) return undefined;

  // Ensure the number is a string
  const str = number.toString();
  // Format it as (541) 371-7730
  return `(${str.slice(0, 3)}) ${str.slice(3, 6)}-${str.slice(6)}`;
}
