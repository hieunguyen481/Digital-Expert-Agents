import { HomeOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { StateBlock } from '@/components/ui/StateBlock';

/** Trang 404: một hình, một câu, một nút. */
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 24 }}>
      <div>
        <StateBlock
          headingLevel={1}          kind="notfound"
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
    </div>
  );
}
