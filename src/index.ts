import Koa from "koa"
import chromium from "chrome-aws-lambda"
import Router from "koa-router"
import axios from "axios"
import querystring from "querystring"
import timezones from "timezones.json"
import url from "url"
import request from "request"
import { PassThrough } from "stream"

const port = process.env.PORT || "5000"
const imageCacheUrl = process.env.IMAGE_CACHE_URL
const imageCacheUA = process.env.IMAGE_CACHE_UA

const main = async () => {
  const app = new Koa()

  const router = new Router()

  router.use(async (ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", "*")

    await next()
  })

  router.options("(.*)", async (ctx) => {
    ctx.status = 204
  })

  router.get(/(\d+)\.(png|jpg)/, async (ctx) => {
    const lang = ctx.query.lang || "ja"
    if (!lang.match(/^[a-z-]{2,5}$/)) return ctx.throw(400, "lang")
    const tz = timezones.find((t) => t.offset === parseInt(ctx.query.tz || "9"))
    if (!tz) return ctx.throw(400, "tz")
    const theme = ctx.query.theme || "light"
    if (!theme.match(/^[a-z]+$/)) return ctx.throw(400, "theme")
    const scale = parseFloat(ctx.query.scale || "2")
    if (Number.isNaN(scale) || scale < 1 || 5 < scale)
      return ctx.throw(400, "scale")
    if (scale !== 1) {
      ctx.set("content-dpr", scale.toFixed(1))
    }
    const hideCard =
      parseInt(ctx.query.hideCard || "0") === 1 || ctx.query.hideCard === "true"
    const hideThread =
      parseInt(ctx.query.hideThread || "0") === 1 ||
      ctx.query.hideThread === "true"
    const tweetId = ctx.params[0]
    const mode = ctx.params[1]
    if (!["png", "jpg"].includes(mode)) return ctx.throw(400, "mode")
    const parsedTweetId = parseInt(tweetId)
    if (Number.isNaN(parsedTweetId)) return ctx.throw(400, "number")
    const r = await axios.get<{
      id_str?: string
      user?: { screen_name?: string }
    }>(`https://cdn.syndication.twimg.com/tweet?id=${tweetId}`, {
      validateStatus: () => true,
    })
    if (![301, 200].includes(r.status)) return ctx.throw(r.status)
    const { user, id_str } = r.data
    if (user?.screen_name && id_str) {
      ctx.set(
        "link",
        `<https://twitter.com/${user.screen_name}/status/${id_str}>; rel="canonical"`
      )
    }
    // CJK統合漢字 CJK Unified Ideographs
    // 日本語が描画可能に
    await chromium.font(
      "https://rawcdn.githack.com/googlefonts/noto-cjk/165c01b46ea533872e002e0785ff17e44f6d97d8/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf"
    )
    // 数学用英数字記号 Mathematical Alphanumeric Symbols
    // 𝒜𝓃𝓃𝒶ℳℴ𝒸𝒽𝒾𝓏 などが描画可能に
    await chromium.font(
      "https://rawcdn.githack.com/googlefonts/noto-fonts/736e6b8f886cae4664e78edb0880fbb5af7d50b7/hinted/ttf/NotoSansMath/NotoSansMath-Regular.ttf"
    )
    // 基本ラテン文字 Basic Latin
    // 下付き文字などが描画可能に
    await chromium.font(
      "https://rawcdn.githack.com/googlefonts/noto-fonts/7697007fcb3563290d73f41f56a70d5d559d828c/hinted/ttf/NotoSans/NotoSans-Regular.ttf"
    )
    const mime = `image/${mode.replace("jpg", "jpeg")}`

    if (imageCacheUrl && imageCacheUA) {
      const ua = ctx.request.headers["user-agent"]
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
            }).filter(([k, v]) => k in ctx.query)
          )
        )
        const cacheUrl = url.resolve(
          imageCacheUrl,
          `${tweetId}.${mode}${0 < qs.length ? `?${qs}` : ""}`
        )
        try {
          const s = new PassThrough()
          const r = request(cacheUrl)
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
              ctx.set(
                "Cache-Control",
                "max-age=2592000, public, stale-while-revalidate"
              )
              ctx.type = mime
              ctx.body = s
              console.log(`Cache hit: ${cacheUrl}`)
              return
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

    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        ...chromium.defaultViewport,
        deviceScaleFactor: scale,
        width: 1280,
        height: 1280,
      },
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      env: {
        ...process.env,
        TZ: tzString ? tzString : "Asia/Tokyo",
      },
    })

    try {
      const pages = await browser.pages()
      const page = 0 < pages.length ? pages[0] : await browser.newPage()
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
        widgetsVersion: "9066bb2:1593540614199",
        origin: "file:///Users/ci7lus/tweet2image.html",
        embedId: "twitter-widget-0",
        hideCard: hideCard.toString(),
        hideThread: hideThread.toString(),
        lang,
        theme,
        id: tweetId,
      }
      await Promise.all([
        page.goto(
          `https://platform.twitter.com/embed/index.html?${querystring.stringify(
            params
          )}`
        ),
        page.waitForNavigation({ waitUntil: ["networkidle0"] }),
      ])
      const rect = await page.evaluate(() => {
        const { x, y, width, height } = document
          .querySelector("article")
          ?.getBoundingClientRect()!
        return {
          x: x - 1,
          y: y - 1,
          width: Math.round(width + 2),
          height: Math.round(height + 2),
        }
      })
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
      ctx.set("Cache-Control", "max-age=600, public, stale-while-revalidate")
      ctx.type = mime
      ctx.body = buffer
    } catch (error) {
      console.error(error)
      return ctx.throw(500)
    } finally {
      await browser.close()
    }
  })

  app.use(router.routes())
  app.listen(port, () => {
    console.log(`live on http://localhost:${port}`)
  })
}

main()
