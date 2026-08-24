import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn("w-full px-4 py-2.5 rounded-lg text-white focus:outline-none transition-all", className)}
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: error ? '1px solid rgb(239,68,68)' : '1px solid rgba(255,255,255,0.1)',
            ...style
          }}
          {...props}
        />
        {error && <p className="text-xs" style={{ color: 'rgb(248,113,113)' }}>{error}</p>}
      </div>
    )
  }
)

Input.displayName = "Input"
export default Input