import type { SVGProps } from 'react';
const Share = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={17}
    fill="none"
    viewBox="0 0 16 17"
    color="var(--icon-default-color, white)"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M1 11.17v3.074c0 .466.184.912.513 1.242.328.329.773.514 1.237.514h10.5c.464 0 .91-.185 1.237-.514A1.76 1.76 0 0 0 15 14.244V11.17m-6.964-.218V1m4 3.803L8.036 1l-4 3.803"
    />
  </svg>
);
export default Share;
