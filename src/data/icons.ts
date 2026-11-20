// Simplified language and tool marks, inlined so the site needs no icon
// library. Each is the inside of a 24 by 24 SVG and uses currentColor, so it
// takes whatever colour the text around it has. A toolkit row picks one by
// name with `icon`.

export const icons: Record<string, string> = {
  python:
    "<path d=\"M11.9 2.2c-2.6 0-4.4.8-4.4 2.9v2.3h4.6v.7H5.7C3.5 8.1 2.3 9.6 2.3 12s1.2 3.9 3.4 3.9h1.6v-2.8c0-2.2 1.8-4 4-4h3.9c1.4 0 2.6-1.2 2.6-2.6V5.1c0-1.9-1.8-2.9-4.3-2.9h-1.6Zm-2.3 1.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z\"/><path d=\"M12.1 21.8c2.6 0 4.4-.8 4.4-2.9v-2.3h-4.6v-.7h6.4c2.2 0 3.4-1.5 3.4-3.9s-1.2-3.9-3.4-3.9h-1.6v2.8c0 2.2-1.8 4-4 4H8.8c-1.4 0-2.6 1.2-2.6 2.6v2.4c0 1.9 1.8 2.9 4.3 2.9h1.6Zm2.3-1.6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z\"/>",
  java:
    "<path d=\"M6.8 12.6h10v3.7a3.2 3.2 0 0 1-3.2 3.2h-3.6a3.2 3.2 0 0 1-3.2-3.2v-3.7Z\"/><path d=\"M17.3 13.5h1a1.9 1.9 0 0 1 0 3.8h-1v-1.4h.9a.5.5 0 0 0 0-1h-.9v-1.4Z\"/><rect x=\"5.6\" y=\"20.4\" width=\"12.4\" height=\"1.5\" rx=\"0.7\"/><path d=\"M10.2 2.8c-1.9 1.6-.4 2.7.2 3.5.7.9.6 1.7-.6 2.8 1.9-.9 3.2-2.1 2.4-3.4-.5-.8-1.7-1.4-2-2.9Z\"/><path d=\"M13.6 5.5c-1.3 1.1-.3 1.9.1 2.5.5.7.4 1.3-.4 2 1.4-.6 2.3-1.5 1.7-2.4-.3-.6-1.2-1-1.4-2.1Z\"/>",
  cpp:
    "<path d=\"M12 2.3 20.8 7.4v9.2L12 21.7 3.2 16.6V7.4L12 2.3Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><text x=\"12\" y=\"14.9\" text-anchor=\"middle\" font-size=\"7\" font-weight=\"700\">C++</text>",
  c:
    "<path d=\"M12 2.3 20.8 7.4v9.2L12 21.7 3.2 16.6V7.4L12 2.3Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><text x=\"12\" y=\"15.4\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"700\">C</text>",
  sql:
    "<ellipse cx=\"12\" cy=\"6\" rx=\"7.6\" ry=\"3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M4.4 6v12c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3V6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M4.4 12c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/>",
  php:
    "<ellipse cx=\"12\" cy=\"12\" rx=\"10.6\" ry=\"6.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><text x=\"12\" y=\"14.6\" text-anchor=\"middle\" font-size=\"7\" font-weight=\"700\">php</text>",
  html:
    "<path d=\"M4.2 2.6h15.6l-1.4 16.2L12 21.4l-6.4-2.6L4.2 2.6Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><text x=\"12\" y=\"14.6\" text-anchor=\"middle\" font-size=\"7\" font-weight=\"700\">&lt;/&gt;</text>",
  css:
    "<path d=\"M4.2 2.6h15.6l-1.4 16.2L12 21.4l-6.4-2.6L4.2 2.6Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><text x=\"12\" y=\"14.9\" text-anchor=\"middle\" font-size=\"8\" font-weight=\"700\">{ }</text>",
  ada:
    "<rect x=\"2.6\" y=\"2.6\" width=\"18.8\" height=\"18.8\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><text x=\"12\" y=\"15.2\" text-anchor=\"middle\" font-size=\"7\" font-weight=\"700\">Ada</text>",
  js:
    "<rect x=\"2.6\" y=\"2.6\" width=\"18.8\" height=\"18.8\" rx=\"2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><text x=\"14.6\" y=\"18.2\" text-anchor=\"middle\" font-size=\"8\" font-weight=\"700\">JS</text>",
  docker:
    "<path d=\"M1.5 12.2h15.2c1 0 1.8-.3 2.3-.8-.6-1.2-.5-2.6.5-3.9 1.1.7 1.7 1.7 1.8 2.8.9-.2 1.7 0 2.2.4-.4 1.3-1.5 2-3 2-1.6 4.6-5.2 7.3-10.6 7.3C5.2 20 1.8 17.6 1.5 12.2Z\"/><rect x=\"3\" y=\"8.8\" width=\"2.8\" height=\"2.8\"/><rect x=\"6.4\" y=\"8.8\" width=\"2.8\" height=\"2.8\"/><rect x=\"9.8\" y=\"8.8\" width=\"2.8\" height=\"2.8\"/><rect x=\"13.2\" y=\"8.8\" width=\"2.8\" height=\"2.8\"/><rect x=\"6.4\" y=\"5.4\" width=\"2.8\" height=\"2.8\"/><rect x=\"9.8\" y=\"5.4\" width=\"2.8\" height=\"2.8\"/><rect x=\"13.2\" y=\"5.4\" width=\"2.8\" height=\"2.8\"/><rect x=\"9.8\" y=\"2\" width=\"2.8\" height=\"2.8\"/>",
  svm:
    "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\"><path d=\"M4 20 20 4\" stroke-width=\"1.7\"/><path d=\"M3 15.6 15.6 3M8.4 21 21 8.4\" stroke-width=\"1.1\" stroke-dasharray=\"2 2.2\"/><g stroke-width=\"1.2\"><circle cx=\"19.6\" cy=\"19.2\" r=\"1.4\"/><circle cx=\"20.4\" cy=\"13.8\" r=\"1.4\"/><circle cx=\"14.4\" cy=\"20.4\" r=\"1.4\"/></g></g><circle cx=\"4.6\" cy=\"4.8\" r=\"1.3\"/><circle cx=\"9.4\" cy=\"3.4\" r=\"1.3\"/><circle cx=\"3.6\" cy=\"10.2\" r=\"1.3\"/>",
};
