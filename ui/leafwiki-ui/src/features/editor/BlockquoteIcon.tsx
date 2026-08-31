import { SVGProps } from 'react'

export function BlockquoteIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 5H8" />
      <path d="M21 12H8" />
      <path d="M21 19H8" />
      <path d="M3 5v14" />
    </svg>
  )
}
