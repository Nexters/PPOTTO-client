import type { SVGProps } from 'react';
const ChevronLeft = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={10}
    height={17}
    fill="none"
    viewBox="0 0 10 17"
    color="var(--icon-default-color, white)"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.5 16 1 8.5 8.5 1"
    />
  </svg>
);
export default ChevronLeft;
