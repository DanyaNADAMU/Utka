export default function NotFound() {
  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        height: '100vh',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        color: '#000',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1
          style={{
            borderRight: '1px solid rgba(0, 0, 0, .3)',
            margin: 0,
            marginRight: '20px',
            padding: '10px 23px 10px 0',
            fontSize: '24px',
            fontWeight: 500,
            verticalAlign: 'top',
          }}
        >
          404
        </h1>
        <div style={{ display: 'inline-block' }}>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '28px',
              margin: 0,
            }}
          >
            This page could not be found.
          </h2>
        </div>
      </div>
    </div>
  );
}
