import '@xyflow/react/dist/style.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <title>FYI GTM Admin</title>
      </Head>
      <style jsx global>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body {
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          background: #09090b;
          color: #fafafa;
          line-height: 1.5;
        }
        code, .mono { font-family: 'IBM Plex Mono', 'Menlo', monospace; }
        ::selection { background: rgba(59, 130, 246, 0.4); color: #fafafa; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; }
        input, textarea, select { font-family: inherit; }
        select option { background: #18181b; color: #a1a1aa; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .react-flow__controls { background: transparent !important; border: none !important; box-shadow: none !important; }
        .react-flow__controls button { background: #18181b !important; border: 1px solid #27272a !important; color: #71717a !important; fill: #71717a !important; border-radius: 6px !important; }
        .react-flow__controls button:hover { background: #27272a !important; color: #fafafa !important; fill: #fafafa !important; }
        .react-flow__controls button svg { fill: inherit !important; }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
