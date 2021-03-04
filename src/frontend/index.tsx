import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useCallback,
} from "react"
import ReactDOM from "react-dom"
import { ToastContainer, toast, Slide } from "react-toastify"
import querystring from "querystring"
import { Settings } from "react-feather"

import { Form, formReducer, useInitialFormState } from "./Form"

const defaultGyazoClientId = process.env.GYAZO_CLIENT_ID

const GYAZO_CLIENT_ID_KEY = "gyazo-client-id"
const useGyazoClientIdState = (defaultId: string) => {
  const initialUserClientId = localStorage.getItem(GYAZO_CLIENT_ID_KEY)
  const [userGyazoClientId, setUserGyazoClientId] = useState(
    initialUserClientId
  )
  useEffect(() => {
    localStorage.setItem(GYAZO_CLIENT_ID_KEY, userGyazoClientId)
  }, [userGyazoClientId])

  return {
    gyazoClientId: userGyazoClientId || defaultId,
    userGyazoClientId,
    setGyazoClientId: setUserGyazoClientId,
  } as const
}

const useEditingState = () => {
  type Task = () => void
  const [editing, setEditing] = useState(false)
  const tasksOnEditFinished = useRef<Array<Task | undefined>>([])

  const addTaskOnEditFinished = useCallback(
    (task: Task) => {
      if (editing) {
        tasksOnEditFinished.current.push(task)
        return () => {
          const idx = tasksOnEditFinished.current.findIndex((t) => t === task)
          tasksOnEditFinished.current[idx] = undefined
        }
      } else {
        task()
      }
    },
    [editing]
  )

  useEffect(() => {
    // 下がりエッジ
    if (!editing) {
      tasksOnEditFinished.current.forEach((t) => t?.())
      tasksOnEditFinished.current = []
    }
  }, [editing])

  return {
    editing,
    handleEditingStateChange: setEditing,
    addTaskOnEditFinished,
  } as const
}

const App: React.FC<{}> = () => {
  const [loading, setLoading] = useState(false)
  const initialFormState = useInitialFormState()
  const [formState, dispatch] = useReducer(formReducer, initialFormState)
  const [blob, setBlob] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isGyazoUploading, setIsGyazoUploading] = useState(false)
  const [gyazoRedirect, setGyazoRedirect] = useState<string | null>(null)
  const [gyazoSnippet, setGyazoSnippet] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>()
  const proceededUrl = useRef<string | null>(null)
  const tweetId = useRef<string | null>(null)
  const hash = useRef<string | null>(null)
  const isNowEditing = useRef<boolean>(false)
  const retryCount = useRef<number>(0)
  const {
    gyazoClientId,
    userGyazoClientId,
    setGyazoClientId,
  } = useGyazoClientIdState(defaultGyazoClientId)
  const {
    editing,
    addTaskOnEditFinished,
    handleEditingStateChange,
  } = useEditingState()

  const getChangedSetting = () => {
    const settings: { [key: string]: string | number } = {}
    if (formState.lang !== "ja") settings["lang"] = formState.lang
    if (formState.timezone !== 9) settings["tz"] = formState.timezone
    if (formState.theme !== "light") settings["theme"] = formState.theme
    if (formState.scale !== 2) settings["scale"] = formState.scale
    return settings
  }

  const getImageUrl = () => {
    const settings = getChangedSetting()
    if (!!Object.keys(settings).length) {
      return `${location.protocol}//${location.hostname}/${tweetId.current}.${
        formState.imageFormat
      }?${querystring.stringify(settings)}`
    }
    return `${location.protocol}//${location.hostname}/${tweetId.current}.${formState.imageFormat}`
  }

  const getScrapboxSnippet = () => {
    return `[${getImageUrl()} ${proceededUrl.current}]`
  }

  const onSubmit = async () => {
    await handleSubmitForm()
  }

  const handleSubmitForm = async () => {
    if (loading) return
    const { url, imageFormat, theme, lang, scale, timezone: tz } = formState
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
    let handle: number | undefined
    let remove: (() => void) | undefined
    if (editing) {
      remove = addTaskOnEditFinished(handleSubmitForm)
    } else {
      handle = window.setTimeout(() => handleSubmitForm(), 1000)
    }
    return () => {
      window.clearTimeout(handle)
      remove?.()
    }
  }, [formState, editing, addTaskOnEditFinished])

  useEffect(() => {
    const parsed = new URLSearchParams(location.hash.slice(1))
    if (0 < Array.from(parsed.entries()).length) {
      if (isNowEditing.current || loading) return
      handleSubmitForm()
      /*if (tweetInput.current.form.requestSubmit) {
          setTimeout(() => tweetInput.current.form.requestSubmit(), 0)
        } else {
          handleSubmitForm()
        }*/
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
          <div className="m-1 text-2xl flex justify-between items-center relative">
            <h1>tweet2image</h1>
            <details style={{ fontSize: 0 }}>
              <summary className="text-gray-600">
                <Settings aria-label="設定" size={20} />
              </summary>
              <div className="absolute bg-white shadow mt-8 right-0 top-0 z-20">
                <div className="text-sm p-4 leading-relaxed">
                  <h1 className="text-lg pb-2">設定</h1>
                  <h2 className="text-base pb-2">Gyazo Client ID</h2>
                  <input
                    type="text"
                    placeholder={defaultGyazoClientId}
                    className="appearance-none block w-full border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 bg-gray-100 text-gray-700"
                    value={userGyazoClientId}
                    onChange={(e) => setGyazoClientId(e.target.value)}
                  ></input>
                </div>
              </div>
            </details>
          </div>
          <hr />

          <div className="mx-1">
            <div className="mt-2">
              <Form
                ref={formRef}
                state={formState}
                dispatch={dispatch}
                disabled={loading}
                onEditingStateChange={handleEditingStateChange}
                onSubmit={onSubmit}
              />
            </div>
            <div className="mt-4">
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
            </div>

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
                      (loading ||
                        isGyazoUploading ||
                        !!gyazoRedirect ||
                        !gyazoClientId) &&
                      "bg-gray-200 text-gray-400"
                    }`}
                    disabled={
                      loading ||
                      isGyazoUploading ||
                      !!gyazoRedirect ||
                      !gyazoClientId
                    }
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

      <div className="container max-w-screen-md mx-auto">
        <hr />
        <div className="flex justify-end text-xs p-4">
          <div className="text-right">
            <span>
              tweet2image&nbsp;/&nbsp;
              <a
                className="text-blue-400"
                target="_blank"
                href="https://github.com/ci7lus/tweet2image"
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
