import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "remix"
import type { MetaFunction } from "remix"
import styles from "./styles/index.css"
import tailwind from "./styles/tailwind.css"
import toast from "../node_modules/react-toastify/dist/ReactToastify.css"

export function links() {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "stylesheet", href: tailwind },
    { rel: "stylesheet", href: toast },
  ]
}

export const meta: MetaFunction = () => {
  return { title: "tweet2image" }
}

export default function App() {
  return (
    <html>
      <head>
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
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
