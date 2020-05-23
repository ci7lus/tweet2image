import React from "react"

export const embedTweet = ({ tweetId }: { tweetId: string }) => {
  return (
    <html>
      <head>
        <script async src="https://platform.twitter.com/widgets.js"></script>
      </head>
      <body>
        <div style={{ padding: "1rem" }}>
          <blockquote className="twitter-tweet">
            <p lang="ja" dir="ltr"></p>
            <a href={`https://twitter.com/twitter/status/${tweetId}`}></a>
          </blockquote>
        </div>
      </body>
    </html>
  )
}
