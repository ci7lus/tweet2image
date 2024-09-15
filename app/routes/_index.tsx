import { json, useLoaderData } from "@remix-run/react"
import { MainApp } from "~/components"

export async function loader({ request }: { request: Request }) {
  const gyazoClientId = process.env.GYAZO_CLIENT_ID
  const currentUrl = request.url
  if (gyazoClientId === undefined || currentUrl === undefined) {
   throw new Error("required environment ")
  }
  return json({
    ENV: {
      GYAZO_CLIENT_ID: gyazoClientId,
      CURRENT_URL: currentUrl,
    },
  })
}

export default function Index() {
  const data = useLoaderData<typeof loader>()
  return (
    <MainApp
      GYAZO_CLIENT_ID={data.ENV.GYAZO_CLIENT_ID}
      currentUrl={data.ENV.CURRENT_URL}
    />
  )
}
