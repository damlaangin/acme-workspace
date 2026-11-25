export const normalizePath = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && parts[0].length <= 5) {
    return "/" + parts.slice(1).join("/");
  }
  return pathname;
};
  