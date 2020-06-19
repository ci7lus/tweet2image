import React, { useState } from "react"
import ReactDOM from "react-dom"
import { ToastContainer, toast, Slide } from "react-toastify"

const App: React.FC<{}> = () => {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")
  const [blob, setBlob] = useState(null as string | null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(null as string | null)
  const [tweetId, setTweetId] = useState(null as string | null)

  const getImageUrl = () => {
    return `${location.protocol}//${location.hostname}/${tweetId}.jpg`
  }

  const getScrapboxSnippet = () => {
    return `[${getImageUrl()} ${url}]`
  }

  const onBlur = async () => {
    setErr(null)
    if (0 < url.length) {
      const m = url.match(/.*twitter.com\/(.+)\/status\/(\d+).*?/)
      if (m) {
        if (m[2] === tweetId) return

        setTweetId(m[2])

        setLoading(true)

        try {
          const r = await fetch(`/${m[2]}.jpg`)

          if (!r.ok) {
            switch (r.status) {
              case 404:
                setErr("No tweets found.")
                break
              default:
                setErr(`An error has occurred: ${r.statusText}`)
                break
            }
            setLoading(false)
            return
          }

          const blob = await r.blob()
          const blobUrl = URL.createObjectURL(blob)
          setBlob(blobUrl)

          setLoading(false)
          setLoaded(true)
        } catch (error) {
          setErr(`An error has occurred.`)
          setLoading(false)
          return
        }
      } else {
        setErr("The format of the URL is invalid.")
      }
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col text-gray-800">
      <ToastContainer
        position={"top-left"}
        autoClose={2500}
        closeOnClick={true}
        transition={Slide}
      />
      <div className="flex-1">
        <div className="container mx-auto max-w-screen-md p-4">
          <div className="m-1 text-2xl">tweet-card</div>
          <hr />
          <div className="mx-1">
            <div className="flex flex-wrap mt-2 -mx-3">
              <div className="w-full px-3">
                <label className="block tracking-wide text-gray-700 text-base mb-2">
                  Tweet Url
                </label>
                <input
                  className={`appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                    loading && "bg-gray-200"
                  }`}
                  type="text"
                  placeholder="https://twitter.com/jack/status/20"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                  }}
                  onBlur={onBlur}
                  disabled={loading}
                />
                {err && <p className="text-red-500 text-xs pb-2">{err}</p>}
              </div>
            </div>

            {loaded ? (
              <a href={url} target="_blank" rel="noopener">
                <div className="relative w-full text-center bg-gray-300 rounded-t">
                  <img className="w-full" src={blob} />
                  <div className="absolute loading-center">
                    <div className="h-full flex items-center justify-center">
                      <div
                        className={`loading ${
                          loading ? "opacity-100" : "opacity-0"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </a>
            ) : (
              <div className="h-full w-full flex-none bg-cover text-center bg-gray-300 rounded-t bg-cover bg-center placeholder-cover">
                <div className="flex items-center justify-center">
                  <div
                    className={`loading ${
                      loading ? "opacity-100" : "opacity-0"
                    }`}
                  ></div>
                </div>
              </div>
            )}

            {loaded && (
              <div className="mt-2">
                <label className="block tracking-wide text-gray-600 text-sm mb-2">
                  Image Url
                </label>
                <div className="flex flex-wrap items-stretch w-full mb-4 relative">
                  <input
                    type="text"
                    className="flex-shrink flex-grow flex-auto leading-normal w-px flex-1 h-10 rounded rounded-r-none px-3 relative bg-gray-200 text-gray-700 border border-gray-200"
                    value={getImageUrl()}
                    readOnly
                  />
                  <div className="flex -mr-px">
                    <button
                      className="flex items-center leading-normal bg-grey-lighter rounded rounded-l-none border border-l-0 border-grey-light px-3 whitespace-no-wrap text-grey-dark text-sm"
                      onClick={async () => {
                        try {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(getImageUrl())
                            toast.info("copied.")
                          }
                        } catch (e) {
                          console.error(e)
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <label className="block tracking-wide text-gray-600 text-sm mb-2">
                  Scrapbox Snippet
                </label>
                <div className="flex flex-wrap items-stretch w-full mb-4 relative">
                  <input
                    type="text"
                    className="flex-shrink flex-grow flex-auto leading-normal w-px flex-1 h-10 rounded rounded-r-none px-3 relative bg-gray-200 text-gray-700 border border-gray-200"
                    value={getScrapboxSnippet()}
                    readOnly
                  />
                  <div className="flex -mr-px">
                    <button
                      className="flex items-center leading-normal bg-grey-lighter rounded rounded-l-none border border-l-0 border-grey-light px-3 whitespace-no-wrap text-grey-dark text-sm"
                      onClick={async () => {
                        try {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(
                              getScrapboxSnippet()
                            )
                            toast.info("copied.")
                          }
                        } catch (e) {
                          console.error(e)
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-screen-md mx-2">
        <hr />
        <div className="flex justify-end text-xs p-4">
          <div className="text-right">
            <span>
              tweet-card&nbsp;/&nbsp;
              <a
                className="text-blue-400"
                target="_blank"
                href="https://github.com/ci7lus/tweet-card"
                rel="noopener"
              >
                code &amp; bug report
              </a>
              &nbsp;/&nbsp;
            </span>
            <span className="inline-block">
              Animation from&nbsp;
              <a
                className="text-blue-400"
                href="https://github.com/potato4d/preloaders"
                target="_blank"
                rel="noopener"
              >
                potato4d/preloaders
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById("app"))
