import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
        <path d="M14.5 4.1C13.6 3.5 12.8 3 12 3s-1.6.5-2.5 1.1c-1.3 1-2.5 2.8-2.5 4.9C7 11.1 12 15 12 15s5-3.9 5-7c0-2.1-1.2-3.9-2.5-4.9z" />
        <path d="M12 15c-3 0-5.5 1.1-7.5 3S2 22 2 22h20c0 0-1.5-3.1-3.5-5s-4.5-3-7.5-3z" />
    </svg>
  );
}
