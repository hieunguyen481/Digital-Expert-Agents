import { cloneElement, isValidElement } from 'react';
import type { PaginationProps } from 'antd';

const NAMES: Record<string, string> = { prev: 'Trang trước', next: 'Trang sau', 'jump-prev': 'Lùi 5 trang', 'jump-next': 'Tới 5 trang' };

/** Nút trước/sau của phân trang có tên truy cập (WCAG 4.1.2). */
export const paginationItemRender: PaginationProps['itemRender'] = (page, type, element) => {
  const name = NAMES[type];
  if (name && isValidElement(element)) return cloneElement(element as React.ReactElement<{ 'aria-label'?: string }>, { 'aria-label': name });
  void page;
  return element;
};
