/** Hash-router navigation helper shared by pages. */
export function navigate(to: string): void {
  window.location.hash = to;
}
