import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// Trang Thông báo, Khách hàng, Quản trị, Hồ sơ của phòng và ô tìm kiếm: dữ liệu thật qua API, chỉ đọc (không cần nạp lại seed).

test('quản trị: trang Quản trị chỉ đọc, có người dùng, ma trận quyền, ngưỡng và cấu hình AI không lộ khóa', async ({ page }) => {
  await loginAs(page, 'quantri');
  await page.goto('/quan-tri');
  await expect(page.getByRole('region', { name: 'Người dùng và vai' }).getByRole('cell').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ma trận quyền' }).getByRole('cell').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ngưỡng cấp phê duyệt' })).toContainText('Cấp 1');
  const ai = page.getByRole('region', { name: 'Cấu hình AI' });
  await expect(ai).toBeVisible();
  await expect(ai).not.toContainText(/sk-|api[_ ]?key|secret/i);
  await expect(page.getByRole('button', { name: /Lưu|Sửa|Thêm/ })).toHaveCount(0); // không có chức năng sửa
});

test('quản trị: nút "Mở Quản trị" ở trang không có quyền dẫn tới trang Quản trị', async ({ page }) => {
  await loginAs(page, 'quantri');
  await page.goto('/viec-cua-toi');
  await page.getByRole('button', { name: 'Mở Quản trị' }).click();
  await expect(page).toHaveURL(/\/quan-tri/);
});

test('trưởng phòng: "Hồ sơ của phòng" liệt kê hồ sơ đang mở của phòng và mở được hồ sơ', async ({ page }) => {
  await loginAs(page, 'truongphong');
  await expect(page.getByRole('heading', { level: 1, name: 'Hồ sơ của phòng' })).toBeVisible();
  const first = page.locator('a[href^="/ho-so-vay/"]').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/ho-so-vay\/[0-9a-f-]{36}/);
  await expect(page.getByTestId('actions-panel').or(page.getByRole('heading', { level: 1 })).first()).toBeVisible();
});

test('trưởng phòng: tìm theo tên khách ở thanh trên ra hồ sơ và mở được khách hàng trong phòng', async ({ page }) => {
  await loginAs(page, 'truongphong');
  const box = page.getByRole('combobox', { name: 'Tìm kiếm' });
  await box.fill('Mekong');
  const results = page.getByRole('listbox', { name: 'Kết quả tìm kiếm' });
  await expect(results.locator('a').first()).toBeVisible();
  await results.locator('a[href^="/customer/"]').first().click();
  await expect(page).toHaveURL(/\/customer\/[0-9a-f-]{36}/);
  await expect(page.getByText('Không tìm thấy nội dung')).toHaveCount(0);
});

test('qhkh: tìm bằng mã hồ sơ ra đúng hồ sơ; từ khóa lạ báo không có kết quả', async ({ page }) => {
  await loginAs(page, 'qhkh');
  const box = page.getByRole('combobox', { name: 'Tìm kiếm' });
  await box.fill('HSV-2026');
  const results = page.getByRole('listbox', { name: 'Kết quả tìm kiếm' });
  await expect(results.locator('a[href^="/ho-so-vay/"]').first()).toBeVisible();
  await box.fill('zzzkhongcoai');
  await expect(results).toContainText('Không có kết quả');
});

test('qhkh: danh sách Khách hàng không có khách mẫu benchmark và mở được chi tiết', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/khach-hang');
  await expect(page.getByRole('heading', { level: 1, name: 'Khách hàng SME' })).toBeVisible();
  const table = page.getByRole('region', { name: 'Danh sách khách hàng' });
  await expect(table.locator('tbody tr').first()).toBeVisible();
  await expect(table).not.toContainText(/benchmark/i);
  await table.locator('a[href^="/customer/"]').first().click();
  await expect(page).toHaveURL(/\/customer\/[0-9a-f-]{36}/);
});

test('thẩm định: trang Thông báo hiện danh sách thật hoặc trạng thái trống, không lỗi', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto('/thong-bao');
  await expect(page.getByRole('heading', { level: 1, name: 'Thông báo' })).toBeVisible();
  await expect(page.getByTestId('notification-page-list').or(page.getByText('Chưa có thông báo'))).toBeVisible();
  await expect(page.getByText('Không tải được thông báo')).toHaveCount(0);
});
