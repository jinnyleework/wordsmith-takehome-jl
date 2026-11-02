// Filled page icon coloured by file type, after the reference table in Figma (node 2009:95735).
// The dataset only holds Word (.doc/.docx) and PDF files.
const colors = {
  word: { page: '#2b7cd3', fold: '#a9cdf5' },
  pdf: { page: '#e5372b', fold: '#f6aaa4' },
}

export function FileIcon({ name }: { name: string }) {
  const { page, fold } = /\.pdf$/i.test(name) ? colors.pdf : colors.word
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden className="shrink-0">
      <path d="M1.5 0H8l4 4v8.5A1.5 1.5 0 0 1 10.5 14h-9A1.5 1.5 0 0 1 0 12.5v-11A1.5 1.5 0 0 1 1.5 0Z" fill={page} />
      <path d="M8 0l4 4H9a1 1 0 0 1-1-1V0Z" fill={fold} />
      <path d="M3 7h6M3 9h6M3 11h4" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}
