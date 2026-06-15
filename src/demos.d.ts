declare module '*.asm' {
  const src: string;
  export default src;
}

declare module 'asm-dir:*' {
  const items: { id: string; name: string; src: string }[];
  export default items;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.css';
