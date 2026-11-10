import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appTheme } from './index';
import { colors, colorVars, fonts } from './tokens';

const tokensCss = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf8');
const mockupCss = resolve(__dirname, '../../../docs/design/mockups-v2/tokens.css');

function cssVar(css: string, name: string): string | null {
  const m = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

describe('token Sổ Tín Dụng: một nguồn', () => {
  it('mọi màu trong tokens.ts khớp tokens.css', () => {
    for (const [key, name] of Object.entries(colorVars)) {
      const hex = cssVar(tokensCss, name);
      expect(hex?.toUpperCase(), name).toBe(colors[key as keyof typeof colors].toUpperCase());
    }
  });

  it('tokens.css không lệch bản mockup khi còn tồn tại', () => {
    let mock: string;
    try {
      mock = readFileSync(mockupCss, 'utf8');
    } catch {
      return;
    }
    expect(tokensCss.replace(/\s+/g, '')).toBe(mock.replace(/\s+/g, ''));
  });

  it('phông trong tokens.css khớp tokens.ts', () => {
    const norm = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, '');
    expect(norm(cssVar(tokensCss, '--font-body'))).toBe(norm(fonts.body));
    expect(norm(cssVar(tokensCss, '--font-num'))).toBe(norm(fonts.num));
  });
});

describe('theme Ant Design', () => {
  it('token chung đúng thiết kế v2', () => {
    expect(appTheme.token).toMatchObject({
      colorPrimary: '#14284B',
      colorInfo: '#1D4F91',
      colorSuccess: '#1B6A3F',
      colorWarning: '#8F5400',
      colorError: '#A8281D',
      colorBgLayout: '#F1F2EE',
      colorBgContainer: '#FBFBF8',
      colorText: '#1B2430',
      colorTextSecondary: '#434C5A',
      colorBorder: '#6F7660',
      colorBorderSecondary: '#D3D7CC',
      borderRadius: 6,
      fontSize: 14,
      controlHeight: 36,
    });
    expect(String(appTheme.token?.fontFamily)).toContain('Be Vietnam Pro');
  });

  it('component token cho các thành phần được yêu cầu', () => {
    const c = appTheme.components as Record<string, Record<string, unknown>>;
    for (const name of ['Button', 'Input', 'Select', 'Table', 'Tabs', 'Tag', 'Badge', 'Steps', 'Segmented', 'Modal', 'Drawer', 'Message', 'Alert']) {
      expect(c[name], name).toBeTruthy();
    }
    expect(c.Table.headerBg).toBe('#F5F6F2');
    expect(c.Tabs.inkBarColor).toBe('#B08A3E');
  });

  it('phông tự lưu: fonts.css không trỏ ra ngoài', () => {
    const css = readFileSync(resolve(__dirname, '../styles/fonts.css'), 'utf8');
    expect(css).not.toMatch(/https?:\/\//);
    expect(css).toContain('Newsreader');
    expect(css).toContain('IBM Plex Mono');
    expect(css).toMatch(/vietnamese/);
  });
});
