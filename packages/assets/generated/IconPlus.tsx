import type { SVGProps } from 'react';
const IconPlus = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={19.133}
    height={19.133}
    fill="none"
    overflow="visible"
    preserveAspectRatio="none"
    style={{
      display: 'block',
    }}
    viewBox="0 0 19.133 19.133"
    color="var(--icon-default-color, black)"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2.333}
      d="M9.567 1.167v16.8m8.4-8.4h-16.8"
    />
  </svg>
);
export default IconPlus;
