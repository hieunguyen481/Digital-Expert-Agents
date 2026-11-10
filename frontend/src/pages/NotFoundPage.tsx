import { HomeOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SHBLogo } from '@/components/common/SHBLogo';
import { StateBlock } from '@/components/ui/StateBlock';

/** Trang 404: một hình, một câu, một nút. */
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main id="main" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--paper)', padding: 24 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SHBLogo size="medium" showProductName />
        </div>
        <StateBlock
          kind="notfound"
          code="404"
          title="Không tìm thấy trang"
          description="Đường dẫn có thể đã cũ hoặc trang đã được chuyển đi."
          action={
            <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
              Về Việc của tôi
            </Button>
          }
        />
      </div>
    </main>
  );
}
