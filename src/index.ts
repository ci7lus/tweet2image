import Koa from "koa"
import chromium from "chrome-aws-lambda"
import Router from "koa-router"
import axios from "axios"

const port = process.env.PORT || "5000"

const main = async () => {
  const app = new Koa()

  if (process.env.NODE_ENV !== "production") {
    const Parcel = require("parcel-bundler")
    const bundler = new Parcel("./src/frontend/index.html", {
      outDir: "./public",
    })
    await bundler.bundle()

    const KoaStaticServer = require("koa-static-server")
    app.use(
      KoaStaticServer({
        rootDir: "./public",
        last: false,
      })
    )
  }

  const router = new Router()

  router.use(async (ctx, next) => {
    if (ctx.request.headers["origin"] != null) {
      ctx.set("Access-Control-Allow-Origin", "*")
    }

    await next()
  })

  router.options("(.*)", async (ctx) => {
    ctx.status = 204
  })

  router.get(/(\d+)\.(png|jpg)/, async (ctx) => {
    const tweetId = ctx.params[0]
    const mode = ctx.params[1].replace("jpg", "jpeg")
    if (!["png", "jpeg"].includes(mode)) return ctx.throw(400)
    const parsedTweetId = parseInt(tweetId)
    if (Number.isNaN(parsedTweetId)) return ctx.throw(400)
    const r = await axios.head(
      `https://twitter.com/twitter/status/${tweetId}`,
      {
        headers: {
          "user-agent": "card-bot",
        },
        validateStatus: () => true,
      }
    )
    if (![301, 200].includes(r.status)) return ctx.throw(r.status)
    await chromium.font(
      "https://rawcdn.githack.com/googlefonts/noto-cjk/be6c059ac1587e556e2412b27f5155c8eb3ddbe6/NotoSansCJKjp-Regular.otf"
    )
    await chromium.font(
      "https://rawcdn.githack.com/googlefonts/noto-fonts/ea9154f9a0947972baa772bc6744f1ec50007575/hinted/NotoSans/NotoSans-Regular.ttf"
    )
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        ...chromium.defaultViewport,
        deviceScaleFactor: 2,
      },
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    })

    try {
      const pages = await browser.pages()
      const page = 0 < pages.length ? pages[0] : await browser.newPage()
      await Promise.all([
        page.goto(
          `https://platform.twitter.com/embed/index.html?hideCard=false&hideThread=false&widgetsVersion=9066bb2%3A1593540614199&lang=en&theme=light&id=${tweetId}`
        ),
        page.waitForNavigation({ waitUntil: ["load", "networkidle2"] }),
      ])
      const rect = await page.evaluate(() => {
        const { x, y, width, height } = document
          .querySelector("#app > div > div")
          ?.getBoundingClientRect()!
        return {
          x: x - 1,
          y: y - 1,
          width: width + 2,
          height: height + 2,
        }
      })
      const buffer = await page.screenshot({
        clip: rect,
        type: mode,
      })
      ctx.set("Cache-Control", "s-maxage=600, stale-while-revalidate")
      ctx.type = `image/${mode}`
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
