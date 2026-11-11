import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
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
  // Danh sách phẳng theo thứ tự hiển thị: hồ sơ rồi khách hàng (mẫu combobox ARIA, mũi tên chọn, Enter mở).
  const options = [
    ...(data?.loans ?? []).map((l) => ({ id: `search-opt-l-${l.loan_application_id}`, to: `/ho-so-vay/${l.loan_application_id}` })),
    ...(data?.customers ?? []).map((c) => ({ id: `search-opt-c-${c.customer_id}`, to: `/customer/${c.customer_id}` })),
  ];
  const listOpen = open && enabled;
  const activeId = listOpen && active >= 0 && active < options.length ? options[active].id : undefined;
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { close(); setActive(-1); return; }
    if (!options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive((i) => (i <= 0 ? options.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && activeId) { e.preventDefault(); navigate(options[active].to); close(); setActive(-1); }
  };
  const empty = enabled && !query.isFetching && data && data.loans.length === 0 && data.customers.length === 0;

  return (
    <div className={styles.searchWrap}>
      <label className={styles.search} role="search" data-focus-ring>
        <SearchOutlined aria-hidden />
        <input
          role="combobox"
          aria-expanded={listOpen}
          aria-controls="search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label="Tìm kiếm"
          placeholder="Tìm hồ sơ, khách hàng, mã số thuế"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(close, 150)}
          onKeyDown={onKeyDown}
        />
      </label>
      {open && enabled && (
        <div className={styles.searchPanel} id="search-listbox" role="listbox" aria-label="Kết quả tìm kiếm">
          {query.isFetching && !data && <div className={styles.searchNote}>Đang tìm…</div>}
          {query.isError && <div className={styles.searchNote}>Không tìm được. Thử lại sau.</div>}
          {empty && <div className={styles.searchNote}>Không có kết quả cho “{term}”.</div>}
          {data && data.loans.length > 0 && <div className={styles.searchGroup} role="presentation">Hồ sơ vay</div>}
          {data?.loans.map((l) => (
            <Link key={l.loan_application_id} id={`search-opt-l-${l.loan_application_id}`} role="option" aria-selected={activeId === `search-opt-l-${l.loan_application_id}`} tabIndex={-1} to={`/ho-so-vay/${l.loan_application_id}`} className={styles.searchItem} onClick={close}>
              <b className={styles.searchCode}>{l.application_number}</b> <span>{l.customer_name}</span>
            </Link>
          ))}
          {data && data.customers.length > 0 && <div className={styles.searchGroup} role="presentation">Khách hàng</div>}
          {data?.customers.map((c) => (
            <Link key={c.customer_id} id={`search-opt-c-${c.customer_id}`} role="option" aria-selected={activeId === `search-opt-c-${c.customer_id}`} tabIndex={-1} to={`/customer/${c.customer_id}`} className={styles.searchItem} onClick={close}>
              <b>{c.display_name}</b> <span>{c.customer_number}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
