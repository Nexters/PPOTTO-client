import type { SVGProps } from 'react';
const IconSettings = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    overflow="visible"
    preserveAspectRatio="none"
    style={{
      display: 'block',
    }}
    viewBox="0 0 24 24"
    color="var(--icon-default-color, white)"
    {...props}
  >
    <path
      fill="currentColor"
      d="M9.777 2.248a10 10 0 0 1 4.445.001 1 1 0 0 1 .777.976L15 5.072a1 1 0 0 0 1.5.866l1.602-.925.155-.072a1 1 0 0 1 1.077.258 10.04 10.04 0 0 1 2.222 3.848c.138.446-.05.929-.454 1.162l-1.602.925a1 1 0 0 0 0 1.732l1.599.923a1 1 0 0 1 .456 1.16 10 10 0 0 1-2.221 3.852 1 1 0 0 1-1.232.186l-1.602-.925a1 1 0 0 0-1.5.866l-.001 1.85a1 1 0 0 1-.776.974 10 10 0 0 1-4.446-.003A1 1 0 0 1 9 20.775v-1.847a1 1 0 0 0-1.5-.865l-1.602.924a1 1 0 0 1-1.233-.188 10 10 0 0 1-2.222-3.848 1 1 0 0 1 .455-1.16l1.601-.925a1 1 0 0 0 0-1.732L2.9 10.21a1 1 0 0 1-.455-1.16A10 10 0 0 1 4.666 5.2l.127-.117a1 1 0 0 1 1.104-.07l1.603.925A1 1 0 0 0 9 5.072v-1.85l.014-.171a1 1 0 0 1 .763-.803M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
    />
  </svg>
);
export default IconSettings;
