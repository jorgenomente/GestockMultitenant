export function Footer() {
  return (
    <footer className="md:px-8 px-4 py-4 border-t md:block hidden" style={{ borderColor: '#D8D8D3', backgroundColor: '#FAFAF9' }}>
      <div className="flex items-center justify-between">
        <div 
          style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#5A8070'
          }}
        >
          GeStock — hecho por{' '}
          <span style={{ color: '#47685C' }}>Raíz Digital</span>
        </div>
        <div 
          style={{ 
            fontFamily: 'var(--font-family-mono)', 
            fontSize: '0.75rem',
            color: '#5A8070'
          }}
        >
          v1.0.2
        </div>
      </div>
    </footer>
  );
}
