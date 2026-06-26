'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

/**
 * A sanitize schema that keeps KaTeX's generated HTML/MathML while still
 * stripping dangerous tags/attributes (script, iframe, on* handlers, etc.).
 *
 * Pipeline order matters: we run rehype-katex FIRST (to turn $...$ into HTML),
 * THEN rehype-sanitize over the whole tree. react-markdown also does NOT render
 * raw HTML by default (we don't include rehype-raw), so user-supplied HTML in
 * the markdown is treated as text — that is our primary XSS protection, and the
 * sanitizer is a second safety layer.
 */
const mathSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'span',
    'div',
    'svg',
    'path',
    'line',
    'g',
    'rect',
    'math',
    'semantics',
    'annotation',
    'mrow',
    'mi',
    'mo',
    'mn',
    'ms',
    'mtext',
    'mspace',
    'msup',
    'msub',
    'msubsup',
    'mfrac',
    'msqrt',
    'mroot',
    'mstyle',
    'munder',
    'mover',
    'munderover',
    'mtable',
    'mtr',
    'mtd',
    'mlabeledtr',
    'menclose',
    'mpadded',
    'mphantom',
    'mglyph',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...((defaultSchema.attributes && defaultSchema.attributes['*']) || []),
      'className',
      'style',
      'ariaHidden',
      'ariaLabel',
    ],
    span: ['className', 'style'],
    div: ['className', 'style'],
    svg: ['xmlns', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'className', 'style'],
    path: ['d', 'className', 'style'],
    line: ['x1', 'x2', 'y1', 'y2', 'className', 'style'],
    rect: ['x', 'y', 'width', 'height', 'className', 'style'],
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  // Only allow safe URL protocols for links and images.
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https'],
    href: ['http', 'https', 'mailto'],
  },
};

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownMathRenderer({ content, className }: Props) {
  return (
    <div className={cn('prose-soma', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeSanitize, mathSchema]]}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
