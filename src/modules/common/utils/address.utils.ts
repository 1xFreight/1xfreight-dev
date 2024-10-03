export function shortAddress(address: string) {
  if (!address) return;

  const addressInParts = address.split(',');

  if (addressInParts.length <= 3) return address;

  if (addressInParts[addressInParts.length - 1].trim().length == 2) {
    return [
      addressInParts[addressInParts.length - 2].trim(),
      addressInParts[addressInParts.length - 1],
    ].join(',');
  } else {
    return [
      addressInParts[addressInParts.length - 3].trim(),
      addressInParts[addressInParts.length - 2],
      addressInParts[addressInParts.length - 1],
    ].join(',');
  }
}
