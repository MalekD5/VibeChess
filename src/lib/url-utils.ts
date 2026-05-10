export function appendInviteParam(url: string, inviteToken?: string): string {
  if (!inviteToken) return url;
  return `${url}${url.includes('?') ? '&' : '?'}invite=${encodeURIComponent(inviteToken)}`;
}
