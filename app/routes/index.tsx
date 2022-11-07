import { useLoaderData } from "@remix-run/react"
import { MainApp } from "~/components"

export async function loader({ request }: { request: Request }) {
  return {
    ENV: {
      GYAZO_CLIENT_ID: process.env.GYAZO_CLIENT_ID,
      CURRENT_URL: request.url,
    },
  }
}

export default function Index() {
  const data = useLoaderData()
  return (
    <MainApp
      GYAZO_CLIENT_ID={data.ENV.GYAZO_CLIENT_ID}
      currentUrl={data.ENV.CURRENT_URL}
    />
  )
}
