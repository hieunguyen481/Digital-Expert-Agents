import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shbTheme } from './index';

describe('theme theo design-system', () => {
  it('token AntD đúng giá trị', () => {
    expect(shbTheme.token).toMatchObject({
      colorPrimary: '#C44D0E',
      colorLink: '#2F2E79',
      colorBgLayout: '#F6F4F0',
      colorBorderSecondary: '#F0EBE4',
      borderRadius: 8,
      fontSize: 14,
      fontSizeHeading4: 20,
      fontSizeHeading5: 16,
      controlHeight: 36,
      controlHeightSM: 30,
    });
    expect(String(shbTheme.token?.fontFamily)).toContain('Be Vietnam Pro');
  });

  it('global.css khai báo biến khung', () => {
    const css = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8');
    for (const v of ['--cta:', '--canvas:', '--ai:', '--rail-w: 64px', '--topbar-h: 56px', '--ai-w: 408px']) {
      expect(css).toContain(v);
    }
  });
});
