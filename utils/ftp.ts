export const getFtpViewUrl = (filePath: string): string => {
  if (!filePath) {
    return '';
  }
  // The path can be the full path from the FTP root.
  // We just need to construct the query URL.
  return `/api/ftp/view?filePath=${encodeURIComponent(filePath)}`;
};
