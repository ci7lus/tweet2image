import React, { useCallback, useState } from "react"
import clsx from "clsx"
import Select, { StylesConfig } from "react-select"
import timezones from "timezones.json"
import languages from "../../../languages.json"
import { ImageFormat, Theme } from "../types"
import { FormState, FormDispatch } from "./types"
import { updatedAction } from "./useForm"

const FormLabel: React.FC<JSX.IntrinsicElements["label"]> = ({
  children,
  className,
  ...props
}) => (
  <label
    className={clsx(className, "block text-gray-700 text-sm font-bold")}
    {...props}
  >
    {children}
  </label>
)

const FormInput: React.FC<JSX.IntrinsicElements["input"]> = ({
  children,
  className,
  ...props
}) => (
  <input
    className={clsx(
      className,
      "appearance-none w-full border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500",
      props.disabled ? "bg-gray-200 text-gray-400" : "bg-gray-100 text-gray-700"
    )}
    {...props}
  >
    {children}
  </input>
)

const extend = <T,>() => <S extends T>(value: S) => value
type FormSelectProps<K extends keyof FormState> = Readonly<{
  id?: string
  options: ReadonlyArray<{ value: FormState[K]; label: string }>
  formKey: K
  state: FormState
  dispatch: FormDispatch
  disabled?: boolean
}>
// StylesConfig<{}, false>だとSelectのOptionTypeが{}になってしまって困る
const formSelectStyle = extend<StylesConfig<{}, false>>()({
  control: (previous) => ({
    ...previous,
    height: 46,
    backgroundColor: "#f7fafc",
    borderColor: "#edf2f7",
  }),
})
const FormSelect = <K extends keyof FormState>({
  id,
  options,
  formKey,
  state,
  dispatch,
  disabled,
}: FormSelectProps<K>): React.ReactElement => {
  const handleChange = useCallback(
    ({ value }: { value: FormState[K] }) => {
      dispatch(updatedAction(formKey, value))
    },
    [dispatch, formKey]
  )

  return (
    <Select
      id={id}
      options={options}
      styles={formSelectStyle}
      value={options.find((o) => o.value === state[formKey])}
      onChange={handleChange}
      isDisabled={disabled}
    />
  )
}

const TWEET_URL_INPUT_ID = "tweet-url-input"
type TweetUrlInputProps = Readonly<{
  state: FormState
  disabled: boolean
  dispatch: FormDispatch
  onEditingStateChange: (editing: boolean) => void
}>
const TweetUrlInput: React.VFC<TweetUrlInputProps> = ({
  state,
  disabled,
  dispatch,
  onEditingStateChange,
}) => {
  const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      dispatch(updatedAction("url", e.target.value))
    },
    [dispatch]
  )
  const handleFocus = useCallback(() => {
    onEditingStateChange?.(true)
  }, [onEditingStateChange])
  const handleBlur = useCallback(() => {
    onEditingStateChange?.(false)
  }, [onEditingStateChange])

  return (
    <div>
      <FormLabel htmlFor={TWEET_URL_INPUT_ID}>Tweet Url</FormLabel>
      <div className="relative mt-2">
        <FormInput
          id={TWEET_URL_INPUT_ID}
          type="text"
          placeholder="https://twitter.com/jack/status/20 or 20"
          value={state["url"]}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          pattern=".*(\d+).*"
        />
      </div>
    </div>
  )
}

type ImageFormatSelectProps = Readonly<{
  state: FormState
  disabled: boolean
  dispatch: FormDispatch
}>
const imageFormatSelectOptions: ReadonlyArray<{
  value: ImageFormat
  label: string
}> = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
]
const IMAGE_FORMAT_SELECT_ID = "image-format-select"
const ImageFormatSelect: React.VFC<ImageFormatSelectProps> = ({
  state,
  disabled,
  dispatch,
}) => (
  <div>
    <FormLabel htmlFor={IMAGE_FORMAT_SELECT_ID}>Format</FormLabel>
    <div className="relative mt-2">
      <FormSelect
        id={IMAGE_FORMAT_SELECT_ID}
        options={imageFormatSelectOptions}
        formKey="imageFormat"
        state={state}
        dispatch={dispatch}
        disabled={disabled}
      />
    </div>
  </div>
)

type ThemeSelectProps = Readonly<{
  state: FormState
  disabled: boolean
  dispatch: FormDispatch
}>
const themeSelectOptions: ReadonlyArray<{
  value: Theme
  label: string
}> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]
const THEME_FORMAT_SELECT_ID = "theme-format-select"
const ThemeSelect: React.VFC<ThemeSelectProps> = ({
  state,
  disabled,
  dispatch,
}) => (
  <div>
    <FormLabel htmlFor={THEME_FORMAT_SELECT_ID}>Theme</FormLabel>
    <div className="relative mt-2">
      <FormSelect
        id={THEME_FORMAT_SELECT_ID}
        options={themeSelectOptions}
        formKey="theme"
        dispatch={dispatch}
        state={state}
        disabled={disabled}
      />
    </div>
  </div>
)

