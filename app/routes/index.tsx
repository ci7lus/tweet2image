import { useEffect, useState } from "react"
import { useLoaderData } from "remix"
import { MainApp } from "~/components"

export async function loader() {
  return {
    ENV: {
      GYAZO_CLIENT_ID: process.env.GYAZO_CLIENT_ID,
    },
  }
}

export default function Index() {
  if (!globalThis.document) return <></>
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const data = useLoaderData()
  return (
    <div>
      {mounted ? (
        <MainApp GYAZO_CLIENT_ID={data.ENV.GYAZO_CLIENT_ID} />
      ) : (
        <>Loading...</>
      )}
    </div>
  )
}
