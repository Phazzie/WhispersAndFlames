import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16.5 6.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
      <path d="M12 11c-2.9 0-5.5.8-7.5 2.5s-2.5 4-2.5 6h20c0-2-.5-4.2-2.5-6S14.9 11 12 11Z" />
      <path d="M12 11a10 10 0 0 1 7.5 2.5" />
      <path d="M12 11a10 10 0 0 0-7.5 2.5" />
    </svg>
  );
}