type ScaleInputProps = Readonly<{
  state: FormState
  disabled: boolean
  dispatch: FormDispatch
  onEditingStateChange?: (editing: boolean) => void
}>
const SCALE_INPUT_ID = "scale-input"
const ScaleInput: React.VFC<ScaleInputProps> = ({
  state,
  disabled,
  dispatch,
  onEditingStateChange,
}) => {
  const { scale } = state
  const [value, setValue] = useState(`${scale}`)

  const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      setValue(e.target.value)
    },
    []
  )

  const handleFocus = useCallback(() => {
    onEditingStateChange?.(true)
    setValue(`${scale}`)
  }, [onEditingStateChange, scale])
  const handleBlur = useCallback(() => {
    onEditingStateChange?.(false)

    const s = Number.parseInt(value, 10)
    console.log(s)
    if (Number.isNaN(s)) {
      setValue(`${scale}`)
      return
    }
    dispatch(updatedAction("scale", s))
  }, [onEditingStateChange, value, scale])

  return (
    <div>
      <FormLabel htmlFor={SCALE_INPUT_ID}>Scale</FormLabel>
      <div className="relative mt-2">
        <FormInput
          id={SCALE_INPUT_ID}
          type="number"
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min={1}
          max={5}
        />
      </div>
    </div>
  )
}

type LangSelectProps = Readonly<{
  state: FormState
  disabled: boolean
  dispatch: FormDispatch
}>
const langSelectOptions = languages.map((l) => ({
  value: l.code,
  label: `${l.local_name} (${l.code})`,
}))
const LANG_SELECT_ID = "lang-select"
const LangSelect: React.VFC<LangSelectProps> = ({
  state,
  disabled,
  dispatch,
}) => (
  <div>
    <FormLabel htmlFor={LANG_SELECT_ID}>Lang</FormLabel>
    <div className="relative mt-2">
      <FormSelect
        id={LANG_SELECT_ID}
        options={langSelectOptions}
        formKey="lang"
        dispatch={dispatch}
        state={state}
        disabled={disabled}
      />
    </div>
  </div>
)

type TimezoneSelectProps = Readonly<{
  state: FormState
  disabled: boolean
  dispatch: FormDispatch
}>
const timezoneSelectOptions = timezones
  .filter((t) => t.isdst === false && 0 < t.utc.length)
  .map((t) => ({ value: t.offset, label: t.text }))
const TIMEZONE_SELECT_ID = "timezone-select"
const TimezoneSelect: React.VFC<TimezoneSelectProps> = ({
  state,
  disabled,
  dispatch,
}) => (
  <div>
    <FormLabel htmlFor={TIMEZONE_SELECT_ID}>Timezone</FormLabel>
    <div className="relative mt-2">
      <FormSelect
        id={TIMEZONE_SELECT_ID}
        options={timezoneSelectOptions}
        formKey="timezone"
        dispatch={dispatch}
        state={state}
        disabled={disabled}
      />
    </div>
  </div>
)

type FormProps = Readonly<{
  state: FormState
  dispatch: FormDispatch
  disabled: boolean
  onEditingStateChange?: (editing: boolean) => void
  onSubmit?: () => void
}>
export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ state, dispatch, disabled, onEditingStateChange, onSubmit }, ref) => {
    const handleSubmit = useCallback<React.FormEventHandler>(
      (e) => {
        e.preventDefault()
        onSubmit?.()
      },
      [onSubmit]
    )

    return (
      <form ref={ref} onSubmit={handleSubmit}>
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-6">
            <TweetUrlInput
              state={state}
              dispatch={dispatch}
              disabled={disabled}
              onEditingStateChange={onEditingStateChange}
            />
          </div>
          <div className="col-span-2">
            <ImageFormatSelect
              state={state}
              dispatch={dispatch}
              disabled={disabled}
            />
          </div>
          <div className="col-span-2">
            <ThemeSelect
              state={state}
              dispatch={dispatch}
              disabled={disabled}
            />
          </div>
          <div className="col-span-2">
            <ScaleInput state={state} dispatch={dispatch} disabled={disabled} />
          </div>
          <div className="col-span-3">
            <LangSelect state={state} dispatch={dispatch} disabled={disabled} />
          </div>
          <div className="col-span-3">
            <TimezoneSelect
              state={state}
              dispatch={dispatch}
              disabled={disabled}
            />
          </div>
        </div>
      </form>
    )
  }
)
