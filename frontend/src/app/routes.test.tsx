import { describe, expect, it } from 'vitest';
import { routeObjects } from './routes';

describe('routes', () => {
  it('/ chuyển sang /viec-cua-toi trong layout route', () => {
    const layout = routeObjects.find((r) => r.children);
    const root = layout?.children?.find((c) => c.path === '/');
    expect(root).toBeDefined();
    const paths = layout?.children?.map((c) => c.path);
    expect(paths).toEqual(expect.arrayContaining(['/viec-cua-toi', '/chat', '/dashboard']));
  });
});
