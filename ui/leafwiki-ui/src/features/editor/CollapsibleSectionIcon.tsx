import { SVGProps } from 'react'

export function CollapsibleSectionIcon({
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
      <path d="M4 2.5 10 6 4 9.5" />
      <path d="M13.5 4h6.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-5" />
      <path d="M10 10.5h9" />
      <path d="M10 13.5h7" />
    </svg>
  )
}
