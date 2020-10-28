import React, { useState, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import { ToastContainer, toast, Slide } from "react-toastify"
import querystring from "querystring"
import Select, { StylesConfig } from "react-select"
import timezones from "timezones.json"
import $ from "transform-ts"

const gyazoClientId = $.string.transformOrThrow(process.env.GYAZO_CLIENT_ID)

const selectStyle: StylesConfig = {
  control: (previous) => ({
    ...previous,
    height: 46,
    backgroundColor: "#f7fafc",
    borderColor: "#edf2f7",
  }),
}

const imageFormats = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
]

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const languages: {
  code: string
  local_name: string
}[] = require("../../languages.json")

const languageOptions = languages.map((l) => ({
  value: l.code,
  label: `${l.local_name} (${l.code})`,
}))

const timezoneOptions = timezones
  .filter((t) => t.isdst === false && 0 < t.utc.length)
  .map((t) => ({
    value: t.offset,
    label: t.text,
  }))

const App: React.FC<{}> = () => {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")
  const [blob, setBlob] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [imageFormat, setImageFormat] = useState("jpg")
  const [theme, setTheme] = useState("light")
  const [lang, setLang] = useState("ja")
  const [tz, setTZ] = useState(9)
  const [scale, setScale] = useState(2)
  const [isGyazoUploading, setIsGyazoUploading] = useState(false)
  const [gyazoRedirect, setGyazoRedirect] = useState<string | null>(null)
  const [gyazoSnippet, setGyazoSnippet] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>()
  const proceededUrl = useRef<string | null>(null)
  const tweetId = useRef<string | null>(null)
  const hash = useRef<string | null>(null)
  const isNowEditing = useRef<boolean>(false)
  const retryCount = useRef<number>(0)
  const tweetInput = useRef<HTMLInputElement>()

  const getChangedSetting = () => {
    const settings: { [key: string]: string | number } = {}
    if (lang !== "ja") settings["lang"] = lang
    if (tz !== 9) settings["tz"] = tz
    if (theme !== "light") settings["theme"] = theme
    if (scale !== 2) settings["scale"] = scale
    return settings
  }

  const getImageUrl = () => {
    const settings = getChangedSetting()
    if (!!Object.keys(settings).length) {
      return `${location.protocol}//${location.hostname}/${
        tweetId.current
      }.${imageFormat}?${querystring.stringify(settings)}`
    }
    return `${location.protocol}//${location.hostname}/${tweetId.current}.${imageFormat}`
  }

  const getScrapboxSnippet = () => {
    return `[${getImageUrl()} ${proceededUrl.current}]`
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await handleSubmitForm()
  }

  const onFocus = () => {
    isNowEditing.current = true
  }

  const onBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    e.persist()
    isNowEditing.current = false
    setTimeout(async () => {
      if (isNowEditing.current || e.target.disabled) return
      if (e.target.form.requestSubmit) {
        e.target.form.requestSubmit()
      } else {
        await handleSubmitForm()
      }
    }, 1000)
  }

  const handleSubmitForm = async () => {
    if (url.length === 0) return
    const m = url.match(/(twitter.com\/(.+)\/status\/)?(\d+)/)
    if (!m) {
      toast.error("The format of the URL is invalid.")
      return
    }

    tweetId.current = m[3]

    const stat = [tweetId.current, imageFormat, theme, lang, scale, tz].join("")
    if (hash.current === stat) return
    hash.current = stat

    proceededUrl.current = `https://twitter.com/${m[2] || "twitter"}/status/${
      tweetId.current
    }`
    setLoading(true)
    setGyazoRedirect(null)

    try {
      let imageUrl = `/${tweetId.current}.${imageFormat}`
      const settings = getChangedSetting()
      if (!!Object.keys(settings).length) {
        imageUrl = `/${tweetId.current}.${imageFormat}?${querystring.stringify(
          settings
        )}`
      }
      const r = await fetch(imageUrl)

      if (!r.ok) {
        switch (r.status) {
          case 404:
            toast.error("No tweets found.")
            break
          default:
            toast.error(`An error has occurred: ${r.statusText}`)
            hash.current = null
            setTimeout(async () => {
              if (retryCount.current < 2) {
                retryCount.current++
                if (formRef.current.requestSubmit) {
                  formRef.current.requestSubmit()
                } else {
                  await handleSubmitForm()
                }
              }
            }, 1000)
            break
        }
        setLoading(false)

        return
      }

      retryCount.current = 0
      const blob = await r.blob()
      const blobUrl = URL.createObjectURL(blob)
      setBlob(blobUrl)

      setLoading(false)
      setLoaded(true)
    } catch (error) {
      toast.error(`An error has occurred.`)
      setLoading(false)
      return
    }
  }

  useEffect(() => {
    const parsed = new URLSearchParams(location.hash.slice(1))
    if (parsed.has("url")) {
      setUrl(parsed.get("url"))
    }
    if (parsed.has("format")) {
      const format = parsed.get("format")
      if (["jpg", "png"].includes(format)) {
        setImageFormat(format)
      }
    }
    if (parsed.has("theme")) {
      const theme = parsed.get("theme")
      if (["light", "dark"].includes(theme)) {
        setTheme(theme)
      }
    }
    if (parsed.has("scale")) {
      const scale = parseInt(parsed.get("scale"))
      if (!Number.isNaN(scale)) {
        setScale(scale)
      }
    } else {
      try {
        const scale = window.devicePixelRatio
        setScale(scale)
      } catch (e) {
        console.error(e)
      }
    }
    if (parsed.has("lang")) {
      const lang = parsed.get("lang")
      if (languages.find((l) => l.code === lang)) {
        setLang(lang)
      }
    } else {
      try {
        const lang = navigator.language.slice(0, 2)
        if (languages.find((l) => l.code === lang)) {
          setLang(lang)
        }
      } catch (e) {
        console.error(e)
      }
    }
    if (parsed.has("tz")) {
      const tz = parseInt(parsed.get("tz"))
      if (!Number.isNaN(tz) && timezones.find((t) => t.offset === tz)) {
        setTZ(tz)
      }
    } else {
      try {
        const tz = Math.round(Math.abs(new Date().getTimezoneOffset()) / 60)
        setTZ(tz)
      } catch (e) {
        console.error(e)
      }
    }
    if (0 < Array.from(parsed.entries()).length) {
      if (isNowEditing.current || tweetInput?.current.disabled) return
      if (tweetInput.current.form.requestSubmit) {
        setTimeout(() => tweetInput.current.form.requestSubmit(), 0)
      } else {
        handleSubmitForm()
      }
    }
  }, [])

  const tweetUploadToGyazo = async () => {
    setIsGyazoUploading(true)
    toast.info("Uploading to Gyazo...")
    try {
      const r = await fetch(blob)
      const imageData = await r.blob()
      const base64Img: Blob = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onerror = rej
        reader.onload = () => {
          res((reader.result as any) as Blob)
        }
        reader.readAsDataURL(imageData)
      })
      const formData = new FormData()
      formData.append("client_id", gyazoClientId)
      formData.append("referer_url", proceededUrl.current)
      formData.append("image_url", base64Img)
      const easyAuth = await fetch(
        `https://upload.gyazo.com/api/upload/easy_auth`,
        {
          method: "POST",
          mode: "cors",
          body: formData,
        }
      )
      const uploadResult = await easyAuth.json()
      window.open(uploadResult.get_image_url, "pop", "width=800, height=480")
      setGyazoRedirect(uploadResult.get_image_url)
      setGyazoSnippet(`[ ${proceededUrl.current}]`)
    } catch (e) {
      console.error(e)
      toast.error("Failed to upload to gyazo")
    } finally {
      setIsGyazoUploading(false)
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
            <form onSubmit={onSubmit} ref={formRef}>
              <div className="flex flex-wrap mt-2 -mx-3">
                <div className="w-full px-3 pb-2">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="tweet-url"
                  >
                    Tweet Url
                  </label>
                  <input
                    ref={tweetInput}
                    id="tweet-url"
                    className={`appearance-none block w-full border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                      loading
                        ? "bg-gray-200 text-gray-400"
                        : "bg-gray-100 text-gray-700"
                    }`}
                    type="text"
                    placeholder="https://twitter.com/jack/status/20 or 20"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                    }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    disabled={loading}
                    pattern=".*(\d+).*"
                  />
                  <div className="-mx-2 mb-2">
                    <div className="flex flex-row flex-wrap w-full mx-auto">
                      <div className="w-1/3 px-2">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="format"
                        >
                          Format
                        </label>
                        <div className="relative">
                          <Select
                            options={imageFormats}
                            styles={selectStyle}
                            onChange={(value, action) => {
                              setImageFormat((value as { value: string }).value)
                            }}
                            id="format"
                            onBlur={onBlur}
                            onFocus={onFocus}
                            isDisabled={loading}
                            defaultValue={imageFormats.find(
                              (f) => f.value === imageFormat
                            )}
                            value={imageFormats.find(
                              (f) => f.value === imageFormat
                            )}
                            filterOption={() => true}
                          />
                        </div>
                      </div>
                      <div className="w-1/3 px-2">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="theme"
                        >
                          Theme
                        </label>
                        <div className="relative">
                          <Select
                            options={themes}
                            styles={selectStyle}
                            onChange={(value, action) => {
                              setTheme((value as { value: string }).value)
                            }}
                            id="theme"
                            onBlur={onBlur}
                            onFocus={onFocus}
                            isDisabled={loading}
                            value={themes.find((t) => t.value === theme)}
                            defaultValue={themes.find((t) => t.value === theme)}
                            filterOption={() => true}
                          />
                        </div>
                      </div>
                      <div className="w-1/3 px-2">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="scale"
                        >
                          Scale
                        </label>
                        <div className="relative">
                          <input
                            id="scale"
                            className={`appearance-none block w-full border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 ${
                              loading
                                ? "bg-gray-200 text-gray-400"
                                : "bg-gray-100 text-gray-700"
                            }`}
                            type="number"
                            value={scale}
                            onChange={(e) => {
                              const p = parseFloat(e.target.value)
                              if (Number.isNaN(p)) return
                              setScale(p)
                            }}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            disabled={loading}
                            min={1}
                            max={5}
                          />
                        </div>
                      </div>
                      <div className="w-1/2 px-2">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="lang"
                        >
                          Lang
                        </label>
                        <div className="relative">
                          <Select
                            options={languageOptions}
                            styles={selectStyle}
                            onChange={(value, action) => {
                              setLang((value as { value: string }).value)
                            }}
                            id="lang"
                            onBlur={onBlur}
                            onFocus={onFocus}
                            isDisabled={loading}
                            defaultValue={languageOptions.find(
                              (l) => l.value === lang
                            )}
                            value={languageOptions.find(
                              (l) => l.value === lang
                            )}
                          />
                        </div>
                      </div>
                      <div className="w-1/2 px-2">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="timezone"
                        >
                          Timezone
                        </label>
                        <div className="relative">
                          <Select
                            options={timezoneOptions}
                            styles={selectStyle}
                            onChange={(value, action) => {
                              setTZ((value as { value: number }).value)
                            }}
                            id="timezone"
                            onBlur={onBlur}
                            onFocus={onFocus}
                            isDisabled={loading}
                            defaultValue={timezoneOptions.find(
                              (t) => t.value === tz
                            )}
                            value={timezoneOptions.find((t) => t.value === tz)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {loaded ? (
              <a href={proceededUrl.current} target="_blank" rel="noopener">
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
              <div className="h-full w-full flex-none bg-cover text-center bg-gray-300 rounded-t bg-center placeholder-cover">
                <div className="flex items-center justify-center">
                  <div
                    className={`loading ${
                      loading ? "opacity-100" : "opacity-0"
                    }`}
                  ></div>
                </div>
              </div>
            )}

            {tweetId.current && (
              <div className="mt-2">
                <label className="block tracking-wide text-gray-600 text-sm mb-2">
                  Image Url
                </label>
                <div className="flex flex-wrap items-stretch w-full mb-4 relative">
                  <input
                    type="text"
                    className="flex-shrink flex-grow leading-normal w-px flex-1 h-10 rounded rounded-r-none px-3 relative bg-gray-200 text-gray-700 border border-gray-200"
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
                    className="flex-shrink flex-grow leading-normal w-px flex-1 h-10 rounded rounded-r-none px-3 relative bg-gray-200 text-gray-700 border border-gray-200"
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
                <div className="mx-auto mt-6 mb-2">
                  <button
                    className={`flex items-center leading-normal bg-gray-lighter rounded border border-indigo-200 p-2 whitespace-no-wrap text-grey-dark text-sm mx-auto ${
                      (loading || isGyazoUploading || !!gyazoRedirect) &&
                      "bg-gray-200 text-gray-400"
                    }`}
                    disabled={loading || isGyazoUploading || !!gyazoRedirect}
                    onClick={tweetUploadToGyazo}
                  >
                    Upload to Gyazo📸
                  </button>
                  {gyazoRedirect && (
                    <div>
                      <label className="block tracking-wide text-gray-600 text-sm my-2">
                        Scrapbox Snippet
                      </label>
                      <div className="flex flex-wrap items-stretch w-full mb-1 relative">
                        <input
                          type="text"
                          className="flex-shrink flex-grow leading-normal w-px flex-1 h-10 rounded rounded-r-none px-3 relative bg-gray-100 text-gray-700 border border-gray-200"
                          value={gyazoSnippet}
                          onChange={(e) => setGyazoSnippet(e.target.value)}
                        />
                        <div className="flex -mr-px">
                          <button
                            className="flex items-center leading-normal bg-grey-lighter rounded rounded-l-none border border-l-0 border-grey-light px-3 whitespace-no-wrap text-grey-dark text-sm"
                            onClick={async () => {
                              try {
                                if (navigator.clipboard) {
                                  await navigator.clipboard.writeText(
                                    gyazoSnippet
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
                      <p className="text-sm text-gray-600">
                        To complete this snippet, paste{" "}
                        <a
                          className="text-blue-400"
                          href={gyazoRedirect}
                          target="_blank"
                        >
                          the URL of the Gyazo page
                        </a>{" "}
                        opened on the popup to in the text box above.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-screen-md mx-auto mx-2">
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
