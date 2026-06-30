"use client"

import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("[font-family:var(--font-mono-stack)] tabular-nums disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center rounded-[var(--radius-md)] has-aria-invalid:border-[var(--missed-600)] has-aria-invalid:ring-3 has-aria-invalid:ring-[rgba(216,58,63,0.2)]",
        className
      )}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex size-[42px] items-center justify-center border-y-[1.5px] border-r-[1.5px] border-[var(--paper-300)] bg-[var(--paper-0)] text-[var(--text-md)] font-semibold text-[var(--ink-900)] transition-[border-color,box-shadow,background-color,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] outline-none first:rounded-l-[var(--radius-md)] first:border-l-[1.5px] last:rounded-r-[var(--radius-md)] aria-invalid:border-[var(--missed-600)] data-[active=true]:z-10 data-[active=true]:border-[var(--signal-500)] data-[active=true]:ring-3 data-[active=true]:ring-[rgba(62,99,255,0.28)] data-[active=true]:aria-invalid:border-[var(--missed-600)] data-[active=true]:aria-invalid:ring-[rgba(216,58,63,0.2)]",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-[var(--ink-900)] duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center text-[var(--ink-500)] [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <Minus />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
