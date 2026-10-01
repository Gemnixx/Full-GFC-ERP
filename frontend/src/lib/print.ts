export const printNode = (html: string) => {
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return;
  w.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
};

export const printElement = (el: HTMLElement | null) => {
  if (!el) return;
  printNode(el.outerHTML);
};