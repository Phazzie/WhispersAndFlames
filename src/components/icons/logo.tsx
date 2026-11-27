import type { SVGProps } from 'react';

/** A wax seal with a flame pressed into it. */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" {...props}>
      <title>Whispers and Flames</title>
      <path
        d="M24 3c3 2 5 0 8 2s3 5 6 6 4 4 4 7-2 5-1 8 2 6 0 8-5 2-6 5-3 5-6 6-5-1-8 0-5 3-8 1-3-5-6-6-5-2-6-5 1-6 0-8-3-5-2-8 4-4 6-6 3-6 6-7 4 1 7-1 4-3 7-2z"
        fill="hsl(3 68% 36%)"
      />
      <circle cx="24" cy="24" r="13" fill="none" stroke="hsl(3 70% 26%)" strokeWidth="1.5" />
      <path
        d="M24 14c1.2 3.6 5 5.4 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.8.3 1.6 1 2.6 2 3.2-.6-3.4.2-6 .6-8.4z"
        fill="hsl(40 70% 72%)"
      />
    </svg>
  );
}
