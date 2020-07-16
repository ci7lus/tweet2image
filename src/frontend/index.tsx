import React, { useState } from "react"
import ReactDOM from "react-dom"
import { ToastContainer, toast, Slide } from "react-toastify"
import querystring from "querystring"

let proceededUrl: string | null = null
let tweetId: string | null = null
let hash: string | null = null

const App: React.FC<{}> = () => {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")
  const [blob, setBlob] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [imageFormat, setImageFormat] = useState("jpg")
  const [theme, setTheme] = useState("light")
  const [lang, setLang] = useState("en")
  const [scale, setScale] = useState(2)

  const getChangedSetting = () => {
    const settings: { [key: string]: string | number } = {}
    if (lang !== "en") settings["lang"] = lang
    if (theme !== "light") settings["theme"] = theme
    if (scale !== 2) settings["scale"] = scale
    return settings
  }

  const getImageUrl = () => {
    const settings = getChangedSetting()
    if (!!Object.keys(settings).length) {
      return `${location.protocol}//${
        location.hostname
      }/${tweetId}.${imageFormat}?${querystring.stringify(settings)}`
    }
    return `${location.protocol}//${location.hostname}/${tweetId}.${imageFormat}`
  }

  const getScrapboxSnippet = () => {
    return `[${getImageUrl()} ${proceededUrl}]`
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await handleSubmitForm()
  }

  const handleSubmitForm = async () => {
    if (url.length === 0) return
    const m = url.match(/.*twitter.com\/(.+)\/status\/(\d+).*?/)
    if (!m) {
      setErr("The format of the URL is invalid.")
      return
    }

    tweetId = m[2]

    const stat = [tweetId, imageFormat, theme, lang, scale].join("")
    if (hash === stat) return
    hash = stat

    proceededUrl = `https://twitter.com/${m[1]}/status/${m[2]}`
    setLoading(true)

    try {
      let imageUrl = `/${tweetId}.${imageFormat}`
      const settings = getChangedSetting()
      if (!!Object.keys(settings).length) {
        imageUrl = `/${tweetId}.${imageFormat}?${querystring.stringify(
          settings
        )}`
      }
      const r = await fetch(imageUrl)

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
            <form onSubmit={onSubmit}>
              <div className="flex flex-wrap mt-2 -mx-3">
                <div className="w-full px-3">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="tweet-url"
                  >
                    Tweet Url
                  </label>
                  <input
                    id="tweet-url"
                    className={`appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                      loading && "bg-gray-200"
                    }`}
                    type="text"
                    placeholder="https://twitter.com/jack/status/20"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                    }}
                    onBlur={(e) => {
                      if (e.target.form.requestSubmit) {
                        e.target.form.requestSubmit()
                      } else {
                        handleSubmitForm()
                      }
                    }}
                    disabled={loading}
                    pattern=".*twitter.com\/(.+)\/status\/(\d+).*?"
                  />
                  <div className="-mx-2 mb-2">
                    <div className="flex flex-row flex-wrap w-full mx-auto">
                      <div className="w-1/2 px-2 md:w-1/4">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="format"
                        >
                          Format
                        </label>
                        <div className="relative">
                          <select
                            className={`appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                              loading && "bg-gray-200"
                            }`}
                            id="format"
                            value={imageFormat}
                            onBlur={(e) => {
                              if (e.target.form.requestSubmit) {
                                e.target.form.requestSubmit()
                              } else {
                                handleSubmitForm()
                              }
                            }}
                            onChange={(e) => {
                              setImageFormat(e.target.value)
                            }}
                            disabled={loading}
                          >
                            <option value="jpg">JPG</option>
                            <option value="png">PNG</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg
                              className="fill-current h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="w-1/2 px-2 md:w-1/4">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="theme"
                        >
                          Theme
                        </label>
                        <div className="relative">
                          <select
                            className={`appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                              loading && "bg-gray-200"
                            }`}
                            id="theme"
                            value={theme}
                            onBlur={(e) => {
                              if (e.target.form.requestSubmit) {
                                e.target.form.requestSubmit()
                              } else {
                                handleSubmitForm()
                              }
                            }}
                            onChange={(e) => {
                              setTheme(e.target.value)
                            }}
                            disabled={loading}
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg
                              className="fill-current h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="w-1/2 px-2 md:w-1/4">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="lang"
                        >
                          Lang
                        </label>
                        <div className="relative">
                          <input
                            id="lang"
                            className={`appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                              loading && "bg-gray-200"
                            }`}
                            type="text"
                            placeholder="en/ja/..."
                            value={lang}
                            onChange={(e) => {
                              setLang(e.target.value.toLowerCase())
                            }}
                            onBlur={(e) => {
                              if (e.target.form.requestSubmit) {
                                e.target.form.requestSubmit()
                              } else {
                                handleSubmitForm()
                              }
                            }}
                            disabled={loading}
                            maxLength={2}
                            minLength={2}
                            pattern="[a-z]{2}"
                          />
                        </div>
                      </div>
                      <div className="w-1/2 px-2 md:w-1/4">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="scale"
                        >
                          Scale
                        </label>
                        <div className="relative">
                          <input
                            id="scale"
                            className={`appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                              loading && "bg-gray-200"
                            }`}
                            type="number"
                            value={scale}
                            onChange={(e) => {
                              const p = parseFloat(e.target.value)
                              if (Number.isNaN(p)) return
                              setScale(p)
                            }}
                            onBlur={(e) => {
                              if (e.target.form.requestSubmit) {
                                e.target.form.requestSubmit()
                              } else {
                                handleSubmitForm()
                              }
                            }}
                            disabled={loading}
                            min={1}
                            max={5}
                          />
                        </div>
                      </div>
                    </div>
                    {err && <p className="text-red-500 text-xs pb-2">{err}</p>}
                  </div>
                </div>
              </div>
            </form>

            {loaded ? (
              <a href={proceededUrl} target="_blank" rel="noopener">
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
