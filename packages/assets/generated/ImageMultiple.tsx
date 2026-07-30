import type { SVGProps } from 'react';
const ImageMultiple = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={36}
    height={39}
    fill="none"
    viewBox="0 0 36 39"
    color="var(--icon-default-color, white)"
    {...props}
  >
    <g fill="currentColor" filter="url(#icon-ImageMultiple__a)">
      <path d="M24.167 11.39a3.056 3.056 0 0 0-3.056-3.056h-7.222a3.056 3.056 0 0 0-3.056 3.055v7.222a3.056 3.056 0 0 0 3.056 3.056h7.222a3.056 3.056 0 0 0 3.055-3.056z" />
      <path d="M27.5 14.167c0-.912-.444-1.524-1.262-1.979a.833.833 0 1 0-.81 1.457c.332.184.405.285.405.522V22.5a.84.84 0 0 1-.833.834h-8.332a.84.84 0 0 1-.67-.34l-.055-.083a.832.832 0 1 0-1.448.825A2.5 2.5 0 0 0 16.667 25H25c1.377 0 2.5-1.123 2.5-2.5z" />
    </g>
    <defs>
      <filter
        id="icon-ImageMultiple__a"
        width={38.333}
        height={38.333}
        x={0}
        y={0}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset dy={2.5} />
        <feGaussianBlur stdDeviation={5.417} />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_836_671" />
        <feBlend in="SourceGraphic" in2="effect1_dropShadow_836_671" result="shape" />
      </filter>
    </defs>
  </svg>
);
export default ImageMultiple;
