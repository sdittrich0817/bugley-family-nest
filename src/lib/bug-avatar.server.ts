import type { ChildProfile } from './family';
import { signPaths } from './images.server';
export async function signBugAvatars(children: ChildProfile[], parentId: string) {
  return Promise.all(children.map(async c => {
    const path = c.bug?.imagePath;
    if (!c.bug || !path?.startsWith(`${parentId}/${c.id}/`) || path.includes('..')) return c;
    const [imageUrl] = await signPaths([path]);
    return { ...c, bug: { ...c.bug, imageUrl } };
  }));
}