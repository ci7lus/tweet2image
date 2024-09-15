import timezones from "timezones.json"
import axios from "axios"
import url from "url"
import querystring from "querystring"
import nodeRequest from "request"
import { PassThrough } from "stream"
import chromium from "@sparticuz/chromium"
import puppeteer, { Browser } from "puppeteer-core"
import { writeFile, mkdir } from "fs/promises"
import { cwd } from "process"

const route = new RegExp(/^(\d+)\.(png|jpg)$/)
const imageCacheUrl = process.env.IMAGE_CACHE_URL
const imageCacheUA = process.env.IMAGE_CACHE_UA

export async function loader({
  request,
  params,
}: {
  request: Request
  params: { path: string }
}) {
  if (request.method !== "GET") {
    return new Response("405", { status: 405 })
  }

  const match = route.exec(params.path)
  if (!match) {
    return new Response("404", { status: 404 })
  }
  const [, tweetId, mode] = match
  const requestUrl = new URL(request.url)
  const lang = requestUrl.searchParams.get("lang") || "ja"
  if (!lang.match(/^[a-z-]{2,5}$/)) {
    return new Response("400 lang", { status: 400 })
  }
  const tz = timezones.find(
    (t) => t.offset === parseInt(requestUrl.searchParams.get("tz") || "9")
  )
  if (!tz) {
    return new Response("400 tz", { status: 400 })
  }
  const theme = requestUrl.searchParams.get("theme") || "light"
  if (!theme.match(/^[a-z]+$/)) {
    return new Response("400 theme", { status: 400 })
  }
  const scale = parseFloat(requestUrl.searchParams.get("scale") || "2")
  if (Number.isNaN(scale) || scale < 1 || 5 < scale) {
    return new Response("400 scale", { status: 400 })
  }
  const headers: Record<string, string> = {
    "access-control-allow-origin": "*",
  }
  if (scale !== 1) {
    headers["content-dpr"] = scale.toFixed(1)
  }
  const hideCard =
    parseInt(requestUrl.searchParams.get("hideCard") || "0") === 1 ||
    requestUrl.searchParams.get("hideCard") === "true"
  const hideThread =
    parseInt(requestUrl.searchParams.get("hideThread") || "0") === 1 ||
    requestUrl.searchParams.get("hideThread") === "true"
  const t2iSkipSensitiveWarning =
    requestUrl.searchParams.get("t2iSkipSensitiveWarning") === "1" ||
    requestUrl.searchParams.get("t2iSkipSensitiveWarning") === "true"

  const r = await axios.get<{
    url: string
  }>(
    `https://publish.twitter.com/oembed?url=https%3A%2F%2Ftwitter.com%2Ftwitter%2Fstatus%2F${tweetId}&partner=&hide_thread=false&lang=${lang}`,
    {
      validateStatus: () => true,
    }
  )
  if (![301, 200].includes(r.status)) {
    return new Response(`remote is ${r.status}`, { status: 500 })
  }
  headers["link"] = `${r.data.url}; rel="canonical"`

  if (process.env.AWS_EXECUTION_ENV) {
    await mkdir("/tmp/fonts", { recursive: true }).catch(console.error)
    await writeFile(
      "/tmp/fonts/fonts.conf",
      `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/var/task/fonts/</dir>
  <dir>/opt/fonts</dir>
  <dir>${cwd()}/public/</dir>
  <cachedir>/tmp/fonts-cache/</cachedir>
  <config></config>
</fontconfig>`
    )
  }

  const mime = `image/${mode.replace("jpg", "jpeg")}`

  if (imageCacheUrl && imageCacheUA) {
    const ua = request.headers.get("user-agent")
    if (!ua || !ua.includes(imageCacheUA)) {
      const qs = querystring.stringify(
        Object.fromEntries(
          Object.entries({
            hideCard,
            hideThread,
            scale,
            lang,
            theme,
            tz: tz.offset,
            t2iSkipSensitiveWarning,
          }).filter(([k]) => requestUrl.searchParams.has(k))
        )
      )
      const cacheUrl = url.resolve(
        imageCacheUrl,
        `${tweetId}.${mode}${0 < qs.length ? `?${qs}` : ""}`
      )
      try {
        const s = new PassThrough()
        const r = nodeRequest(cacheUrl)
        r.pipe(s, { end: true })
        let isReceived = false
        await new Promise<void>((res) => {
          r.on("data", () => {
            isReceived = true
            res()
          })
          setTimeout(() => res(), 500)
        })
        if (isReceived) {
          if (r.response?.statusCode === 200) {
            return new Response(s as any, {
              headers: {
                ...headers,
                "content-type": mime,
                "cache-control":
                  "public, max-age=31536000, stale-while-revalidate",
              },
            })
          } else {
            console.warn(`cache status_code: ${r.response?.statusCode}`)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const tzString = tz?.utc.pop()

  console.info("Starting puppeteer...")
  let browser: Browser
  if (process.env.AWS_EXECUTION_ENV) {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        ...chromium.defaultViewport,
        deviceScaleFactor: scale,
        width: 1280,
        height: 1280,
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      env: {
        ...process.env,
        FONTCONFIG_PATH: "/tmp/fonts",
        TZ: tzString ? tzString : "Asia/Tokyo",
      },
    })
  } else {
    console.info("Using default puppeteer")
    const p: typeof puppeteer = require("puppeteer")
    browser = await p.launch({
      defaultViewport: {
        deviceScaleFactor: scale,
        width: 1280,
        height: 1280,
      },
      headless: false,
      env: {
        ...process.env,
        TZ: tzString ? tzString : "Asia/Tokyo",
      },
    })
  }

  console.info("Captureing page...")
  try {
    const pages = await browser.pages()
    const page = 0 < pages.length ? pages[0] : await browser.newPage()
    if (t2iSkipSensitiveWarning) {
      await page.setRequestInterception(true)
      page.on("request", async (req) => {
        let url = req.url()
        if (url.startsWith("https://cdn.syndication.twimg.com/tweet-result")) {
          const r = await axios.get(url, {
            headers: { "user-agent": "Twitterbot/1.0" },
            validateStatus: () => true,
          })
          if (r.status !== 200) {
            console.warn(
              "syndication status is not 200:",
              url,
              r.status,
              r.data
            )
          }
          req.respond({
            status: r.status,
            contentType: r.headers?.["content-type"],
            body:
              r.status === 200
                ? JSON.stringify({ ...r.data, possibly_sensitive: false })
                : r.data,
          })
        } else {
          await req.continue()
        }
      })
    }
    await page.evaluateOnNewDocument(() => {
      const timeout = setTimeout
      // @ts-ignore
      window.setTimeout = function (fn: Function, ms?: number) {
        const s = fn.toString()
        if (s.includes("timeout") || s.includes("native code")) return
        timeout(() => fn(), 0)
      }
    })
    const params = {
      dnt: "false",
      embedId: "twitter-widget-0",
      frame: "false",
      hideCard: hideCard.toString(),
      hideThread: hideThread.toString(),
      id: tweetId,
      lang,
      origin: "file:///Users/ci7lus/tweet2image.html",
      theme,
      widgetsVersion: "a3525f077c700:1667415560940",
    }
    await Promise.allSettled([
      page.goto(
        `https://platform.twitter.com/embed/Tweet.html?${querystring.stringify(
          params
        )}`
      ),
      page.waitForNavigation({ waitUntil: ["networkidle0"] }),
      page.waitForSelector("article", { timeout: 1000 }),
    ])
    const rect = await page.evaluate(() => {
      const clientRect = document
        .querySelector("article")
        ?.getBoundingClientRect()
      if (!clientRect) {
        return
      }
      const { x, y, width, height } = clientRect
      return {
        x: x - 1,
        y: y - 1,
        width: Math.round(width + 2),
        height: Math.round(height + 2),
      }
    })
    if (!rect) {
      return new Response(`tweet widget is unavailable.`, { status: 500 })
    }
    await page.setViewport({
      ...chromium.defaultViewport,
      deviceScaleFactor: scale,
      height: rect.height,
      width: rect.width,
    })
    const buffer = await page.screenshot({
      clip: rect,
      type: mode === "png" ? "png" : "jpeg",
      omitBackground: mode === "png",
    })
    return new Response(buffer, {
      headers: {
        ...headers,
        "content-type": mime,
        "cache-control": "max-age=600, public, stale-while-revalidate",
      },
    })
  } catch (error) {
    console.error(error)
    return new Response("500", { status: 500 })
  } finally {
    await browser.close()
  }
}
