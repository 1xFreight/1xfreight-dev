export function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = sizes[i];
  const formattedValue = (bytes / Math.pow(1024, i)).toFixed(2);

  return `${formattedValue} ${size}`;
}
