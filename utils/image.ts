
const getAbsoluteImageUrl = (relativePath: string | undefined): string => {
  if (!relativePath) {
    return '';
  }

  // If the path is already an absolute URL, return it as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Prepend the base URL from environment variables
  const baseUrl = process.env.VITE_APP_BASE_URL || '';

  // Ensure base URL doesn't end with a slash and relativePath starts with one
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanRelativePath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  return `${cleanBaseUrl}${cleanRelativePath}`;
};

export default getAbsoluteImageUrl;
