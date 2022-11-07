import React from "react"
import { ImageFormat, Theme } from "../../types"

export type FormState = Readonly<{
  url: string
  imageFormat: ImageFormat
  theme: Theme
  scale: number
  lang: string
  timezone: number
  hideCard: boolean
  hideThread: boolean
  t2iSkipSensitiveWarning: boolean
}>
export type FormActions = {
  [K in keyof FormState]: Readonly<{
    type: "updated"
    key: K
    value: FormState[K]
  }>
}[keyof FormState]
export type FormDispatch = React.Dispatch<FormActions>
