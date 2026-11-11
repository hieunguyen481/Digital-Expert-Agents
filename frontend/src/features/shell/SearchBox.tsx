import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import styles from './shell.module.css';

export interface SearchResult {
  loans: { loan_application_id: string; application_number: string; customer_name: string; status: string }[];
  customers: { customer_id: string; customer_number: string; display_name: string }[];
}

/** Ô tìm kiếm ở thanh trên: mã hồ sơ, tên khách, mã khách; kết quả theo đúng phạm vi đọc của vai (RLS ở backend). */
export function SearchBox() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);
  const enabled = term.length >= 2;
  const query = useQuery<SearchResult>({
    queryKey: ['search', term],
    enabled,
    queryFn: async () => (await apiClient.get<SearchResult>('/search', { params: { q: term } })).data,
  });
  const close = () => setOpen(false);
  const data = query.data;
  const empty = enabled && !query.isFetching && data && data.loans.length === 0 && data.customers.length === 0;

  return (
    <div className={styles.searchWrap}>
      <label className={styles.search} role="search">
        <SearchOutlined aria-hidden />
        <input
          aria-label="Tìm kiếm"
          placeholder="Tìm hồ sơ, khách hàng, mã số thuế"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(close, 150)}
          onKeyDown={(e) => e.key === 'Escape' && close()}
        />
      </label>
      {open && enabled && (
        <div className={styles.searchPanel} role="listbox" aria-label="Kết quả tìm kiếm">
          {query.isFetching && !data && <div className={styles.searchNote}>Đang tìm…</div>}
          {query.isError && <div className={styles.searchNote}>Không tìm được. Thử lại sau.</div>}
          {empty && <div className={styles.searchNote}>Không có kết quả cho “{term}”.</div>}
          {data && data.loans.length > 0 && <div className={styles.searchGroup}>Hồ sơ vay</div>}
          {data?.loans.map((l) => (
            <Link key={l.loan_application_id} to={`/ho-so-vay/${l.loan_application_id}`} className={styles.searchItem} onClick={close}>
              <b>{l.application_number}</b> <span>{l.customer_name}</span>
            </Link>
          ))}
          {data && data.customers.length > 0 && <div className={styles.searchGroup}>Khách hàng</div>}
          {data?.customers.map((c) => (
            <Link key={c.customer_id} to={`/customer/${c.customer_id}`} className={styles.searchItem} onClick={close}>
              <b>{c.display_name}</b> <span>{c.customer_number}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
