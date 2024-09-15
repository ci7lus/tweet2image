import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react"
import { ColorSchemeScript, MantineProvider } from '@mantine/core';

export function Layout({children}: {children: React.ReactNode}) {
  return (
    <html>
      <head>
        <title>tweet2image</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="og:site_name" content="tweet2image" />
        <meta name="twitter:site" content="@ci7lus" />
        <meta name="twitter:card" content="summary" />
        <meta name="description" content="Convert tweets to images" />
        <meta name="og:description" content="Convert tweets to images" />
        <link rel="canonical" href="https://tweet2image.vercel.app/" />
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
