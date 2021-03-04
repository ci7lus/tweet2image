import React, { useMemo } from "react"
import timezones from "timezones.json"
import languages from "../../../languages.json"
import { FormState, FormActions } from "./types"

export const updatedAction = <K extends keyof FormState>(
  key: K,
  value: FormState[K]
): FormActions =>
  ({
    type: "updated",
    key,
    value,
  } as any) // わからずや

export const formReducer: React.Reducer<FormState, FormActions> = (
  state,
  action
) => {
  switch (action.type) {
    case "updated":
      return {
        ...state,
        [action.key]: action.value,
      }
    default:
      const _exhaustiveCheck: never = action.type
      throw new Error("unreachable")
  }
}

const isInCandidates = <T>(
  candidates: readonly T[],
  value: unknown
): value is T => candidates.includes(value as any)

export const useInitialFormState = () => {
  const initialState = useMemo(() => {
    const parsed = new URLSearchParams(location.hash.slice(1))
    const sanitizeWithInCandidates = <T>(
      candidates: readonly T[],
      value: unknown
    ): T | null => {
      if (value == null) return null
      if (!isInCandidates(candidates, value)) return null
      return value
    }
    const sanitizeNumber = (value: string | null) => {
      if (value == null) return null
      const scale = Number.parseInt(value, 10)
      if (Number.isNaN(scale)) return null
      return scale
    }

    let initialScale: number
    try {
      initialScale = Math.ceil(window.devicePixelRatio)
    } catch {
      initialScale = 2
    }

    let initialTimezone: number
    try {
      initialTimezone = Math.round(
        Math.abs(new Date().getTimezoneOffset()) / 60
      )
    } catch {
      initialTimezone = 9
    }

    const initialState: FormState = {
      url: parsed.get("url") ?? "",
      imageFormat:
        sanitizeWithInCandidates(["jpg", "png"], parsed.get("format")) ?? "jpg",
      theme:
        sanitizeWithInCandidates(["light", "dark"], parsed.get("theme")) ??
        "light",
      lang:
        sanitizeWithInCandidates(
          languages.map((l) => l.code),
          parsed.get("lang")
        ) ?? "ja",
      timezone:
        sanitizeWithInCandidates(
          timezones.map((t) => t.offset),
          sanitizeNumber(parsed.get("tz"))
        ) ?? initialTimezone,
      scale: sanitizeNumber(parsed.get("scale")) ?? initialScale,
    }

    return initialState
  }, [])
  return initialState
}
